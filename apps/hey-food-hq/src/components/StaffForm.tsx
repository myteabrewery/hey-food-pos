"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import type { OutletRef } from "@hey-food/api-client";
import type { StaffRole } from "@hey-food/shared-types";

import { createStaffAction, updateStaffAction } from "@/app/(app)/staff/actions";
import { OutletAssignmentField } from "@/components/OutletAssignmentField";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_OPTIONS } from "@/lib/staff-format";

interface FormValues {
  name: string;
  phone: string;
  role: StaffRole;
  assignedOutletIds: string[];
}

interface Props {
  mode: "create" | "edit";
  staffId?: string;
  initial: FormValues;
  outlets: OutletRef[];
}

const inputClass = "mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid";
const PIN_PATTERN = /^\d{6}$/;

/**
 * Create / edit a staff member's account fields (name, phone, role, outlet
 * assignment). PIN creation lives HERE (a new account needs one to exist at
 * all) but PIN RESET does not — that is its own action on the edit page
 * (ResetPinPanel), with its own confirmation, never silently bundled into a
 * routine name/role edit.
 *
 * The PIN is typed by the HQ admin, not generated: this project has no real
 * POS PIN login yet to hand a generated one to (see AdminStaffService's doc
 * comment), so there is nothing today that would enforce a forced first-login
 * change. "Confirm PIN" is checked only in the browser, before submitting —
 * the backend never sees or needs a second copy.
 */
export function StaffForm({ mode, staffId, initial, outlets }: Props): ReactElement {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initial);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [formMessage, setFormMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function setRole(role: StaffRole) {
    setValues((previous) => ({ ...previous, role, assignedOutletIds: role === "hq_admin" ? [] : previous.assignedOutletIds }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormMessage(null);
    setFieldError(null);

    if (mode === "create") {
      if (!PIN_PATTERN.test(pin)) {
        setFieldError({ field: "pin", message: "Enter exactly 6 digits." });
        return;
      }
      if (pin !== confirmPin) {
        setFieldError({ field: "confirmPin", message: "Doesn't match the PIN above." });
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const result = await createStaffAction({ name: values.name, phone: values.phone, role: values.role, assignedOutletIds: values.assignedOutletIds, pin });
        if (!result.ok) {
          if (result.field) setFieldError({ field: result.field, message: result.error });
          else setFormMessage({ kind: "error", text: result.error });
          return;
        }
        router.push(`/staff/${encodeURIComponent(result.data.id)}`);
        return;
      }

      // edit: only the fields that actually changed
      const patch: Record<string, unknown> = {};
      if (values.name.trim() !== initial.name.trim()) patch.name = values.name;
      if (values.phone.trim() !== initial.phone.trim()) patch.phone = values.phone;
      if (values.role !== initial.role) patch.role = values.role;
      const sameOutlets =
        values.assignedOutletIds.length === initial.assignedOutletIds.length &&
        values.assignedOutletIds.every((id) => initial.assignedOutletIds.includes(id));
      if (!sameOutlets) patch.assignedOutletIds = values.assignedOutletIds;

      if (Object.keys(patch).length === 0) {
        setFormMessage({ kind: "ok", text: "Nothing to save — no field was changed." });
        return;
      }

      const result = await updateStaffAction(staffId ?? "", patch);
      if (!result.ok) {
        if (result.field) setFieldError({ field: result.field, message: result.error });
        else setFormMessage({ kind: "error", text: result.error });
        return;
      }
      setFormMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const invalid = (field: string) => fieldError?.field === field;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4" aria-label={mode === "create" ? "New staff member" : "Edit staff member"}>
      <div>
        <label htmlFor="sf-name" className="text-hq-body font-semibold text-brand-ink">
          Name
        </label>
        <input
          id="sf-name"
          value={values.name}
          onChange={(event) => setValues((previous) => ({ ...previous, name: event.target.value }))}
          aria-invalid={invalid("name")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="sf-phone" className="text-hq-body font-semibold text-brand-ink">
          Phone
        </label>
        <input
          id="sf-phone"
          value={values.phone}
          onChange={(event) => setValues((previous) => ({ ...previous, phone: event.target.value }))}
          placeholder="012-345 6789"
          aria-invalid={invalid("phone")}
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="text-hq-body font-semibold text-brand-ink">Role</legend>
        <div className="mt-1 grid gap-2">
          {ROLE_OPTIONS.map((role) => (
            <label
              key={role}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-hq-body text-brand-ink ${
                values.role === role ? "border-brand-teal bg-brand-soft" : "border-brand-line"
              }`}
            >
              <input type="radio" name="staff-role" className="mt-1" checked={values.role === role} onChange={() => setRole(role)} />
              <span>
                <span className="block font-semibold">{ROLE_LABELS[role]}</span>
                <span className="block text-hq-caption text-brand-muted">{ROLE_DESCRIPTIONS[role]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-hq-body font-semibold text-brand-ink">Outlet assignment</p>
        <OutletAssignmentField
          role={values.role}
          outlets={outlets}
          value={values.assignedOutletIds}
          onChange={(next) => setValues((previous) => ({ ...previous, assignedOutletIds: next }))}
          invalid={invalid("assignedOutletIds")}
        />
        {invalid("assignedOutletIds") && <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">{fieldError?.message}</p>}
      </div>

      {mode === "create" && (
        <>
          <div>
            <label htmlFor="sf-pin" className="text-hq-body font-semibold text-brand-ink">
              PIN (6 digits)
            </label>
            <input
              id="sf-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              type="password"
              autoComplete="off"
              maxLength={6}
              aria-invalid={invalid("pin")}
              className={inputClass}
            />
            {invalid("pin") && <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">{fieldError?.message}</p>}
            <p className="mt-1 text-hq-caption text-brand-muted">Chosen here, not generated — tell this person their PIN yourself; it is never shown again.</p>
          </div>
          <div>
            <label htmlFor="sf-confirm-pin" className="text-hq-body font-semibold text-brand-ink">
              Confirm PIN
            </label>
            <input
              id="sf-confirm-pin"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              inputMode="numeric"
              type="password"
              autoComplete="off"
              maxLength={6}
              aria-invalid={invalid("confirmPin")}
              className={inputClass}
            />
            {invalid("confirmPin") && <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">{fieldError?.message}</p>}
          </div>
        </>
      )}

      {fieldError && !invalid("pin") && !invalid("confirmPin") && !invalid("assignedOutletIds") && (
        <p role="alert" className="text-hq-caption font-semibold text-danger-solid">
          {fieldError.field}: {fieldError.message}
        </p>
      )}
      {formMessage && (
        <p role={formMessage.kind === "error" ? "alert" : "status"} className={`text-hq-body font-semibold ${formMessage.kind === "error" ? "text-danger-solid" : "text-brand-teal"}`}>
          {formMessage.text}
        </p>
      )}

      <button type="submit" disabled={saving} className="min-h-11 justify-self-start rounded-md bg-brand-teal px-5 text-hq-body font-semibold text-brand-white disabled:opacity-50">
        {saving ? "Saving…" : mode === "create" ? "Create staff member" : "Save changes"}
      </button>
    </form>
  );
}
