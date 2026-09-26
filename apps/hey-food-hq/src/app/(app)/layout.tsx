import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";

import { AreaManagerBlocked } from "@/components/AreaManagerBlocked";
import { Sidebar } from "@/components/Sidebar";
import { getHqSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/staff-format";

/**
 * Chrome shared by every screen reachable after logging in — the dashboard,
 * outlets and menu screens, with the sidebar listing the full ~12-screen set
 * (docs/hey-food-product-blueprint-v1.md Section 6). A route group
 * (parens, adds no URL segment) rather than putting this in the root
 * layout, since /login intentionally has no sidebar at all.
 *
 * Gates on a real HQ session (replacing the permanent "NO LOGIN" banner
 * outright): no session sends the browser to /login. `area_manager` DOES
 * pass this gate (real HQ login accepts that role) but sees
 * `AreaManagerBlocked` in place of every screen's own content — none of
 * them are scoped to an area manager's outlets yet (see that component's
 * doc comment).
 */
export default async function AppLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  const session = await getHqSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar staffName={session.name} roleLabel={ROLE_LABELS[session.role]} />
      <main className="flex-1 overflow-y-auto">{session.role === "area_manager" ? <AreaManagerBlocked /> : children}</main>
    </div>
  );
}
