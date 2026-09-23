import { HttpStatus, Injectable } from "@nestjs/common";
import type { UpdateProductAvailabilityResponse } from "@hey-food/api-client";
import { UpdateProductAvailabilityResponseSchema } from "@hey-food/api-client";
import { Prisma } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { recordMenuChanges } from "../menu/menu-change-log";
import { PrismaService } from "../prisma/prisma.service";
import type { StaffSessionContext } from "../staff/staff-session.guard";

/**
 * Staff "sold out" toggling (dev spec Section 5.3). Writes ONLY
 * `OutletProductOverride.isAvailable`: `priceOverride` is HQ-only, so this
 * service never reads it into a write, never accepts it (the request schema is
 * strict), and never touches it on an existing row.
 */
@Injectable()
export class PosMenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sets a product's availability at one outlet to exactly `isAvailable`.
   * Idempotent: the same value twice leaves the same row in the same state.
   * Most products have no override row (no row = available at master price),
   * so the first write creates one with `priceOverride` null; an existing row
   * only has `isAvailable` changed, leaving any HQ price override intact.
   */
  async setAvailability(
    outletId: string,
    productId: string,
    isAvailable: boolean,
    session: StaffSessionContext,
  ): Promise<UpdateProductAvailabilityResponse> {
    // The URL's outlet id isn't secret, so a mismatch here is a plain 403 —
    // closes the demonstrated cross-outlet weakness of the old device-key
    // stopgap (a Paradigm tablet's key could sell out KSL City's items).
    if (outletId !== session.outletId) {
      throw new ApiException(HttpStatus.FORBIDDEN, "OUTLET_NOT_ASSIGNED", "You aren't logged in for that outlet.");
    }
    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true, businessId: true } });
    if (!outlet) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${outletId}" not found.`);
    }

    // The product must belong to this outlet's business: a product ID from
    // another business is "not found", never something this outlet can override.
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: outlet.businessId },
      select: { id: true },
    });
    if (!product) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        "PRODUCT_NOT_FOUND",
        `Product "${productId}" is not on outlet "${outletId}"'s menu.`,
      );
    }

    const where = { outletId_productId: { outletId: outlet.id, productId: product.id } };
    const write = () =>
      this.prisma.$transaction(async (tx) => {
        const existing = await tx.outletProductOverride.findUnique({ where });
        const saved = await tx.outletProductOverride.upsert({
          where,
          // Only isAvailable — deliberately no priceOverride key anywhere here.
          update: { isAvailable },
          create: { outletId: outlet.id, productId: product.id, isAvailable },
        });
        // Append to the menu change log IN THE SAME TRANSACTION, but only when
        // the effective availability really changed (no row = available). No
        // "who": nothing authenticates the POS. (Two simultaneous first-ever
        // writes can each log the same change; the log is a record, not a lock.)
        const was = existing?.isAvailable ?? true;
        if (was !== isAvailable) {
          await recordMenuChanges(tx, [
            {
              businessId: outlet.businessId,
              productId: product.id,
              outletId: outlet.id,
              field: "is_available",
              oldValue: String(was),
              newValue: String(isAvailable),
              source: "pos",
            },
          ]);
        }
        return saved;
      });

    let row;
    try {
      row = await write();
    } catch (error) {
      // Two first-ever writes for the same product raced to create the row:
      // the loser hits the unique index. The row exists now, so retry once
      // and it becomes a plain update.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        row = await write();
      } else {
        throw error;
      }
    }

    return UpdateProductAvailabilityResponseSchema.parse({
      id: row.id,
      outletId: row.outletId,
      productId: row.productId,
      isAvailable: row.isAvailable,
      priceOverride: row.priceOverride === null ? null : row.priceOverride.toNumber(),
    });
  }
}
