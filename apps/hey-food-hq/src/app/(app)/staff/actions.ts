"use server";

import { revalidatePath } from "next/cache";

import { CreateStaffRequestSchema, ResetStaffPinRequestSchema, UpdateStaffRequestSchema } from "@hey-food/api-client";

import { createStaff, deactivateStaff, reactivateStaff, resetStaffPin, updateStaff } from "@/lib/admin-api";
import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";
import { HQ_BUSINESS_ID } from "@/lib/config";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ staff action failed");

/**
 * Server actions for HQ Staff. These run on the HQ app's SERVER: they are the
 * only place the shared HQ admin key is used, so it never reaches the
 * browser. Each one validates its input with the same strict api-client
 * schema the backend uses, then calls the backend, which validates again.
 *
 * NOTE: a server action is a public HTTP endpoint of this app. With no HQ
 * login, anyone who can reach this app can invoke them — including creating
 * staff and setting their PIN — which is exactly why the app must only ever
 * run on localhost (README banner, STATUS.md CRITICAL).
 */

export async function createStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  // The business is fixed by this server's configuration; whatever the browser sent for it is overwritten.
  const parsed = CreateStaffRequestSchema.safeParse({ ...(typeof input === "object" && input !== null ? input : {}), businessId: HQ_BUSINESS_ID });
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const { name, phone, role, assignedOutletIds, pin } = parsed.data;
    const staff = await createStaff({ name, phone, role, assignedOutletIds, pin });
    revalidatePath("/staff");
    return { ok: true, data: { id: staff.id } };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function updateStaffAction(staffId: string, input: unknown): Promise<ActionResult> {
  const parsed = UpdateStaffRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await updateStaff(staffId, parsed.data);
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function resetStaffPinAction(staffId: string, input: unknown): Promise<ActionResult> {
  const parsed = ResetStaffPinRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await resetStaffPin(staffId, parsed.data);
    revalidatePath(`/staff/${staffId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function deactivateStaffAction(staffId: string): Promise<ActionResult> {
  try {
    await deactivateStaff(staffId);
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}

export async function reactivateStaffAction(staffId: string): Promise<ActionResult> {
  try {
    await reactivateStaff(staffId);
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}
