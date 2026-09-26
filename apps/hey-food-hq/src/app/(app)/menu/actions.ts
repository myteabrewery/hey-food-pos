"use server";

import { revalidatePath } from "next/cache";

import {
  CreateProductRequestSchema,
  UpdateOutletProductOverrideRequestSchema,
  UpdateProductRequestSchema,
} from "@hey-food/api-client";

import { createProduct, updateOverride, updateProduct } from "@/lib/admin-api";
import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ menu action failed");

/**
 * Server actions for Menu Management. These run on the HQ app's SERVER, using
 * the logged-in HQ admin's own session (never reaching the browser). Each one
 * validates its input with the same strict api-client schema the backend uses
 * (so a bad value is reported next to the field, and a stray key or a price
 * sent to the wrong endpoint is refused here too), then calls the backend,
 * which validates again and applies `businessId` from the session itself.
 */

export async function createProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateProductRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const product = await createProduct(parsed.data);
    revalidatePath("/menu");
    return { ok: true, data: { id: product.id } };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function updateProductAction(productId: string, input: unknown): Promise<ActionResult> {
  const parsed = UpdateProductRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await updateProduct(productId, parsed.data);
    revalidatePath("/menu");
    revalidatePath(`/menu/${productId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function updateOverrideAction(outletId: string, productId: string, input: unknown): Promise<ActionResult> {
  const parsed = UpdateOutletProductOverrideRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await updateOverride(outletId, productId, parsed.data);
    revalidatePath("/menu");
    revalidatePath(`/menu/${productId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}
