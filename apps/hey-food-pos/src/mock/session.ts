import type { StaffUser } from "@hey-food/shared-types";

// STUB — there is no real staff PIN auth yet (dev spec Section 5.5:
// "Login: PIN-based, device is pre-bound to its outlet at setup"). This
// is a hardcoded stand-in for "the login screen succeeded and the device
// resolved its bound outlet + staff identity" — LoginScreen's one button
// produces exactly this object rather than calling any real endpoint.
export const MOCK_STAFF: StaffUser = {
  id: "staff_mock_outlet_1",
  businessId: "biz_hey_food",
  name: "Outlet Staff",
  phone: "+60100000000",
  role: "outlet_staff",
  assignedOutletIds: ["outlet_paradigm_mall"],
  pinHash: "stub_no_real_auth",
};

export const MOCK_OUTLET_NAME = "Hey Food — Paradigm Mall";
