import { OrderStatus } from "./order-status";

/**
 * Visual metadata for one OrderStatus value, per
 * docs/hey-food-design-system-v1.md Section 2.
 *
 * A status badge must never render color without this paired label
 * (accessibility rule, design system Section 7) — consumers should always
 * render `label` alongside `background`/`text`, never color alone.
 */
export interface StatusMeta {
  /** Badge background color (hex). */
  background: string;
  /** Badge text color (hex). */
  text: string;
  /** Short human-readable label shown on the badge. */
  label: string;
}

/**
 * `Collected` and `Completed` intentionally share one visual treatment.
 * The design system's status table (Section 2) defines a single "Completed"
 * row captioned "Collected, order closed" — it does not give `Collected` its
 * own badge appearance. The two remain distinct OrderStatus values because
 * HQ reporting depends on `collectedAt` as its own timestamped transition
 * (blueprint Section 7), but that distinction is data-only, not visual.
 */
export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  [OrderStatus.Pending]: { background: "#FEF3C7", text: "#92400E", label: "Pending" },
  [OrderStatus.Paid]: { background: "#DBEAFE", text: "#1E40AF", label: "Paid" },
  [OrderStatus.Received]: { background: "#EDE9FE", text: "#5B21B6", label: "Received" },
  [OrderStatus.Preparing]: { background: "#FFEDD5", text: "#9A3412", label: "Preparing" },
  [OrderStatus.Ready]: { background: "#D1FAE5", text: "#065F46", label: "Ready" },
  [OrderStatus.Collected]: { background: "#E7E5E4", text: "#44403C", label: "Completed" },
  [OrderStatus.Completed]: { background: "#E7E5E4", text: "#44403C", label: "Completed" },
  [OrderStatus.Cancelled]: { background: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
};
