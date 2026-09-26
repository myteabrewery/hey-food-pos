import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { LoginForm } from "@/components/LoginForm";
import { getHqSession } from "@/lib/session";

/**
 * Real HQ Admin login (replacing the one-button placeholder outright — see
 * docs/STATUS.md, "Real HQ authentication"). `hq_admin` and `area_manager`
 * both log in here (area_manager is authenticated but currently blocked on
 * every screen — see AppLayout); `outlet_staff` is rejected by the backend.
 */
export default async function LoginPage(): Promise<ReactElement> {
  // Already logged in: no reason to show the form again.
  if (await getHqSession()) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream">
      <div className="w-full max-w-sm px-6">
        <div className="text-center">
          <h1 className="text-hq-display font-bold text-brand-ink">Hey Food</h1>
          <p className="mt-1 text-hq-heading font-semibold tracking-wide text-brand-muted">HQ ADMIN</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
