import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import type { ResolvedMenuItem } from "@hey-food/shared-types";

import { getOutletDetail } from "@/lib/api";
import { formatRM } from "@/lib/format";

// Availability is live (POS toggles sold-out); never serve a cached menu.
export const dynamic = "force-dynamic";

/** Category order = order of first appearance in the server's menu, not alphabetical. */
function groupByCategory(menu: ResolvedMenuItem[]): Array<[string, ResolvedMenuItem[]]> {
  const groups = new Map<string, ResolvedMenuItem[]>();
  for (const item of menu) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()];
}

export default async function OutletMenuPage({ params }: { params: { outletId: string } }): Promise<ReactElement> {
  const detail = await getOutletDetail(params.outletId);
  if (!detail) {
    notFound();
  }

  const { outlet, menu } = detail;
  const isOpen = outlet.status === "open";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-48 pt-6">
      <header className="mb-6">
        <h1 className="text-web-heading font-semibold">{outlet.name}</h1>
        <p className="text-web-caption text-brand-muted">{outlet.address}</p>
        <p
          className={`mt-2 inline-block rounded-pill px-3 py-1 text-web-caption font-semibold ${
            isOpen ? "bg-brand-teal text-brand-white" : "bg-brand-soft text-brand-muted"
          }`}
        >
          {isOpen ? "Open now" : "Closed"}
        </p>
        {!isOpen && (
          <p className="mt-2 text-web-caption text-brand-muted">
            This outlet is closed right now. You can browse the menu, but ordering is unavailable.
          </p>
        )}
      </header>

      {groupByCategory(menu).map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-web-body font-semibold text-brand-muted">{category}</h2>
          <ul className="divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-brand-white">
            {items.map((item) => {
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-brand-peach text-web-heading font-semibold text-brand-white"
                  >
                    {item.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.name}</span>
                    {item.description && (
                      <span className="block truncate text-web-caption text-brand-muted">{item.description}</span>
                    )}
                    <span className="block text-web-caption font-semibold">
                      {item.isAvailable ? formatRM(item.price) : "Sold out"}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={item.id}>
                  {item.isAvailable ? (
                    <Link
                      href={`/o/${encodeURIComponent(outlet.id)}/item/${encodeURIComponent(item.id)}`}
                      className="flex min-h-tap items-center gap-3 px-4 py-3"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div aria-disabled="true" className="flex items-center gap-3 px-4 py-3 opacity-50">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
