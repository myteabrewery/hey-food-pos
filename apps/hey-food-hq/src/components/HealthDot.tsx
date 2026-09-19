import type { ReactElement } from "react";

import type { OutletHealthStatus } from "@hey-food/design-tokens";

export interface HealthDotProps {
  health: OutletHealthStatus;
}

// Written as complete, static class strings (not built via template
// interpolation of `health`) so Tailwind's content scanner can actually
// see and generate them — an interpolated `bg-health-${health}` would
// compile fine but silently produce no styles, since Tailwind never
// sees the literal class name anywhere in the source.
const HEALTH_DOT_CLASS: Record<OutletHealthStatus, string> = {
  good: "bg-health-good",
  warning: "bg-health-warning",
  critical: "bg-health-critical",
};

/**
 * The outlet-health dot, shared by Dashboard, Outlet List, and Outlet
 * Detail — extracted here once a third screen needed it, rather than
 * copying the same `HEALTH_DOT_CLASS` map a third time.
 */
export function HealthDot({ health }: HealthDotProps): ReactElement {
  return (
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH_DOT_CLASS[health]}`}
      aria-hidden="true"
    />
  );
}
