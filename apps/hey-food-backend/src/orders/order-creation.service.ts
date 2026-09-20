import { HttpStatus, Injectable } from "@nestjs/common";
import type { CreateOrderItemInput } from "@hey-food/api-client";
import { Prisma } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { resolveOutletPricing } from "../menu/outlet-pricing";
import { PrismaService } from "../prisma/prisma.service";
import { validateSelectedModifiers } from "../products/modifier-validation";
import { businessDateFor, formatDisplayId } from "./business-date";
import { centsToDecimal, SERVICE_FEE_CENTS, toCents } from "./pricing";
import { orderInclude, type OrderWithItemsRow } from "./order.mapper";

// Abuse guards, enforced here rather than in the api-client schema so the
// contract shared with the Customer App is unchanged. Generous for a real
// food order, small enough that a hostile request can't fan out into
// thousands of rows.
export const MAX_ORDER_LINES = 30;
export const MAX_LINE_QUANTITY = 20;
export const MAX_NOTES_LENGTH = 200;

/** Who an order belongs to: exactly one, mirroring the orders_identity_xor CHECK. */
export type OrderIdentity =
  | { kind: "customer"; customerId: string }
  | { kind: "guest"; guestPhone: string; guestTokenHash: string };

export interface CreateOrderInput {
  outletId: string;
  items: CreateOrderItemInput[];
  identity: OrderIdentity;
  /** Guest replay protection; see Order.idempotencyKey. */
  idempotency?: { key: string; fingerprint: string };
}

/**
 * The single internal path that turns "a customer wants these items from
 * this outlet" into Order + OrderItem + OrderItemModifier rows. Shared by
 * POST /guest/orders today and (when auth lands) POST /orders, so there is
 * exactly one implementation of validation and pricing.
 *
 * Nothing price-related is taken from the caller: product prices come from
 * the outlet-resolved menu, modifier deltas from the option rows, and every
 * total is computed here in integer cents. Any invalid input rejects the
 * whole order — nothing is partially created or silently corrected.
 */
@Injectable()
export class OrderCreationService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(input: CreateOrderInput): Promise<OrderWithItemsRow> {
    const { outletId, items, identity, idempotency } = input;

    if (items.length > MAX_ORDER_LINES) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "TOO_MANY_ORDER_LINES",
        `An order can have at most ${MAX_ORDER_LINES} line items (got ${items.length}).`,
      );
    }

    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${outletId}" not found.`);
    }
    if (outlet.status !== "open") {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "OUTLET_CLOSED",
        `${outlet.name} is closed and is not taking orders right now.`,
      );
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const [products, overrides] = await Promise.all([
      this.prisma.product.findMany({
        // Scoped to the outlet's business: a product ID from another
        // business is "not found", never orderable here.
        where: { id: { in: productIds }, businessId: outlet.businessId },
        include: { modifierGroups: { include: { options: true } } },
      }),
      this.prisma.outletProductOverride.findMany({
        where: { outletId: outlet.id, productId: { in: productIds } },
      }),
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));
    const overrideByProductId = new Map(overrides.map((override) => [override.productId, override]));

    let subtotalCents = 0;
    const lines: Prisma.OrderItemCreateWithoutOrderInput[] = items.map((item) => {
      if (item.quantity > MAX_LINE_QUANTITY) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "QUANTITY_TOO_LARGE",
          `A line item's quantity can be at most ${MAX_LINE_QUANTITY} (got ${item.quantity}).`,
        );
      }

      const notes = item.notes?.trim() ? item.notes.trim() : null;
      if (notes !== null && notes.length > MAX_NOTES_LENGTH) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "NOTES_TOO_LONG",
          `Notes can be at most ${MAX_NOTES_LENGTH} characters.`,
        );
      }

      const product = productById.get(item.productId);
      if (!product) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PRODUCT_NOT_FOUND",
          `Product "${item.productId}" is not on this outlet's menu.`,
        );
      }

      const { price, isAvailable } = resolveOutletPricing(product, overrideByProductId.get(product.id));
      if (!isAvailable) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "PRODUCT_UNAVAILABLE",
          `${product.name} is sold out at ${outlet.name} right now.`,
        );
      }

      // The existing, shared modifier rules (docs/product-customization-v2.md);
      // throws a 400 ApiException on any violation.
      const { selections } = validateSelectedModifiers(
        {
          id: product.id,
          modifierGroups: product.modifierGroups.map((group) => ({
            id: group.id,
            name: group.name,
            selectionType: group.selectionType,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            options: group.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta.toNumber(),
              quantityEnabled: option.quantityEnabled,
            })),
          })),
        },
        item.selectedModifierOptions,
      );

      // Per-unit price = base + sum(delta x option quantity); the line is that
      // times the line quantity. Cents, so nothing accumulates float error.
      const modifiersPerUnitCents = selections.reduce(
        (sum, selection) => sum + Math.round(selection.priceDelta * 100) * selection.quantity,
        0,
      );
      subtotalCents += (toCents(price) + modifiersPerUnitCents) * item.quantity;

      return {
        product: { connect: { id: product.id } },
        nameSnapshot: product.name,
        priceSnapshot: price,
        quantity: item.quantity,
        notes,
        modifiers: {
          create: selections.map((selection) => ({
            groupNameSnapshot: selection.groupName,
            optionNameSnapshot: selection.optionName,
            priceDeltaSnapshot: centsToDecimal(Math.round(selection.priceDelta * 100)),
            quantity: selection.quantity,
          })),
        },
      };
    });

    const totalCents = subtotalCents + SERVICE_FEE_CENTS;
    const businessDate = businessDateFor(new Date());

    return this.prisma.$transaction(async (tx) => {
      // Atomic per-outlet, per-day sequence: one statement that inserts the
      // day's first row or increments the existing one, row-locked, so
      // concurrent orders can never be handed the same number. If the order
      // insert below fails, this increment rolls back with it.
      const counterRows = await tx.$queryRaw<Array<{ last_seq: number }>>`
        INSERT INTO order_daily_counters (outlet_id, business_date, last_seq)
        VALUES (${outlet.id}, ${businessDate}::date, 1)
        ON CONFLICT (outlet_id, business_date)
        DO UPDATE SET last_seq = order_daily_counters.last_seq + 1
        RETURNING last_seq`;
      const sequence = counterRows[0]?.last_seq;
      if (sequence === undefined) {
        throw new Error("Order daily counter returned no row");
      }

      return tx.order.create({
        data: {
          outlet: { connect: { id: outlet.id } },
          ...(identity.kind === "customer"
            ? { customer: { connect: { id: identity.customerId } } }
            : { guestPhone: identity.guestPhone, guestTokenHash: identity.guestTokenHash }),
          displayId: formatDisplayId(outlet.displayPrefix, sequence),
          businessDate,
          dailySeq: sequence,
          status: "pending",
          subtotal: centsToDecimal(subtotalCents),
          serviceFee: centsToDecimal(SERVICE_FEE_CENTS),
          total: centsToDecimal(totalCents),
          idempotencyKey: idempotency?.key,
          idempotencyFingerprint: idempotency?.fingerprint,
          orderItems: { create: lines },
        },
        include: orderInclude,
      });
    });
  }
}
