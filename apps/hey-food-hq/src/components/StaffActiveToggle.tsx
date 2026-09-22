"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";

import { deactivateStaffAction, reactivateStaffAction } from "@/app/(app)/staff/actions";

/**
 * Deactivate/reactivate — never delete (README: a departed staff member's
 * record stays, so history and whatever future actor column might reference
 * it stay intact; only login is blocked, and nothing checks a PIN yet
 * anyway). Deactivating asks first, since it can lock someone out; the
 * backend also refuses to deactivate the business's LAST active HQ Admin —
 * this button just surfaces that message if it happens.
 */
export function StaffActiveToggle({ staffId, isActive }: { staffId: string; isActive: boolean }): ReactElement {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (isActive) {
    if (confirming) {
      return (
        <div className="rounded-md border border-danger-solid bg-danger-tint p-3">
          <p className="text-hq-body font-semibold text-danger-solid">Deactivate this account? They will never be able to log in once real PIN login exists. The record itself is kept.</p>
          {error && <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">{error}</p>}
          <div className="mt-2 flex gap-3">
            <button type="button" disabled={busy} onClick={() => void run(() => deactivateStaffAction(staffId))} className="min-h-11 rounded-md bg-danger-solid px-4 text-hq-body font-bold text-brand-white disabled:opacity-50">
              {busy ? "Deactivating…" : "Deactivate"}
            </button>
            <button type="button" disabled={busy} onClick={() => { setConfirming(false); setError(null); }} className="min-h-11 rounded-md border border-brand-line px-4 text-hq-body font-semibold text-brand-ink">
              Keep active
            </button>
          </div>
        </div>
      );
    }
    return (
      <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-md border border-danger-solid bg-danger-tint px-4 text-hq-body font-bold text-danger-solid" data-testid="deactivate-button">
        Deactivate…
      </button>
    );
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void run(() => reactivateStaffAction(staffId))} className="min-h-11 rounded-md bg-brand-teal px-4 text-hq-body font-bold text-brand-white disabled:opacity-50" data-testid="reactivate-button">
        {busy ? "Reactivating…" : "Reactivate"}
      </button>
      {error && <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">{error}</p>}
    </div>
  );
}
