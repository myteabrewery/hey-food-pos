import type { ReactElement } from "react";

import { ORDER_STATUS_META, isOrderStatus } from "@hey-food/design-tokens";

/**
 * An order status pill in the shared status colors (design system Section 2). The
 * label always travels with the color: never color alone.
 */
export function OrderStatusBadge({ status }: { status: string }): ReactElement {
  const meta = isOrderStatus(status) ? ORDER_STATUS_META[status] : { background: "#E7E5E4", text: "#44403C", label: status };
  return (
    <span
      className="inline-flex rounded-pill px-2 py-0.5 text-hq-caption font-bold"
      style={{ backgroundColor: meta.background, color: meta.text }}
      data-testid="status-badge"
    >
      {meta.label}
    </span>
  );
}
