"use server";

import { revalidatePath } from "next/cache";

import { AdminCancelOrderRequestSchema } from "@hey-food/api-client";

import { cancelOrder } from "@/lib/admin-api";
import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ orders action failed");

/**
 * Server action for HQ's order cancellation. It runs on the HQ app's SERVER,
 * using the logged-in HQ admin's own session. `actor` is fixed to "hq" here
 * whatever the browser sent, the input is validated with the same strict
 * api-client schema the backend uses (so "Other" without a description is
 * refused next to the field), and the backend validates again — including
 * recording the real staffId behind this session, not `null`.
 */
export async function cancelOrderAction(orderId: string, input: unknown): Promise<ActionResult> {
  const parsed = AdminCancelOrderRequestSchema.safeParse({ ...(typeof input === "object" && input !== null ? input : {}), actor: "hq" });
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await cancelOrder(orderId, parsed.data);
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}
