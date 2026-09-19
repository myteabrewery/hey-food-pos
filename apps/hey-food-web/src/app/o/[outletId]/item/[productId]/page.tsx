import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { ItemCustomizer } from "@/components/ItemCustomizer";
import { getOutletDetail } from "@/lib/api";
import { formatRM } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: { outletId: string; productId: string };
}): Promise<ReactElement> {
  const detail = await getOutletDetail(params.outletId);
  const item = detail?.menu.find((menuItem) => menuItem.id === params.productId);
  if (!detail || !item) {
    notFound();
  }

  const backHref = `/o/${encodeURIComponent(detail.outlet.id)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      <Link href={backHref} className="inline-flex min-h-tap items-center text-brand-teal">
        ← Back to menu
      </Link>

      <header className="mb-6 mt-2">
        <h1 className="text-web-display font-semibold">{item.name}</h1>
        {item.description && <p className="mt-1 text-brand-muted">{item.description}</p>}
        <p className="mt-2 font-semibold">{formatRM(item.price)}</p>
      </header>

      {item.isAvailable ? (
        <ItemCustomizer outletId={detail.outlet.id} item={item} ordersOpen={detail.outlet.status === "open"} />
      ) : (
        <p className="rounded-lg bg-brand-soft p-4 text-brand-muted">
          This item just sold out at this outlet. <Link href={backHref} className="text-brand-teal underline">Pick something else</Link>
        </p>
      )}
    </main>
  );
}
