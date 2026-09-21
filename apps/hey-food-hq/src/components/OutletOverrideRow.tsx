"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";

import type { AdminProductOutletRow } from "@hey-food/api-client";

import { updateOverrideAction } from "@/app/(app)/menu/actions";
import { PriceVarianceBadge } from "@/components/PriceVarianceBadge";
import { formatRM } from "@/lib/format";

interface Props {
  productId: string;
  masterPrice: number;
  row: AdminProductOutletRow;
}

/**
 * One outlet's line in the Product Detail matrix: availability, the master
 * price for reference, this outlet's price override, what customers are
 * actually charged here, and the server-computed "differs from master" badge.
 *
 * Availability sends the DESIRED state (not a flip); "Set price" sends the
 * typed override; "Clear" sends null (back to the master price). Each is a
 * separate request touching only its own field, so it can never overwrite a
 * value changed elsewhere (e.g. by the POS) in the meantime.
 */
export function OutletOverrideRow({ productId, masterPrice, row }: Props): ReactElement {
  const router = useRouter();
  const current = row.override?.priceOverride ?? null;
  const [priceText, setPriceText] = useState(current === null ? "" : current.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  async function run(patch: { isAvailable?: boolean; priceOverride?: number | null }, okText: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateOverrideAction(row.outlet.id, productId, patch);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: okText });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleSetPrice() {
    const trimmed = priceText.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      setMessage({ kind: "error", text: "Enter a price like 9.50." });
      return;
    }
    void run({ priceOverride: Number(trimmed) }, "Price saved.");
  }

  const available = row.effectiveIsAvailable;
  const overrideEqualsMaster = current !== null && !row.priceDiffersFromMaster;

  return (
    <div className="flex flex-wrap items-start gap-4 border-b border-brand-line px-4 py-3 last:border-b-0" data-testid={`row-${row.outlet.id}`}>
      <div className="w-44">
        <p className="text-hq-body font-semibold text-brand-ink">{row.outlet.name}</p>
        <p className="text-hq-caption capitalize text-brand-muted">{row.outlet.status}</p>
      </div>

      <div className="w-32">
        <button
          type="button"
          onClick={() => void run({ isAvailable: !available }, available ? "Marked sold out." : "Marked available.")}
          disabled={busy}
          aria-label={`${row.outlet.name}: ${available ? "available" : "sold out"}, click to toggle`}
          className={`min-h-11 w-full rounded-md px-3 text-hq-caption font-bold tracking-wide text-brand-white disabled:opacity-50 ${
            available ? "bg-brand-teal" : "bg-brand-ink"
          }`}
        >
          {available ? "AVAILABLE" : "SOLD OUT"}
        </button>
      </div>

      <div className="w-24 text-right">
        <p className="text-hq-caption text-brand-muted">Master</p>
        <p className="text-hq-body text-brand-ink">{formatRM(masterPrice)}</p>
      </div>

      <div className="min-w-56 flex-1">
        <p className="text-hq-caption text-brand-muted">Price override</p>
        <div className="mt-1 flex items-center gap-2">
          <input
            aria-label={`${row.outlet.name} price override`}
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
            inputMode="decimal"
            placeholder="none"
            className="w-24 rounded-md border border-brand-line bg-brand-white px-2 py-2 text-hq-body text-brand-ink"
          />
          <button
            type="button"
            onClick={handleSetPrice}
            disabled={busy}
            className="min-h-11 rounded-md border border-brand-teal px-3 text-hq-caption font-bold text-brand-teal disabled:opacity-50"
          >
            Set price
          </button>
          {current !== null && (
            <button
              type="button"
              onClick={() => {
                setPriceText("");
                void run({ priceOverride: null }, "Override cleared; following the master price.");
              }}
              disabled={busy}
              className="min-h-11 rounded-md border border-brand-line px-3 text-hq-caption font-bold text-brand-muted disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
        {overrideEqualsMaster && (
          <p className="mt-1 text-hq-caption text-brand-muted">
            This override equals the master price, so it no longer differs. Clear it so it follows the master again.
          </p>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`mt-1 text-hq-caption font-semibold ${message.kind === "error" ? "text-danger-solid" : "text-brand-teal"}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="w-56 text-right">
        <p className="text-hq-caption text-brand-muted">Customers pay here</p>
        <p className="text-hq-body font-semibold text-brand-ink" data-testid={`effective-${row.outlet.id}`}>
          {formatRM(row.effectivePrice)}
        </p>
        {row.priceDiffersFromMaster && (
          <div className="mt-1 flex justify-end" data-testid={`badge-${row.outlet.id}`}>
            <PriceVarianceBadge effectivePrice={row.effectivePrice} masterPrice={masterPrice} />
          </div>
        )}
      </div>
    </div>
  );
}
