import type { Prisma } from "@prisma/client";

/**
 * The one rule for "what does this outlet charge for this product, and can
 * it be ordered right now" — master price unless the outlet has an
 * override, and available unless an override says otherwise. Shared by the
 * menu (GET /outlets/:id, which displays it) and order creation (which
 * charges it), so what a customer is shown and what they are billed can
 * never be computed by two different implementations.
 */
export function resolveOutletPricing(
  product: { masterPrice: Prisma.Decimal },
  override: { priceOverride: Prisma.Decimal | null; isAvailable: boolean } | undefined,
): { price: Prisma.Decimal; isAvailable: boolean } {
  return {
    price: override?.priceOverride ?? product.masterPrice,
    // No override row for a product at an outlet defaults to available at
    // master price — see prisma/seed.ts's comment on the same assumption.
    isAvailable: override ? override.isAvailable : true,
  };
}
