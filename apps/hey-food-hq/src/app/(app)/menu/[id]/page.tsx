import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import type { AdminProductDetailResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { OutletOverrideRow } from "@/components/OutletOverrideRow";
import { ProductForm } from "@/components/ProductForm";
import { AdminApiError, getProduct, listProducts } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";
import { describeChange, formatChangeTime } from "@/lib/menu-format";

export const dynamic = "force-dynamic";

/**
 * Product Detail / Outlet Override Matrix (blueprint Section 6 screen 7, dev
 * spec Section 9.3): the product's MASTER fields to edit, and one line per
 * outlet with its availability and price override. The "differs from master"
 * badge is decided by the backend, next to the price-resolution logic customers
 * are charged by, so HQ cannot lose track of price variance across outlets.
 * Below it, the recent changes: what changed, from what to what, and when. There
 * is no "who": this app has no login to attribute a change to.
 */
export default async function ProductDetailPage({ params }: { params: { id: string } }): Promise<ReactElement> {
  let detail: AdminProductDetailResponse;
  try {
    detail = await getProduct(params.id);
  } catch (caught) {
    if (caught instanceof AdminApiError && caught.status === 404) notFound();
    return (
      <div className="mx-auto max-w-5xl px-8 py-6">
        <Link href="/menu" className="text-hq-body text-brand-teal">
          ← Back to menu
        </Link>
        <BackendError title="Couldn't load this product" message={caught instanceof AdminApiError ? caught.message : "Couldn't load this product."} />
      </div>
    );
  }

  const { product, outlets, changes } = detail;
  const categories = await listProducts()
    .then((items) => [...new Set(items.map((item) => item.product.category))].sort())
    .catch(() => [] as string[]);
  const own = outlets.filter((row) => row.priceDiffersFromMaster);

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <Link href="/menu" className="text-hq-body text-brand-teal">
        ← Back to menu
      </Link>
      <h1 className="mt-2 text-hq-display font-bold text-brand-ink">{product.name}</h1>

      <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">Master details</h2>
        <p className="mt-1 text-hq-caption text-brand-muted">Applies to every outlet, except where an outlet has its own price below.</p>
        <div className="mt-4 max-w-xl">
          <ProductForm
            mode="edit"
            productId={product.id}
            categories={categories}
            initial={{
              name: product.name,
              description: product.description,
              category: product.category,
              imageUrl: product.imageUrl,
              masterPrice: product.masterPrice.toFixed(2),
            }}
          />
        </div>
        {own.length > 0 && (
          <p className="mt-4 rounded-md bg-variance-tint p-3 text-hq-caption font-semibold text-variance-solid" data-testid="wont-follow">
            {own.length} outlet{own.length === 1 ? "" : "s"} charge{own.length === 1 ? "s" : ""} their own price and will NOT follow a change to the master price:{" "}
            {own.map((row) => `${row.outlet.name} (${formatRM(row.effectivePrice)})`).join(", ")}.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">Outlets</h2>
        <p className="mt-1 text-hq-caption text-brand-muted">
          Availability and price per outlet. Outlet staff can also mark items sold out from the POS; this is the same data.
          Setting a price equal to the master price isn&apos;t allowed; clear the override instead.
        </p>
        <div className="mt-3 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          {outlets.map((row) => (
            <OutletOverrideRow key={row.outlet.id} productId={product.id} masterPrice={product.masterPrice} row={row} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">Recent changes</h2>
        <p className="mt-1 text-hq-caption text-brand-muted">
          What changed, from what to what, and when (Kuala Lumpur time), from HQ or the POS. It does not record <strong>who</strong>: there is no login to attribute a change to.
        </p>
        {changes.length === 0 ? (
          <p className="mt-3 text-hq-body text-brand-muted">No changes recorded yet.</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-md border border-brand-line bg-brand-white" data-testid="change-log">
            {changes.map((change) => {
              const { what, detail: text } = describeChange(change);
              return (
                <li key={change.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-brand-line px-4 py-2 text-hq-body last:border-b-0">
                  <span className="w-44 text-hq-caption text-brand-muted">{formatChangeTime(change.changedAt)}</span>
                  <span className="font-semibold text-brand-ink">{what}</span>
                  <span className="flex-1 text-brand-muted">{text}</span>
                  <span className="rounded-pill bg-brand-soft px-2 py-0.5 text-hq-caption font-bold uppercase text-brand-muted">{change.source}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
