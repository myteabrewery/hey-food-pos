"use server";

import { revalidatePath } from "next/cache";

import { CreateStaffRequestSchema, ResetStaffPasswordRequestSchema, ResetStaffPinRequestSchema, UpdateStaffRequestSchema } from "@hey-food/api-client";

import { createStaff, deactivateStaff, reactivateStaff, resetStaffPassword, resetStaffPin, updateStaff } from "@/lib/admin-api";
import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ staff action failed");

/**
 * Server actions for HQ Staff. These run on the HQ app's SERVER, using the
 * logged-in HQ admin's own session (never reaching the browser). Each one
 * validates its input with the same strict api-client schema the backend
 * uses, then calls the backend, which validates again and applies
 * `businessId` from the session itself.
 */

export async function createStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateStaffRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const { name, phone, role, assignedOutletIds, pin, password } = parsed.data;
    const staff = await createStaff({ name, phone, role, assignedOutletIds, pin, password });
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

export async function resetStaffPasswordAction(staffId: string, input: unknown): Promise<ActionResult> {
  const parsed = ResetStaffPasswordRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    await resetStaffPassword(staffId, parsed.data);
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
