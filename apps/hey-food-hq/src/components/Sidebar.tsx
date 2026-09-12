import Link from "next/link";
import type { ReactElement } from "react";

type NavItem =
  | { label: string; href: string; comingSoon?: false }
  /** Not yet built — rendered as a disabled, non-navigating row; no `href` since it's never linked anywhere. */
  | { label: string; comingSoon: true };

// The full ~12-screen list from docs/hey-food-product-blueprint-v1.md
// Section 6, not just the 2 screens this pass actually builds — the
// point of a sidebar (over POS's top-button-row) is that it scales to
// this many destinations without redesign later; showing the real list
// now, mostly disabled, is what proves that rather than just asserting
// it. "Outlet list" and "Outlet detail" are folded into one future
// "Outlets" entry here rather than listed as two separate rows, since
// neither exists yet and guessing their eventual relationship (are they
// even separate top-level nav entries, or is Detail only reachable by
// drilling into List?) isn't this pass's call to make.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Outlets", comingSoon: true },
  { label: "Orders", comingSoon: true },
  { label: "Menu", comingSoon: true },
  { label: "Staff", comingSoon: true },
  { label: "Customers", comingSoon: true },
  { label: "Payments", comingSoon: true },
  { label: "Reports", comingSoon: true },
  { label: "Settings", comingSoon: true },
];

export function Sidebar(): ReactElement {
  return (
    <nav className="flex h-screen w-56 shrink-0 flex-col border-r border-brand-line bg-brand-white px-3 py-4">
      <div className="px-2 pb-4">
        <p className="text-hq-body font-bold text-brand-ink">Hey Food</p>
        <p className="text-hq-caption font-semibold tracking-wide text-brand-muted">HQ ADMIN</p>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) =>
          item.comingSoon ? (
            <li
              key={item.label}
              className="flex items-center justify-between rounded-md px-2 py-2 text-hq-body text-brand-muted opacity-50"
              aria-disabled="true"
            >
              <span>{item.label}</span>
              <span className="text-hq-caption">soon</span>
            </li>
          ) : (
            <li key={item.label}>
              <Link
                href={item.href}
                className="block rounded-md px-2 py-2 text-hq-body font-semibold text-brand-ink hover:bg-brand-soft"
              >
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
