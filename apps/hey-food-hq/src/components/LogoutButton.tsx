"use client";

import { useState, type ReactElement } from "react";

import { logoutAction } from "@/app/(app)/actions";

/** logoutAction redirects on success, so there is no "done" state to render here — only "in flight". */
export function LogoutButton(): ReactElement {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void logoutAction();
      }}
      className="min-h-11 w-full rounded-md border border-brand-line px-3 text-hq-caption font-semibold text-brand-muted hover:bg-brand-soft disabled:opacity-50"
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
