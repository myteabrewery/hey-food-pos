import Link from "next/link";
import type { ReactElement } from "react";

/**
 * PLACEHOLDER — no real HQ Admin authentication exists yet (blueprint
 * Section 6 lists "Login (role-based: HQ Admin / Area Manager / Outlet
 * Staff view)" as screen 1 of 12; role-based login itself isn't built).
 * Same treatment as Outlet POS's LoginScreen: one button, no real
 * session created, and — since a login screen is the one place this
 * session has judged worth surfacing a placeholder visibly rather than
 * just in a code comment — an on-screen caption saying so.
 *
 * A plain `<Link>`, not a button + client-side handler: the only action
 * here is "navigate to /dashboard," which Next's own routing already
 * does without needing a "use client" component at all.
 */
export default function LoginPage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream">
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-hq-display font-bold text-brand-ink">Hey Food</h1>
        <p className="mt-1 text-hq-heading font-semibold tracking-wide text-brand-muted">
          HQ ADMIN
        </p>

        <Link
          href="/dashboard"
          className="mt-12 flex min-h-11 w-full items-center justify-center rounded-md bg-brand-teal text-hq-body font-semibold text-brand-white transition-colors hover:bg-brand-tealDark"
        >
          Log In
        </Link>

        <p className="mt-3 text-hq-caption text-brand-muted">
          Demo login — real HQ Admin auth not yet built
        </p>
      </div>
    </main>
  );
}
