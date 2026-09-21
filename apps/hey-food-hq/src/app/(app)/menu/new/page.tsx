import Link from "next/link";
import type { ReactElement } from "react";

import { ProductForm } from "@/components/ProductForm";
import { listProducts } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/** New product: master fields only. Modifier groups (customization) are not editable here yet. */
export default async function NewProductPage(): Promise<ReactElement> {
  // Existing categories, as suggestions. Best-effort: the form works without them.
  let categories: string[] = [];
  try {
    categories = [...new Set((await listProducts()).map((item) => item.product.category))].sort();
  } catch {
    categories = [];
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <Link href="/menu" className="text-hq-body text-brand-teal">
        ← Back to menu
      </Link>
      <h1 className="mt-2 text-hq-display font-bold text-brand-ink">New product</h1>
      <p className="mt-1 text-hq-body text-brand-muted">
        Once created it is orderable at <strong>every outlet immediately</strong>, at this master price. Use the product&apos;s
        page to mark it sold out or set a different price at particular outlets. Toppings and other customization options
        can&apos;t be added here yet.
      </p>

      <div className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <ProductForm mode="create" categories={categories} initial={{ name: "", description: "", category: "", imageUrl: "", masterPrice: "" }} />
      </div>
    </div>
  );
}
