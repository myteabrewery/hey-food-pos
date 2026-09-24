import { z } from "zod";

import { listResponseSchema } from "./common";
import { OutletSchema } from "./entities";

/** Dev spec Section 9.1's three-level health signal. */
export const HealthStatusSchema = z.union([
  z.literal("green"),
  z.literal("yellow"),
  z.literal("red"),
]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// GET /admin/outlets
/**
 * Which metrics belong here vs. the `/live` endpoint below isn't spec-
 * defined beyond the sales figure shown in blueprint Section 6's dashboard
 * mockup — this also folds in `healthStatus` per your decision.
 */
const AdminOutletSummarySchema = z.object({
  outlet: OutletSchema,
  salesToday: z.number(),
  ordersToday: z.number(),
  healthStatus: HealthStatusSchema,
});
export type AdminOutletSummary = z.infer<typeof AdminOutletSummarySchema>;

export const AdminOutletsResponseSchema = listResponseSchema(AdminOutletSummarySchema);
export type AdminOutletsResponse = z.infer<typeof AdminOutletsResponseSchema>;

// GET /admin/outlets/:id/live
/** `healthMessage` (e.g. "High order volume") is inferred from blueprint Section 6's mockup text, not spec-literal. */
export const AdminOutletLiveResponseSchema = z.object({
  queue: z.object({
    new: z.number(),
    preparing: z.number(),
    ready: z.number(),
  }),
  healthStatus: HealthStatusSchema,
  healthMessage: z.string().optional(),
});
export type AdminOutletLiveResponse = z.infer<typeof AdminOutletLiveResponseSchema>;

// GET /admin/reports?range=
// Deferred entirely, as decided — needs a dedicated design pass covering
// the five distinct report types in blueprint Section 14 (sales trends,
// outlet-to-outlet comparison, best-sellers, peak hours, and per-outlet
// prep-time/ready-to-collection averages). No schema, no stub type here
// until that pass happens.

// GET /admin/customers/:id — see admin-customers.ts. (Moved out of this file
// when built: the original draft here reused CustomerSchema directly, which
// carries the FULL phone number — wrong for an HQ-admin-key-guarded response;
// admin-customers.ts fixes that and adds the list endpoint and the
// guest-orders-by-phone view the built screen actually needed.)
