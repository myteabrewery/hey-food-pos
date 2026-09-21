"use server";

import { revalidatePath } from "next/cache";

import {
  CreateProductRequestSchema,
  UpdateOutletProductOverrideRequestSchema,
  UpdateProductRequestSchema,
} from "@hey-food/api-client";

import { AdminApiError, createProduct, updateOverride, updateProduct } from "@/lib/admin-api";
import { HQ_BUSINESS_ID } from "@/lib/config";

/**
 * Server actions for Menu Management. These run on the HQ app's SERVER: they are
 * the only place the shared HQ admin key is used, so it never reaches the
 * browser. Each one validates its input with the same strict api-client schema
 * the backend uses (so a bad value is reported next to the field, and a stray
 * key such as `businessId` or a price sent to the wrong endpoint is refused
 * here too), then calls the backend, which validates again.
 *
 * NOTE: a server action is a public HTTP endpoint of this app. With no HQ login,
 * anyone who can reach this app can invoke them — which is exactly why the app
 * must never be reachable beyond localhost (README banner, STATUS.md CRITICAL).
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; field?: string };

/** The parts of a zod error this needs (HQ does not depend on zod directly; api-client does). */
interface SchemaError {
  issues: Array<{ path: Array<string | number>; message: string }>;
}

function fromZod(error: SchemaError): ActionResult<never> {
  const issue = error.issues[0];
  const field = issue?.path[0] === undefined ? undefined : String(issue.path[0]);
  return { ok: false, field, error: `${field ? `${field}: ` : ""}${issue?.message ?? "invalid input"}` };
}

function fromCaught(caught: unknown): ActionResult<never> {
  if (caught instanceof AdminApiError) {
    return { ok: false, error: caught.message };
  }
  // Never echo an unexpected error's text back to the browser: it could carry internals.
  console.error("[HQ menu action failed]", caught instanceof Error ? caught.message : caught);
  return { ok: false, error: "Something went wrong. Nothing was saved." };
}

export async function createProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  // The business is fixed by this server's configuration; whatever the browser sent for it is overwritten.
  const parsed = CreateProductRequestSchema.safeParse({ ...(input as object), businessId: HQ_BUSINESS_ID });
  if (!parsed.success) return fromZod(parsed.error);
  try {
    // Only the master fields go on: the business is applied by admin-api from this server's config.
    const { name, description, category, imageUrl, masterPrice } = parsed.data;
    const product = await createProduct({ name, description, category, imageUrl, masterPrice });
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
