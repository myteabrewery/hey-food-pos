import type { ReactElement } from "react";

import { formatRM } from "@/lib/format";

/**
 * The "differs from master" badge (dev spec Section 9.3): shown next to any
 * outlet whose price override is not the master price, so HQ never loses track
 * of price variance across outlets. Whether it shows is decided by the SERVER
 * (`priceDiffersFromMaster`), never recomputed here, so it cannot drift from
 * what customers are actually charged.
 */
export function PriceVarianceBadge({ effectivePrice, masterPrice }: { effectivePrice: number; masterPrice: number }): ReactElement {
  const delta = Math.round((effectivePrice - masterPrice) * 100) / 100;
  const sign = delta > 0 ? "+" : "−";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill border border-variance-solid bg-variance-tint px-2 py-0.5 text-hq-caption font-bold text-variance-solid"
      title={`This outlet charges ${formatRM(effectivePrice)}; the master price is ${formatRM(masterPrice)}.`}
    >
      Differs from master ({sign}
      {formatRM(Math.abs(delta))})
    </span>
  );
}
