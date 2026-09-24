import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type {
  AdminCancelOrderRequest,
  AdminOrderCustomer,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminOrderListResponse,
  AdminOrderNotification,
  AdminOrderPayment,
} from "@hey-food/api-client";
import {
  ADMIN_ORDER_DEFAULT_STATUSES,
  AdminOrderDetailSchema,
  AdminOrderListResponseSchema,
} from "@hey-food/api-client";
import type { Prisma } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { maskPhone } from "../notifications/phone-mask";
import { cancelOrder } from "../orders/order-cancel";
import { orderInclude, toOrderDto } from "../orders/order.mapper";
import { PrismaService } from "../prisma/prisma.service";

const listInclude = {
  outlet: { select: { id: true, name: true } },
  customer: { select: { phone: true } },
  payment: { select: { id: true } },
  orderItems: { select: { quantity: true } },
} satisfies Prisma.OrderInclude;

const detailInclude = {
  ...orderInclude,
  outlet: { select: { id: true, name: true } },
  customer: { select: { phone: true } },
  payment: { select: { provider: true, status: true, amount: true } },
  notificationLogs: { orderBy: [{ sentAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.OrderInclude;

/**
 * HQ Orders (dev spec Section 9.4): the all-outlets list, one order in full, and
 * HQ's cancel. Reached only through the TEMPORARY HQ admin key — anyone who can
 * open the HQ app can read every order here and cancel it (README banner).
 *
 * Personal data: a customer's full phone number is NEVER returned. Only a masked
 * form (`+6019***0142`) leaves this service, because the app in front of it has no
 * login.
 */
@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listOrders(query: AdminOrderListQuery): Promise<AdminOrderListResponse> {
    const business = await this.prisma.business.findUnique({ where: { id: query.businessId }, select: { id: true } });
    if (!business) {
      throw new ApiException(HttpStatus.NOT_FOUND, "BUSINESS_NOT_FOUND", `Business "${query.businessId}" not found.`);
    }
    if (query.outletId !== undefined) {
      const outlet = await this.prisma.outlet.findFirst({ where: { id: query.outletId, businessId: query.businessId }, select: { id: true } });
      if (!outlet) {
        throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${query.outletId}" not found.`);
      }
    }

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: query.businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const cursor = query.cursor === undefined ? null : decodeCursor(query.cursor);
    const where: Prisma.OrderWhereInput = {
      outlet: { businessId: query.businessId, ...(query.outletId !== undefined ? { id: query.outletId } : {}) },
      status: { in: query.status ?? ADMIN_ORDER_DEFAULT_STATUSES },
      ...(query.from !== undefined || query.to !== undefined
        ? {
            businessDate: {
              ...(query.from !== undefined ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
              ...(query.to !== undefined ? { lte: new Date(`${query.to}T00:00:00Z`) } : {}),
            },
          }
        : {}),
      // Prisma passes `startsWith` to ILIKE WITHOUT escaping % and _, so a search for "%"
      // would match every order. Escape them: the order number is matched literally.
      ...(query.q !== undefined ? { displayId: { startsWith: escapeLike(query.q), mode: "insensitive" } } : {}),
      ...(cursor !== null
        ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }
        : {}),
    };

    // One extra row tells us whether another page exists, without a COUNT(*).
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: listInclude,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];

    return AdminOrderListResponseSchema.parse({
      data: page.map(
        (row): AdminOrderListItem => ({
          id: row.id,
          displayId: row.displayId,
          outlet: row.outlet,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          businessDate: dateOnly(row.businessDate),
          total: row.total.toNumber(),
          itemCount: row.orderItems.reduce((sum, item) => sum + item.quantity, 0),
          customer: customerOf(row.customerId, row.customer?.phone ?? null, row.guestPhone),
          isStubPaid: row.paidAt !== null && row.payment === null,
          cancelReason: row.cancelReason,
          cancelSource: row.cancelSource,
        }),
      ),
      meta: rows.length > query.limit && last ? { nextCursor: encodeCursor(last.createdAt, last.id) } : {},
      outlets,
    });
  }

  async getOrder(orderId: string): Promise<AdminOrderDetail> {
    const row = await this.prisma.order.findUnique({ where: { id: orderId }, include: detailInclude });
    if (!row) {
      throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", `Order "${orderId}" not found.`);
    }

    const payment: AdminOrderPayment = row.payment
      ? { kind: "real", provider: row.payment.provider, status: row.payment.status, amount: row.payment.amount.toNumber() }
      : row.paidAt !== null
        ? { kind: "stub", provider: null, status: null, amount: null }
        : { kind: "none", provider: null, status: null, amount: null };

    return AdminOrderDetailSchema.parse({
      order: toOrderDto(row),
      outlet: row.outlet,
      businessDate: dateOnly(row.businessDate),
      customer: customerOf(row.customerId, row.customer?.phone ?? null, row.guestPhone),
      payment,
      cancelSource: row.cancelSource,
      notifications: row.notificationLogs.map(toNotification),
    });
  }

  /**
   * HQ cancel. The rules are the shared `cancelOrder` (identical to the POS's, so
   * they cannot drift); HQ adds only `cancel_source = hq` and, in the request
   * schema, a required description for "other". It does NOT refund, tell the
   * customer, or tell the kitchen: see the README pre-launch checklist.
   * `staffId: null` — `HqAdminKeyGuard` has no session identity to record.
   */
  async cancel(orderId: string, request: AdminCancelOrderRequest): Promise<AdminOrderDetail> {
    await cancelOrder(this.prisma, this.logger, orderId, {
      reason: request.reason,
      otherDetail: request.otherDetail,
      source: "hq",
      staffId: null,
    });
    return this.getOrder(orderId);
  }
}

/** Escapes backslash, % and _ so a LIKE pattern built from user input matches literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

function customerOf(customerId: string | null, appPhone: string | null, guestPhone: string | null): AdminOrderCustomer {
  const phone = customerId !== null ? appPhone : guestPhone;
  return { kind: customerId !== null ? "app" : "guest", phoneMasked: phone ? maskPhone(phone) : null };
}

/** A `@db.Date` column comes back as UTC midnight; its calendar date is the business date. */
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Reads a notification row's JSON payload defensively: its shape has varied (the seeded row is older). */
function toNotification(log: { id: string; channel: string; sentAt: Date; delivered: boolean; payload: Prisma.JsonValue }): AdminOrderNotification {
  const payload = typeof log.payload === "object" && log.payload !== null && !Array.isArray(log.payload) ? log.payload : {};
  const text = (value: unknown): string | null => (typeof value === "string" ? value : null);
  const flag = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
  return {
    id: log.id,
    channel: log.channel,
    sentAt: log.sentAt.toISOString(),
    delivered: log.delivered,
    event: text(payload.event),
    provider: text(payload.provider),
    stub: flag(payload.stub),
    accepted: flag(payload.accepted),
    error: text(payload.error),
  };
}

/** The opaque keyset cursor: the last row's (createdAt, id). */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ c: createdAt.toISOString(), i: id }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
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
