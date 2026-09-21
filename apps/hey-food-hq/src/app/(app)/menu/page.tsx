import Link from "next/link";
import type { ReactElement } from "react";

import type { AdminProductListItem } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { AdminApiError, listProducts } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";

// Prices and availability are live data: never serve a cached list.
export const dynamic = "force-dynamic";

/**
 * Master Menu List (blueprint Section 6 screen 6, dev spec Section 9.3): every
 * product for the business with its MASTER name/category/price. Per-outlet data
 * lives on the Product Detail screen; here it only shows as counts (how many
 * outlets have a price that differs from master, and where it is sold out), so
 * variance is visible before opening a product.
 *
 * REAL DATA from the backend's /admin endpoints, reached from this page's
 * server with the temporary HQ admin key (never the browser). This app has NO
 * LOGIN: see the banner on every page.
 */
export default async function MenuPage(): Promise<ReactElement> {
  let items: AdminProductListItem[] = [];
  let failure: string | null = null;
  try {
    items = await listProducts();
  } catch (caught) {
    failure = caught instanceof AdminApiError ? caught.message : "Couldn't load the menu.";
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-hq-display font-bold text-brand-ink">Menu</h1>
        <Link
          href="/menu/new"
          className="flex min-h-11 items-center rounded-md bg-brand-teal px-5 text-hq-body font-semibold text-brand-white transition-colors hover:bg-brand-tealDark"
        >
          New product
        </Link>
      </div>
      <p className="mt-1 text-hq-body text-brand-muted">
        The master menu, defined once for the whole business. A new product is orderable at every outlet straight away;
        open a product to set per-outlet availability and price.
      </p>

      {failure !== null ? (
        <BackendError title="Couldn't load the menu" message={failure} />
      ) : items.length === 0 ? (
        <p className="mt-6 text-hq-body text-brand-muted">No products yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          <div className="flex items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
            <span className="flex-1">PRODUCT</span>
            <span className="w-28">CATEGORY</span>
            <span className="w-24 text-right">MASTER PRICE</span>
            <span className="w-40">PRICE OVERRIDES</span>
            <span className="w-32">SOLD OUT AT</span>
          </div>

          {items.map((item, index) => (
            <Link
              key={item.product.id}
              href={`/menu/${encodeURIComponent(item.product.id)}`}
              className={`flex items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft ${
                index < items.length - 1 ? "border-b border-brand-line" : ""
              }`}
            >
              <span className="flex-1">
                <span className="block font-semibold text-brand-ink">{item.product.name}</span>
                {item.product.description && <span className="block truncate text-hq-caption text-brand-muted">{item.product.description}</span>}
              </span>
              <span className="w-28 text-brand-muted">{item.product.category}</span>
              <span className="w-24 text-right text-brand-ink">{formatRM(item.product.masterPrice)}</span>
              <span className="w-40">
                {item.priceOverrideCount > 0 ? (
                  <span className="inline-flex rounded-pill border border-variance-solid bg-variance-tint px-2 py-0.5 text-hq-caption font-bold text-variance-solid">
                    {item.priceOverrideCount} of {item.outletCount} outlets differ
                  </span>
                ) : (
                  <span className="text-hq-caption text-brand-muted">none</span>
                )}
              </span>
              <span className="w-32 text-hq-caption text-brand-muted">
                {item.unavailableOutletCount > 0 ? `${item.unavailableOutletCount} of ${item.outletCount} outlets` : "nowhere"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
