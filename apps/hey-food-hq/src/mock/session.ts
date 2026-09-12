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
  assignedOutletIds: ["outlet_paradigm_mall", "outlet_ksl_city", "outlet_mid_valley"],
  pinHash: "stub_no_real_auth",
};
