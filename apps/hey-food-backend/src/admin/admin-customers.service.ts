import { createHash } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AdminCustomerDetailQuery,
  AdminCustomerDetailResponse,
  AdminCustomerListItem,
  AdminCustomerListQuery,
  AdminCustomerListResponse,
  AdminCustomerOrderHistoryItem,
  AdminGuestCustomerDetailQuery,
  AdminGuestCustomerDetailResponse,
  AdminGuestCustomerListItem,
  AdminGuestCustomerListQuery,
  AdminGuestCustomerListResponse,
} from "@hey-food/api-client";
import { AdminCustomerDetailResponseSchema, AdminCustomerListResponseSchema, AdminGuestCustomerDetailResponseSchema, AdminGuestCustomerListResponseSchema } from "@hey-food/api-client";
import type { OrderStatus, Prisma } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { maskPhone } from "../notifications/phone-mask";
import { PrismaService } from "../prisma/prisma.service";

/**
 * HQ Customers (dev spec Section 2/9.4). See admin-customers.ts in api-client
 * for why this is TWO views (App Accounts on the real `Customer` entity;
 * Guest Orders by Phone grouping guest orders at query time) and the
 * personal-data rule (full phone never leaves this service). Guarded by
 * `HqAdminSessionGuard` — real HQ login, replacing `HQ_ADMIN_KEY` outright.
 * Every method takes `businessId` from the CALLING SESSION, never a
 * client-supplied value.
 *
 * Both views scope everything to the calling business's OWN outlets:
 * `Customer` carries no `businessId` (a platform-wide identity), and `Order`
 * only has one via its outlet, so every query here goes through
 * `outletIdsForBusiness` rather than a direct `businessId` filter.
 *
 * "Lifetime value" / "order count" (dev spec's own words) count only orders
 * that got past checkout and were never cancelled — `LIFETIME_VALUE_EXCLUDED_STATUSES`
 * below — while the order HISTORY itself always shows every order regardless
 * of status. The two numbers are deliberately different views of the same
 * data: one a filtered metric, the other a real, unfiltered history.
 */
const LIFETIME_VALUE_EXCLUDED_STATUSES: OrderStatus[] = ["pending", "cancelled"];

const orderHistoryInclude = {
  outlet: { select: { id: true, name: true } },
  orderItems: { select: { quantity: true } },
} satisfies Prisma.OrderInclude;

type OrderHistoryRow = Prisma.OrderGetPayload<{ include: typeof orderHistoryInclude }>;

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // App Accounts
  // -------------------------------------------------------------------------

  async listCustomers(businessId: string, query: AdminCustomerListQuery): Promise<AdminCustomerListResponse> {
    const outletIds = await this.outletIdsForBusiness(businessId);

    const cursor = query.cursor === undefined ? null : decodeRowCursor(query.cursor);
    const where: Prisma.CustomerWhereInput = {
      AND: [
        { orders: { some: { outletId: { in: outletIds } } } },
        ...(query.q !== undefined
          ? [{ OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { phone: { contains: query.q } }] }]
          : []),
        ...(cursor !== null
          ? [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }]
          : []),
      ],
    };

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];

    // One query for every row's stats, instead of one aggregate per row.
    const stats = await this.customerStats(
      page.map((row) => row.id),
      outletIds,
    );

    return AdminCustomerListResponseSchema.parse({
      data: page.map((row): AdminCustomerListItem => {
        const rowStats = stats.get(row.id) ?? { count: 0, total: 0 };
        return {
          id: row.id,
          name: row.name,
          phoneMasked: maskPhone(row.phone),
          createdAt: row.createdAt.toISOString(),
          loyaltyPoints: row.loyaltyPoints,
          orderCount: rowStats.count,
          lifetimeValue: rowStats.total,
        };
      }),
      meta: rows.length > query.limit && last ? { nextCursor: encodeRowCursor(last.createdAt, last.id) } : {},
    });
  }

  async getCustomer(businessId: string, customerId: string, query: AdminCustomerDetailQuery): Promise<AdminCustomerDetailResponse> {
    const outletIds = await this.outletIdsForBusiness(businessId);

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", `Customer "${customerId}" not found.`);
    }

    const stats = await this.customerStats([customerId], outletIds);
    const { count, total } = stats.get(customerId) ?? { count: 0, total: 0 };

    const cursor = query.cursor === undefined ? null : decodeRowCursor(query.cursor);
    const rows = await this.prisma.order.findMany({
      where: {
        AND: [
          { customerId, outletId: { in: outletIds } },
          ...(cursor !== null
            ? [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }]
            : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: orderHistoryInclude,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];

    return AdminCustomerDetailResponseSchema.parse({
      customer: {
        id: customer.id,
        name: customer.name,
        phoneMasked: maskPhone(customer.phone),
        createdAt: customer.createdAt.toISOString(),
        loyaltyPoints: customer.loyaltyPoints,
      },
      orderCount: count,
      lifetimeValue: total,
      orderHistory: {
        data: page.map(toHistoryItem),
        meta: rows.length > query.limit && last ? { nextCursor: encodeRowCursor(last.createdAt, last.id) } : {},
      },
    });
  }

  /** One query, not N: `{ customerId -> { count, total } }` for every id given, over REAL orders only. */
  private async customerStats(customerIds: string[], outletIds: string[]): Promise<Map<string, { count: number; total: number }>> {
    const stats = new Map<string, { count: number; total: number }>();
    if (customerIds.length === 0) {
      return stats;
    }
    const orders = await this.prisma.order.findMany({
      where: { customerId: { in: customerIds }, outletId: { in: outletIds }, status: { notIn: LIFETIME_VALUE_EXCLUDED_STATUSES } },
      select: { customerId: true, total: true },
    });
    for (const order of orders) {
      if (order.customerId === null) {
        continue;
      }
      const row = stats.get(order.customerId) ?? { count: 0, total: 0 };
      row.count += 1;
      row.total += order.total.toNumber();
      stats.set(order.customerId, row);
    }
    return stats;
  }

  // -------------------------------------------------------------------------
  // Guest Orders by Phone
  // -------------------------------------------------------------------------

  /**
   * A phone appears here only once it has at least one REAL order (same
   * "hide the noise" reasoning as Orders' own list defaulting to hiding
   * `pending`) — an abandoned guest checkout that never got past `pending`,
   * or one that was cancelled, does not make someone a "guest customer".
   */
  async listGuestCustomers(businessId: string, query: AdminGuestCustomerListQuery): Promise<AdminGuestCustomerListResponse> {
    const outletIds = await this.outletIdsForBusiness(businessId);
    const offset = query.cursor === undefined ? 0 : decodeOffsetCursor(query.cursor);

    // NOT a true keyset cursor (see admin-customers.ts's doc comment on
    // AdminGuestCustomerListResponseSchema): this is a live GROUP BY over
    // `orders`, not an indexed row, so pagination is a plain offset encoded
    // inside the opaque cursor. A guest order landing between two page
    // fetches can shift a page boundary by one row — acceptable today given
    // how little guest volume exists; revisit if that changes.
    const groups = await this.prisma.order.groupBy({
      by: ["guestPhone"],
      where: {
        customerId: null,
        outletId: { in: outletIds },
        status: { notIn: LIFETIME_VALUE_EXCLUDED_STATUSES },
        ...(query.q !== undefined ? { guestPhone: { contains: query.q } } : {}),
      },
      _count: { _all: true },
      _sum: { total: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip: offset,
      take: query.limit + 1,
    });
    const page = groups.slice(0, query.limit);
    const hasMore = groups.length > query.limit;

    return AdminGuestCustomerListResponseSchema.parse({
      data: page.map((group): AdminGuestCustomerListItem => {
        const phone = group.guestPhone;
        // `customerId: null` plus `orders_identity_xor` guarantee a grouped
        // guest order always has a non-null guestPhone.
        if (phone === null) {
          throw new Error("unreachable: grouped guest order with a null guestPhone");
        }
        return {
          key: guestPhoneKey(phone),
          phoneMasked: maskPhone(phone),
          orderCount: group._count._all,
          lifetimeValue: group._sum.total?.toNumber() ?? 0,
          firstOrderAt: (group._min.createdAt ?? new Date(0)).toISOString(),
          lastOrderAt: (group._max.createdAt ?? new Date(0)).toISOString(),
        };
      }),
      meta: hasMore ? { nextCursor: encodeOffsetCursor(offset + query.limit) } : {},
    });
  }

  async getGuestCustomer(businessId: string, key: string, query: AdminGuestCustomerDetailQuery): Promise<AdminGuestCustomerDetailResponse> {
    const outletIds = await this.outletIdsForBusiness(businessId);

    const phone = await this.resolveGuestPhoneFromKey(key, outletIds);
    if (phone === null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "GUEST_CUSTOMER_NOT_FOUND", "No guest orders match this key.");
    }

    const summary = await this.prisma.order.aggregate({
      where: { customerId: null, guestPhone: phone, outletId: { in: outletIds }, status: { notIn: LIFETIME_VALUE_EXCLUDED_STATUSES } },
      _count: { _all: true },
      _sum: { total: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    const cursor = query.cursor === undefined ? null : decodeRowCursor(query.cursor);
    const rows = await this.prisma.order.findMany({
      where: {
        AND: [
          { customerId: null, guestPhone: phone, outletId: { in: outletIds } },
          ...(cursor !== null
            ? [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }]
            : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: orderHistoryInclude,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];

    return AdminGuestCustomerDetailResponseSchema.parse({
      key,
      phoneMasked: maskPhone(phone),
      orderCount: summary._count._all,
      lifetimeValue: summary._sum.total?.toNumber() ?? 0,
      firstOrderAt: (summary._min.createdAt ?? new Date(0)).toISOString(),
      lastOrderAt: (summary._max.createdAt ?? new Date(0)).toISOString(),
      orderHistory: {
        data: page.map(toHistoryItem),
        meta: rows.length > query.limit && last ? { nextCursor: encodeRowCursor(last.createdAt, last.id) } : {},
      },
    });
  }

  /**
   * There's no persisted key -> phone mapping (this view has no real entity
   * to store one on): scan the small set of distinct guest phones with at
   * least one real order at this business and match the hash in code. Fine
   * at today's volume; if guest volume grows large enough for this to
   * matter, the fix is a persisted, indexed hash column, not a bigger scan.
   */
  private async resolveGuestPhoneFromKey(key: string, outletIds: string[]): Promise<string | null> {
    const rows = await this.prisma.order.findMany({
      where: { customerId: null, outletId: { in: outletIds }, status: { notIn: LIFETIME_VALUE_EXCLUDED_STATUSES } },
      select: { guestPhone: true },
      distinct: ["guestPhone"],
    });
    for (const row of rows) {
      if (row.guestPhone !== null && guestPhoneKey(row.guestPhone) === key) {
        return row.guestPhone;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Shared
  // -------------------------------------------------------------------------

  private async outletIdsForBusiness(businessId: string): Promise<string[]> {
    const outlets = await this.prisma.outlet.findMany({ where: { businessId }, select: { id: true } });
    return outlets.map((outlet) => outlet.id);
  }
}

function toHistoryItem(row: OrderHistoryRow): AdminCustomerOrderHistoryItem {
  return {
    id: row.id,
    displayId: row.displayId,
    outlet: row.outlet,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    total: row.total.toNumber(),
    itemCount: row.orderItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/** A one-way, non-reversible-without-brute-force identifier for a guest phone — see the class doc comment. */
function guestPhoneKey(phone: string): string {
  return createHash("sha256").update(phone).digest("hex").slice(0, 32);
}

/** The opaque keyset cursor for a real, indexed (created_at, id) row — same shape as AdminOrdersService's. */
function encodeRowCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ c: createdAt.toISOString(), i: id }), "utf8").toString("base64url");
}

function decodeRowCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      const { c, i } = parsed as { c?: unknown; i?: unknown };
      if (typeof c === "string" && typeof i === "string" && i.length > 0) {
        const createdAt = new Date(c);
        if (!Number.isNaN(createdAt.getTime()) && createdAt.toISOString() === c) {
          return { createdAt, id: i };
        }
      }
    }
  } catch {
    // fall through to the 400 below
  }
  throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "The cursor is not valid; start again from the first page.");
}

/** The opaque cursor for the guest-orders-by-phone list's offset — see its own doc comment for why this one isn't a true keyset. */
function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

function decodeOffsetCursor(cursor: string): number {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      const { o } = parsed as { o?: unknown };
      if (typeof o === "number" && Number.isInteger(o) && o >= 0) {
        return o;
      }
    }
  } catch {
    // fall through to the 400 below
  }
  throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "The cursor is not valid; start again from the first page.");
}
