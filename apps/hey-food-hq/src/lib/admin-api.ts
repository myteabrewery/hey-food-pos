import {
  AdminCancelOrderResponseSchema,
  AdminCustomerDetailResponseSchema,
  AdminCustomerListResponseSchema,
  AdminGuestCustomerDetailResponseSchema,
  AdminGuestCustomerListResponseSchema,
  AdminOrderDetailResponseSchema,
  AdminOrderListResponseSchema,
  AdminProductDetailResponseSchema,
  AdminProductListResponseSchema,
  AdminStaffDetailResponseSchema,
  AdminStaffListResponseSchema,
  CreateProductResponseSchema,
  CreateStaffResponseSchema,
  ResetStaffPasswordResponseSchema,
  ResetStaffPinResponseSchema,
  SetStaffActiveResponseSchema,
  UpdateOutletProductOverrideResponseSchema,
  UpdateProductResponseSchema,
  UpdateStaffResponseSchema,
  type AdminCancelOrderRequest,
  type AdminCustomerDetailQueryInput,
  type AdminCustomerDetailResponse,
  type AdminCustomerListQueryInput,
  type AdminCustomerListResponse,
  type AdminGuestCustomerDetailQueryInput,
  type AdminGuestCustomerDetailResponse,
  type AdminGuestCustomerListQueryInput,
  type AdminGuestCustomerListResponse,
  type AdminOrderDetail,
  type AdminOrderListQueryInput,
  type AdminOrderListResponse,
  type AdminProductDetailResponse,
  type AdminProductListItem,
  type AdminStaffDetailResponse,
  type AdminStaffListResponse,
  type CreateProductRequest,
  type CreateStaffRequest,
  type PublicStaffUser,
  type ResetStaffPasswordRequest,
  type ResetStaffPinRequest,
  type UpdateOutletProductOverrideRequest,
  type UpdateProductRequest,
  type UpdateStaffRequest,
} from "@hey-food/api-client";
import type { OutletProductOverride, Product } from "@hey-food/shared-types";

import { AdminApiError, backendRequest } from "./backend";
import { getHqToken } from "./session";

export { AdminApiError } from "./backend";

/**
 * One request to the backend's `/admin/*` endpoints, from the SERVER only
 * (server components and server actions): the bearer token comes from the
 * httpOnly session cookie (`lib/session.ts`), never from the browser, and
 * every `/admin/*` route requires `HqAdminSessionGuard` — no token here
 * means "not logged in", surfaced the same way as any other backend error.
 */
async function request(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<unknown> {
  const token = getHqToken();
  if (!token) {
    throw new AdminApiError(401, "NO_HQ_SESSION", "Not logged in.");
  }
  return backendRequest(method, path, body, token);
}

const enc = encodeURIComponent;

/** The business's products with per-outlet variance counts (Master Menu List). `businessId` comes from the session, not this call. */
export async function listProducts(): Promise<AdminProductListItem[]> {
  return AdminProductListResponseSchema.parse(await request("GET", "/admin/products")).data;
}

/** One product with its per-outlet matrix and recent changes (Product Detail). */
export async function getProduct(productId: string): Promise<AdminProductDetailResponse> {
  return AdminProductDetailResponseSchema.parse(await request("GET", `/admin/products/${enc(productId)}`));
}

/** Create a product in the calling session's business (the caller cannot pick another). */
export async function createProduct(input: CreateProductRequest): Promise<Product> {
  return CreateProductResponseSchema.parse(await request("POST", "/admin/products", input));
}

export async function updateProduct(productId: string, patch: UpdateProductRequest): Promise<Product> {
  return UpdateProductResponseSchema.parse(await request("PATCH", `/admin/products/${enc(productId)}`, patch));
}

export async function updateOverride(
  outletId: string,
  productId: string,
  patch: UpdateOutletProductOverrideRequest,
): Promise<OutletProductOverride> {
  return UpdateOutletProductOverrideResponseSchema.parse(
    await request("PATCH", `/admin/outlets/${enc(outletId)}/products/${enc(productId)}`, patch),
  );
}

/**
 * One page of the Orders table. `filters` are the raw filter values; the business
 * comes from the session. Unset filters are omitted, so the backend's default
 * view (everything except `pending`) applies.
 */
export async function listOrders(filters: Omit<AdminOrderListQueryInput, "limit"> & { limit?: number }): Promise<AdminOrderListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return AdminOrderListResponseSchema.parse(await request("GET", query ? `/admin/orders?${query}` : "/admin/orders"));
}

/** One order in full (Order Detail). */
export async function getOrder(orderId: string): Promise<AdminOrderDetail> {
  return AdminOrderDetailResponseSchema.parse(await request("GET", `/admin/orders/${enc(orderId)}`));
}

/** Cancel an order as HQ. Returns the refreshed detail. */
export async function cancelOrder(orderId: string, input: AdminCancelOrderRequest): Promise<AdminOrderDetail> {
  return AdminCancelOrderResponseSchema.parse(await request("POST", `/admin/orders/${enc(orderId)}/cancel`, input));
}

/** Every staff member for the calling session's business, plus the outlets an assignment picker offers. */
export async function listStaff(): Promise<AdminStaffListResponse> {
  return AdminStaffListResponseSchema.parse(await request("GET", "/admin/staff"));
}

/** One staff member, plus the outlets an assignment picker offers. */
export async function getStaff(staffId: string): Promise<AdminStaffDetailResponse> {
  return AdminStaffDetailResponseSchema.parse(await request("GET", `/admin/staff/${enc(staffId)}`));
}

/** Create a staff member in the calling session's business (the caller cannot pick another). */
export async function createStaff(input: CreateStaffRequest): Promise<PublicStaffUser> {
  return CreateStaffResponseSchema.parse(await request("POST", "/admin/staff", input));
}

export async function updateStaff(staffId: string, patch: UpdateStaffRequest): Promise<PublicStaffUser> {
  return UpdateStaffResponseSchema.parse(await request("PATCH", `/admin/staff/${enc(staffId)}`, patch));
}

export async function resetStaffPin(staffId: string, input: ResetStaffPinRequest): Promise<PublicStaffUser> {
  return ResetStaffPinResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/reset-pin`, input));
}

export async function resetStaffPassword(staffId: string, input: ResetStaffPasswordRequest): Promise<PublicStaffUser> {
  return ResetStaffPasswordResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/reset-password`, input));
}

export async function deactivateStaff(staffId: string): Promise<PublicStaffUser> {
  return SetStaffActiveResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/deactivate`));
}

export async function reactivateStaff(staffId: string): Promise<PublicStaffUser> {
  return SetStaffActiveResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/reactivate`));
}

/** One page of the App Accounts view (Customers, dev spec Section 2/9.4). */
export async function listCustomers(filters: Omit<AdminCustomerListQueryInput, "limit"> & { limit?: number }): Promise<AdminCustomerListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return AdminCustomerListResponseSchema.parse(await request("GET", query ? `/admin/customers?${query}` : "/admin/customers"));
}

/** One app-account customer, with a page of its order history. */
export async function getCustomer(customerId: string, page: AdminCustomerDetailQueryInput): Promise<AdminCustomerDetailResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(page)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return AdminCustomerDetailResponseSchema.parse(await request("GET", query ? `/admin/customers/${enc(customerId)}?${query}` : `/admin/customers/${enc(customerId)}`));
}

/** One page of the Guest Orders by Phone view. */
export async function listGuestCustomers(
  filters: Omit<AdminGuestCustomerListQueryInput, "limit"> & { limit?: number },
): Promise<AdminGuestCustomerListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return AdminGuestCustomerListResponseSchema.parse(await request("GET", query ? `/admin/guest-customers?${query}` : "/admin/guest-customers"));
}

/** One guest phone's summary, with a page of its order history. Addressed by the opaque `key` from the list — never the phone itself. */
export async function getGuestCustomer(key: string, page: AdminGuestCustomerDetailQueryInput): Promise<AdminGuestCustomerDetailResponse> {
  const params = new URLSearchParams();
  for (const [k, value] of Object.entries(page)) {
    if (value !== undefined && value !== "") params.set(k, String(value));
  }
  const query = params.toString();
  return AdminGuestCustomerDetailResponseSchema.parse(await request("GET", query ? `/admin/guest-customers/${enc(key)}?${query}` : `/admin/guest-customers/${enc(key)}`));
}
