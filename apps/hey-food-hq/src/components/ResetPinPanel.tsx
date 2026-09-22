"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import { resetStaffPinAction } from "@/app/(app)/staff/actions";

const PIN_PATTERN = /^\d{6}$/;
const inputClass = "mt-1 w-32 rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid";

/**
 * Its own action, deliberately separate from the name/role edit form: a PIN
 * reset is a bigger deal than renaming someone, so it gets its own explicit
 * button, its own confirmation field, and its own success message — never
 * bundled silently into "Save changes".
 */
export function ResetPinPanel({ staffId }: { staffId: string }): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    setPin("");
    setConfirmPin("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!PIN_PATTERN.test(pin)) {
      setError({ field: "pin", text: "Enter exactly 6 digits." });
      return;
    }
    if (pin !== confirmPin) {
      setError({ field: "confirmPin", text: "Doesn't match the PIN above." });
      return;
    }
    setBusy(true);
    try {
      const result = await resetStaffPinAction(staffId, { pin });
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
        <button type="button" onClick={() => { setOpen(true); setDone(false); }} className="min-h-11 rounded-md border border-brand-teal px-4 text-hq-body font-bold text-brand-teal">
          Reset PIN…
        </button>
        {done && <p role="status" className="mt-2 text-hq-body font-semibold text-brand-teal">PIN reset. Tell this person their new PIN yourself; it is never shown again.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-brand-line bg-brand-white p-4" aria-label="Reset PIN">
      <p className="text-hq-body font-semibold text-brand-ink">New PIN (6 digits)</p>
      <p className="mt-1 text-hq-caption text-brand-muted">Chosen here, not generated. The old PIN stops working immediately.</p>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <div>
          <label htmlFor="rp-pin" className="text-hq-caption text-brand-muted">
            PIN
          </label>
          <input id="rp-pin" value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-invalid={error?.field === "pin"} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rp-confirm" className="text-hq-caption text-brand-muted">
            Confirm
          </label>
          <input id="rp-confirm" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-invalid={error?.field === "confirmPin"} className={inputClass} />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-hq-caption font-semibold text-danger-solid">{error.text}</p>}
      <div className="mt-3 flex gap-3">
        <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-brand-teal px-4 text-hq-body font-bold text-brand-white disabled:opacity-50">
          {busy ? "Resetting…" : "Reset PIN"}
        </button>
        <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-md border border-brand-line px-4 text-hq-body font-semibold text-brand-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
