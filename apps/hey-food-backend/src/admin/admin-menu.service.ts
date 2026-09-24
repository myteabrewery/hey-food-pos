import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AdminProductDetailResponse,
  AdminProductListResponse,
  CreateProductResponse,
  UpdateOutletProductOverrideRequest,
  UpdateOutletProductOverrideResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from "@hey-food/api-client";
import {
  AdminProductDetailResponseSchema,
  AdminProductListResponseSchema,
  CreateProductResponseSchema,
  UpdateOutletProductOverrideResponseSchema,
  UpdateProductResponseSchema,
} from "@hey-food/api-client";
import { Prisma, type Product } from "@prisma/client";
import type { CreateProductRequestSchema } from "@hey-food/api-client";
import type { z } from "zod";

import { ApiException } from "../common/api-exception";
import { resolveOutletPricing } from "../menu/outlet-pricing";
import { priceText, recordMenuChanges, type MenuChangeInput } from "../menu/menu-change-log";
import { PrismaService } from "../prisma/prisma.service";

const MAX_CHANGES_SHOWN = 30;

type CreateProductBody = z.output<typeof CreateProductRequestSchema>;

const toProductDto = (product: Product) => ({
  id: product.id,
  businessId: product.businessId,
  name: product.name,
  description: product.description,
  imageUrl: product.imageUrl,
  category: product.category,
  masterPrice: product.masterPrice.toNumber(),
});

/**
 * HQ Product / Menu Management (dev spec 9.3, blueprint Section 12): the master
 * menu and the per-outlet overrides layered on it.
 *
 * ALL of this sits behind the TEMPORARY shared HQ admin key (see
 * HqAdminKeyGuard), which is not authentication — see the CRITICAL banner in
 * README.md. Every change here is appended to the menu change log in the same
 * transaction, always with `changedByStaffId: null` — `HqAdminKeyGuard` has no
 * session identity to attribute a change to, unlike the POS's real staff
 * sessions (see PosMenuService).
 *
 * Rules that hold throughout:
 *  - master fields and per-outlet data are separate: editing a product never
 *    touches an override row, and an override edit never touches the product;
 *  - override rows are only ever UPSERTED, never deleted, and only the keys
 *    sent are changed (so a value the POS set is never clobbered);
 *  - a request that changes nothing writes nothing (no update, no log row).
 */
@Injectable()
export class AdminMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(businessId: string): Promise<AdminProductListResponse> {
    await this.requireBusiness(businessId);

    const [products, outlets] = await Promise.all([
      this.prisma.product.findMany({ where: { businessId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
      this.prisma.outlet.findMany({ where: { businessId }, select: { id: true } }),
    ]);
    const outletIds = new Set(outlets.map((outlet) => outlet.id));
    const overrides = await this.prisma.outletProductOverride.findMany({
      where: { productId: { in: products.map((product) => product.id) } },
    });

    return AdminProductListResponseSchema.parse({
      data: products.map((product) => {
        const own = overrides.filter((row) => row.productId === product.id && outletIds.has(row.outletId));
        return {
          product: toProductDto(product),
          outletCount: outlets.length,
          priceOverrideCount: own.filter((row) => row.priceOverride !== null && !row.priceOverride.equals(product.masterPrice)).length,
          unavailableOutletCount: own.filter((row) => !row.isAvailable).length,
        };
      }),
    });
  }

  async getProduct(productId: string): Promise<AdminProductDetailResponse> {
    const product = await this.requireProduct(productId);

    const [outlets, overrides, events] = await Promise.all([
      this.prisma.outlet.findMany({ where: { businessId: product.businessId }, orderBy: { name: "asc" } }),
      this.prisma.outletProductOverride.findMany({ where: { productId } }),
      this.prisma.menuChangeEvent.findMany({
        where: { productId },
        orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        take: MAX_CHANGES_SHOWN,
        include: { outlet: { select: { name: true } } },
      }),
    ]);
    const overrideByOutlet = new Map(overrides.map((row) => [row.outletId, row]));

    return AdminProductDetailResponseSchema.parse({
      product: toProductDto(product),
      outlets: outlets.map((outlet) => {
        const override = overrideByOutlet.get(outlet.id);
        // The same rule the customer menu and order creation charge by.
        const effective = resolveOutletPricing(product, override);
        return {
          outlet: { id: outlet.id, name: outlet.name, status: outlet.status },
          override: override
            ? {
                id: override.id,
                outletId: override.outletId,
                productId: override.productId,
                isAvailable: override.isAvailable,
                priceOverride: override.priceOverride === null ? null : override.priceOverride.toNumber(),
              }
            : null,
          effectiveIsAvailable: effective.isAvailable,
          effectivePrice: effective.price.toNumber(),
          priceDiffersFromMaster: override?.priceOverride != null && !override.priceOverride.equals(product.masterPrice),
        };
      }),
      changes: events.map((event) => ({
        id: event.id,
        field: event.field,
        outletId: event.outletId,
        outletName: event.outlet?.name ?? null,
        oldValue: event.oldValue,
        newValue: event.newValue,
        source: event.source,
        changedAt: event.changedAt.toISOString(),
      })),
    });
  }

  async createProduct(body: CreateProductBody): Promise<CreateProductResponse> {
    await this.requireBusiness(body.businessId);
    await this.requireUniqueName(body.businessId, body.name, null);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          businessId: body.businessId,
          name: body.name,
          description: body.description,
          imageUrl: body.imageUrl,
          category: body.category,
          masterPrice: new Prisma.Decimal(body.masterPrice.toFixed(2)),
        },
      });
      await recordMenuChanges(tx, [
        { businessId: created.businessId, productId: created.id, outletId: null, field: "created", oldValue: null, newValue: created.name, source: "hq", changedByStaffId: null },
      ]);
      return created;
    });
    return CreateProductResponseSchema.parse(toProductDto(product));
  }

  async updateProduct(productId: string, patch: UpdateProductRequest): Promise<UpdateProductResponse> {
    const product = await this.requireProduct(productId);

    // Only fields whose value actually changes are written and logged.
    const data: Prisma.ProductUpdateInput = {};
    const changes: MenuChangeInput[] = [];
    const base = { businessId: product.businessId, productId: product.id, outletId: null, source: "hq" as const, changedByStaffId: null };

    const text = (key: "name" | "description" | "imageUrl" | "category", field: string, current: string) => {
      const next = patch[key];
      if (next !== undefined && next !== current) {
        data[key] = next;
        changes.push({ ...base, field, oldValue: current, newValue: next });
      }
    };
    text("name", "name", product.name);
    text("description", "description", product.description);
    text("imageUrl", "image_url", product.imageUrl);
    text("category", "category", product.category);
    if (patch.masterPrice !== undefined && !product.masterPrice.equals(patch.masterPrice.toFixed(2))) {
      data.masterPrice = new Prisma.Decimal(patch.masterPrice.toFixed(2));
      changes.push({ ...base, field: "master_price", oldValue: priceText(product.masterPrice), newValue: patch.masterPrice.toFixed(2) });
    }

    if (changes.length === 0) {
      return UpdateProductResponseSchema.parse(toProductDto(product));
    }
    if (patch.name !== undefined && patch.name !== product.name) {
      await this.requireUniqueName(product.businessId, patch.name, product.id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.product.update({ where: { id: product.id }, data });
      await recordMenuChanges(tx, changes);
      return row;
    });
    return UpdateProductResponseSchema.parse(toProductDto(updated));
  }

  async updateOverride(
    outletId: string,
    productId: string,
    patch: UpdateOutletProductOverrideRequest,
  ): Promise<UpdateOutletProductOverrideResponse> {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true, businessId: true } });
    if (!outlet) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${outletId}" not found.`);
    }
    // The product must belong to the outlet's business: an outlet and a product
    // of different businesses can never be linked by an override.
    const product = await this.prisma.product.findFirst({ where: { id: productId, businessId: outlet.businessId } });
    if (!product) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        "PRODUCT_NOT_FOUND",
        `Product "${productId}" is not on outlet "${outletId}"'s menu.`,
      );
    }

    if (typeof patch.priceOverride === "number" && product.masterPrice.equals(patch.priceOverride.toFixed(2))) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "PRICE_OVERRIDE_EQUALS_MASTER",
        `RM${patch.priceOverride.toFixed(2)} is already ${product.name}'s master price. Clear the override instead:` +
          " an override equal to the master would silently stop following it the next time the master changes.",
      );
    }

    const where = { outletId_productId: { outletId: outlet.id, productId: product.id } };
    const attempt = () =>
      this.prisma.$transaction(async (tx) => {
        const existing = await tx.outletProductOverride.findUnique({ where });

        // Only the keys sent are written. An absent key leaves that column exactly
        // as it is, including a value the POS set.
        const update: Prisma.OutletProductOverrideUpdateInput = {};
        if (patch.isAvailable !== undefined) update.isAvailable = patch.isAvailable;
        if (patch.priceOverride !== undefined) {
          update.priceOverride = patch.priceOverride === null ? null : new Prisma.Decimal(patch.priceOverride.toFixed(2));
        }
        const row = await tx.outletProductOverride.upsert({
          where,
          update,
          // No row means "available at master price", so that is what a first
          // write starts from; a price-only patch does not silently sell the item out.
          create: {
            outletId: outlet.id,
            productId: product.id,
            isAvailable: patch.isAvailable ?? true,
            priceOverride: patch.priceOverride == null ? null : new Prisma.Decimal(patch.priceOverride.toFixed(2)),
          },
        });

        const base = { businessId: product.businessId, productId: product.id, outletId: outlet.id, source: "hq" as const, changedByStaffId: null };
        const changes: MenuChangeInput[] = [];
        const wasAvailable = existing?.isAvailable ?? true;
        if (patch.isAvailable !== undefined && patch.isAvailable !== wasAvailable) {
          changes.push({ ...base, field: "is_available", oldValue: String(wasAvailable), newValue: String(patch.isAvailable) });
        }
        const wasPrice = priceText(existing?.priceOverride ?? null);
        const nowPrice = patch.priceOverride === undefined ? wasPrice : priceText(patch.priceOverride);
        if (patch.priceOverride !== undefined && nowPrice !== wasPrice) {
          changes.push({ ...base, field: "price_override", oldValue: wasPrice, newValue: nowPrice });
        }
        await recordMenuChanges(tx, changes);
        return row;
      });

    let row;
    try {
      row = await attempt();
    } catch (error) {
      // Two first-ever writes for the same outlet/product raced to create the
      // row: the loser hits the unique index. The row exists now, so retry once
      // and it becomes a plain update.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        row = await attempt();
      } else {
        throw error;
      }
    }

    return UpdateOutletProductOverrideResponseSchema.parse({
      id: row.id,
      outletId: row.outletId,
      productId: row.productId,
      isAvailable: row.isAvailable,
      priceOverride: row.priceOverride === null ? null : row.priceOverride.toNumber(),
    });
  }

  private async requireBusiness(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
    if (!business) {
      throw new ApiException(HttpStatus.NOT_FOUND, "BUSINESS_NOT_FOUND", `Business "${businessId}" not found.`);
    }
  }

  private async requireProduct(productId: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", `Product "${productId}" not found.`);
    }
    return product;
  }

  /**
   * No two products in a business share a name (compared case-insensitively):
   * it stops a double-clicked "Create" from making two identical products.
   * Checked in the application, not by a DB constraint, so it is not race-proof.
   */
  private async requireUniqueName(businessId: string, name: string, exceptProductId: string | null): Promise<void> {
    const clash = await this.prisma.product.findFirst({
      where: { businessId, name: { equals: name, mode: "insensitive" }, ...(exceptProductId ? { id: { not: exceptProductId } } : {}) },
      select: { id: true },
    });
    if (clash) {
      throw new ApiException(HttpStatus.CONFLICT, "PRODUCT_NAME_TAKEN", `A product named "${name}" already exists.`);
    }
  }
}
