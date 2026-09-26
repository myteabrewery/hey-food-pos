"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import { resetStaffPasswordAction } from "@/app/(app)/staff/actions";

const MIN_LENGTH = 10;
const inputClass = "mt-1 w-64 rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid";

/**
 * Its own action, deliberately separate from the name/role edit form — same
 * reasoning as ResetPinPanel. Also how a staff member just PROMOTED into
 * hq_admin/area_manager gets their first password: "reset" whether or not
 * one already existed (ResetStaffPasswordRequestSchema's doc comment).
 */
export function ResetPasswordPanel({ staffId }: { staffId: string }): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError({ field: "password", text: `Enter at least ${MIN_LENGTH} characters.` });
      return;
    }
    if (password !== confirmPassword) {
      setError({ field: "confirmPassword", text: "Doesn't match the password above." });
      return;
    }
    setBusy(true);
    try {
      const result = await resetStaffPasswordAction(staffId, { password });
      if (!result.ok) {
        setError({ text: result.error });
        return;
      }
      close();
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDone(false);
          }}
          className="min-h-11 rounded-md border border-brand-teal px-4 text-hq-body font-bold text-brand-teal"
        >
          Reset password…
        </button>
        {done && <p role="status" className="mt-2 text-hq-body font-semibold text-brand-teal">Password reset. Tell this person their new password yourself; it is never shown again.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-brand-line bg-brand-white p-4" aria-label="Reset password">
      <p className="text-hq-body font-semibold text-brand-ink">New password (at least {MIN_LENGTH} characters)</p>
      <p className="mt-1 text-hq-caption text-brand-muted">Chosen here, not generated. The old password stops working immediately.</p>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <div>
          <label htmlFor="rpw-password" className="text-hq-caption text-brand-muted">
            Password
          </label>
          <input
            id="rpw-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={error?.field === "password"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="rpw-confirm" className="text-hq-caption text-brand-muted">
            Confirm
          </label>
          <input
            id="rpw-confirm"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={error?.field === "confirmPassword"}
            className={inputClass}
          />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-hq-caption font-semibold text-danger-solid">{error.text}</p>}
      <div className="mt-3 flex gap-3">
        <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-brand-teal px-4 text-hq-body font-bold text-brand-white disabled:opacity-50">
          {busy ? "Resetting…" : "Reset password"}
        </button>
        <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-md border border-brand-line px-4 text-hq-body font-semibold text-brand-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
