import type { ReactElement, ReactNode } from "react";

import { Sidebar } from "@/components/Sidebar";

/**
 * Chrome shared by every screen reachable after "logging in" — currently
 * just /dashboard, but the sidebar already lists the full ~12-screen set
 * (docs/hey-food-product-blueprint-v1.md Section 6). A route group
 * (parens, adds no URL segment) rather than putting this in the root
 * layout, since /login intentionally has no sidebar at all.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
