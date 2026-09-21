"use server";

import { revalidatePath } from "next/cache";

import { AdminCancelOrderRequestSchema } from "@hey-food/api-client";

import { cancelOrder } from "@/lib/admin-api";
import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ orders action failed");

/**
 * Server action for HQ's order cancellation. It runs on the HQ app's SERVER, the
 * only place the shared HQ admin key is used. `actor` is fixed to "hq" here whatever
 * the browser sent, the input is validated with the same strict api-client schema the
 * backend uses (so "Other" without a description is refused next to the field), and
 * the backend validates again.
 *
 * NOTE: a server action is a public HTTP endpoint of this app. With no HQ login,
 * anyone who can reach this app can cancel ANY order through it — which is exactly
 * why the app must never be reachable beyond localhost (README banner, STATUS.md
 * CRITICAL).
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
