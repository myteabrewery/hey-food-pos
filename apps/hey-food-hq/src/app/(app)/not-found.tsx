import Link from "next/link";
import type { ReactElement } from "react";

/**
 * Next's own default not-found page renders barely-legible text against
 * this app's cream background/dark-text global styles — added once
 * Outlet Detail's `notFound()` call (an invalid `:id`) gave a real path
 * that could actually surface it. Scoped to the `(app)` route group so
 * it renders inside the sidebar shell, not as a bare unstyled page.
 */
export default function NotFound(): ReactElement {
  return (
    <div className="mx-auto max-w-5xl px-8 py-6 text-center">
      <h1 className="text-hq-display font-bold text-brand-ink">Not found</h1>
      <p className="mt-2 text-hq-body text-brand-muted">
        This page doesn&apos;t exist, or the outlet ID is invalid.
      </p>
      <Link href="/dashboard" className="mt-4 inline-block text-hq-body font-semibold text-brand-teal hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
