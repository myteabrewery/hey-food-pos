"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import { loginAction } from "@/app/login/actions";

const inputClass = "mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid";

/**
 * Real HQ login — phone + password (`StaffPasswordSchema`, not a PIN; see its
 * doc comment for why). No outlet picker, unlike POS: an HQ session is never
 * bound to one outlet. On success the server action has already set the
 * httpOnly session cookie; this just navigates on.
 */
export function LoginForm(): ReactElement {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await loginAction({ phone, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 grid gap-4" aria-label="HQ Admin login">
      <div>
        <label htmlFor="lf-phone" className="text-hq-body font-semibold text-brand-ink">
          Phone
        </label>
        <input
          id="lf-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="012-345 6789"
          autoComplete="username"
          aria-invalid={error !== null}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="lf-password" className="text-hq-body font-semibold text-brand-ink">
          Password
        </label>
        <input
          id="lf-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          aria-invalid={error !== null}
          className={inputClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-hq-caption font-semibold text-danger-solid">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md bg-brand-teal text-hq-body font-semibold text-brand-white transition-colors hover:bg-brand-tealDark disabled:opacity-50"
      >
        {busy ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}
