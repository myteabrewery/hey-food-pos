import Link from "next/link";
import type { ReactElement } from "react";

import { LogoutButton } from "@/components/LogoutButton";

type NavItem =
  | { label: string; href: string; comingSoon?: false }
  /** Not yet built — rendered as a disabled, non-navigating row; no `href` since it's never linked anywhere. */
  | { label: string; comingSoon: true };

// The full ~12-screen list from docs/hey-food-product-blueprint-v1.md
// Section 6, not just the screens actually built so far — the point of
// a sidebar (over POS's top-button-row) is that it scales to this many
// destinations without redesign later; showing the real list now, still
// mostly disabled, is what proves that rather than just asserting it.
// "Outlets" links to the List screen; Detail is reached by clicking a
// row there (or from Dashboard's outlet lists), not a separate sidebar
// entry — mirrors how neither Dashboard nor Outlets needs its own
// "Detail" nav item today.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Outlets", href: "/outlets" },
  { label: "Orders", href: "/orders" },
  { label: "Menu", href: "/menu" },
  { label: "Staff", href: "/staff" },
  { label: "Customers", href: "/customers" },
  { label: "Payments", comingSoon: true },
  { label: "Reports", comingSoon: true },
  { label: "Settings", comingSoon: true },
];

interface Props {
  staffName: string;
  roleLabel: string;
}

export function Sidebar({ staffName, roleLabel }: Props): ReactElement {
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

      <div className="mt-auto border-t border-brand-line px-2 pt-4">
        <p className="truncate text-hq-body font-semibold text-brand-ink">{staffName}</p>
        <p className="text-hq-caption text-brand-muted">{roleLabel}</p>
        <div className="mt-2">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
