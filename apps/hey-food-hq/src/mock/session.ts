import type { StaffUser } from "@hey-food/shared-types";

// STUB — there is no real HQ Admin auth yet. Unlike the Customer App
// (phone+OTP) or Outlet POS (device-bound PIN), this session isn't even
// held anywhere yet — LoginScreen's button just navigates straight to
// /dashboard (a plain Next.js Link, no session object created or
// checked). This constant exists only so the Dashboard has a name to
// display in its header; it is not read from, or written to, any real
// session state.
export const MOCK_STAFF: StaffUser = {
  id: "staff_mock_hq_admin",
  businessId: "biz_hey_food",
  name: "HQ Admin",
  phone: "+60100000000",
  role: "hq_admin",
  // Empty, not every outlet: an hq_admin sees all outlets BECAUSE of the role,
  // not because it lists them (see the StaffUser doc comment).
  assignedOutletIds: [],
  pinHash: "stub_no_real_auth",
  pinChangedAt: "2026-01-01T00:00:00.000Z",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};
