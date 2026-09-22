import {
  AdminCancelOrderResponseSchema,
  AdminOrderDetailResponseSchema,
  AdminOrderListResponseSchema,
  AdminProductDetailResponseSchema,
  AdminProductListResponseSchema,
  AdminStaffDetailResponseSchema,
  AdminStaffListResponseSchema,
  ApiErrorSchema,
  CreateProductResponseSchema,
  CreateStaffResponseSchema,
  ResetStaffPinResponseSchema,
  SetStaffActiveResponseSchema,
  UpdateOutletProductOverrideResponseSchema,
  UpdateProductResponseSchema,
  UpdateStaffResponseSchema,
  type AdminCancelOrderRequest,
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
  type ResetStaffPinRequest,
  type UpdateOutletProductOverrideRequest,
  type UpdateProductRequest,
  type UpdateStaffRequest,
} from "@hey-food/api-client";
import type { OutletProductOverride, Product } from "@hey-food/shared-types";

import { API_BASE_URL, HQ_BUSINESS_ID, requireHqAdminKey } from "./config";

/** A failed backend call, carrying the API's own `{ error: { code, message } }`. */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * One request to the backend's /admin/* endpoints, from the SERVER only (server
 * components and server actions): this is where the TEMPORARY shared HQ admin
 * key is attached, and it must never end up in a browser bundle. Never cached:
 * prices and availability are live data.
 */
async function request(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<unknown> {
  const key = requireHqAdminKey();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "X-Hq-Admin-Key": key,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError(0, "NETWORK_ERROR", "Couldn't reach the backend. Is it running?");
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    throw new AdminApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      parsed.success ? parsed.data.error.message : `The backend answered ${response.status}.`,
    );
  }
  return json;
}

const enc = encodeURIComponent;

/** The business's products with per-outlet variance counts (Master Menu List). */
export async function listProducts(): Promise<AdminProductListItem[]> {
  return AdminProductListResponseSchema.parse(await request("GET", `/admin/products?businessId=${enc(HQ_BUSINESS_ID)}`)).data;
}

/** One product with its per-outlet matrix and recent changes (Product Detail). */
export async function getProduct(productId: string): Promise<AdminProductDetailResponse> {
  return AdminProductDetailResponseSchema.parse(await request("GET", `/admin/products/${enc(productId)}`));
}

/** Create a product in THIS app's business (the caller cannot pick another). */
export async function createProduct(input: Omit<CreateProductRequest, "businessId">): Promise<Product> {
  return CreateProductResponseSchema.parse(await request("POST", "/admin/products", { ...input, businessId: HQ_BUSINESS_ID }));
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
 * One page of the Orders table. `filters` are the raw filter values; the business is
 * this server's configuration (the caller cannot pick another). Unset filters are
 * omitted, so the backend's default view (everything except `pending`) applies.
 */
export async function listOrders(filters: Omit<AdminOrderListQueryInput, "businessId" | "limit"> & { limit?: number }): Promise<AdminOrderListResponse> {
  const params = new URLSearchParams({ businessId: HQ_BUSINESS_ID });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return AdminOrderListResponseSchema.parse(await request("GET", `/admin/orders?${params.toString()}`));
}

/** One order in full (Order Detail). */
export async function getOrder(orderId: string): Promise<AdminOrderDetail> {
  return AdminOrderDetailResponseSchema.parse(await request("GET", `/admin/orders/${enc(orderId)}`));
}

/** Cancel an order as HQ. Returns the refreshed detail. */
export async function cancelOrder(orderId: string, input: AdminCancelOrderRequest): Promise<AdminOrderDetail> {
  return AdminCancelOrderResponseSchema.parse(await request("POST", `/admin/orders/${enc(orderId)}/cancel`, input));
}

/** Every staff member for this business, plus the outlets an assignment picker offers. */
export async function listStaff(): Promise<AdminStaffListResponse> {
  return AdminStaffListResponseSchema.parse(await request("GET", `/admin/staff?businessId=${enc(HQ_BUSINESS_ID)}`));
}

/** One staff member, plus the outlets an assignment picker offers. */
export async function getStaff(staffId: string): Promise<AdminStaffDetailResponse> {
  return AdminStaffDetailResponseSchema.parse(await request("GET", `/admin/staff/${enc(staffId)}`));
}

/** Create a staff member in THIS app's business (the caller cannot pick another). */
export async function createStaff(input: Omit<CreateStaffRequest, "businessId">): Promise<PublicStaffUser> {
  return CreateStaffResponseSchema.parse(await request("POST", "/admin/staff", { ...input, businessId: HQ_BUSINESS_ID }));
}

export async function updateStaff(staffId: string, patch: UpdateStaffRequest): Promise<PublicStaffUser> {
  return UpdateStaffResponseSchema.parse(await request("PATCH", `/admin/staff/${enc(staffId)}`, patch));
}

export async function resetStaffPin(staffId: string, input: ResetStaffPinRequest): Promise<PublicStaffUser> {
  return ResetStaffPinResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/reset-pin`, input));
}

export async function deactivateStaff(staffId: string): Promise<PublicStaffUser> {
  return SetStaffActiveResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/deactivate`));
}

export async function reactivateStaff(staffId: string): Promise<PublicStaffUser> {
  return SetStaffActiveResponseSchema.parse(await request("POST", `/admin/staff/${enc(staffId)}/reactivate`));
}
