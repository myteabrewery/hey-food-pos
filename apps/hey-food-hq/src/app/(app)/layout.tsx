import type { ReactElement, ReactNode } from "react";

import { NoLoginBanner } from "@/components/NoLoginBanner";
import { Sidebar } from "@/components/Sidebar";

/**
 * Chrome shared by every screen reachable after "logging in" — the dashboard,
 * outlets and menu screens, with the sidebar listing the full ~12-screen set
 * (docs/hey-food-product-blueprint-v1.md Section 6). A route group
 * (parens, adds no URL segment) rather than putting this in the root
 * layout, since /login intentionally has no sidebar at all.
 *
 * Every page here also shows the permanent "NO LOGIN" banner: the app has no
 * authentication and, with Menu Management, can now change prices for the whole
 * business, so it must only ever run on localhost.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <NoLoginBanner />
        {children}
      </main>
    </div>
  );
}
