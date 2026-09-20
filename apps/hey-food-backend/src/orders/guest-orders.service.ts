import { createHash } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { CreateGuestOrderResponse, ParsedCreateGuestOrderRequest } from "@hey-food/api-client";
import { CreateGuestOrderResponseSchema } from "@hey-food/api-client";
import { Prisma } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { generateGuestToken, guestTokenMatches, hashGuestToken, parseBearerToken } from "./guest-token";
import { OrderCreationService } from "./order-creation.service";
import { orderInclude, toOrderDto, type OrderWithItemsRow } from "./order.mapper";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;

/** Guest-checkout concerns layered on the shared order-creation service. */
@Injectable()
export class GuestOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderCreation: OrderCreationService,
  ) {}

  async createGuestOrder(
    request: ParsedCreateGuestOrderRequest,
    idempotencyKey: string | undefined,
  ): Promise<CreateGuestOrderResponse> {
    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_IDEMPOTENCY_KEY",
        "Idempotency-Key must be 16-100 characters of letters, digits, '-' or '_' (a UUID is ideal).",
      );
    }

    const guestToken = generateGuestToken();
    const guestTokenHash = hashGuestToken(guestToken);

    // Hash of the parsed request: the same key must always mean the same
    // request. (Parsed, not raw, so key order / phone formatting differences
    // in the client's JSON don't matter.)
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");

    if (idempotencyKey !== undefined) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: orderInclude,
      });
      if (existing) {
        return this.replay(existing, fingerprint, guestToken, guestTokenHash);
      }
    }

    let order: OrderWithItemsRow;
    try {
      order = await this.orderCreation.createOrder({
        outletId: request.outletId,
        items: request.items,
        identity: { kind: "guest", guestPhone: request.guestPhone, guestTokenHash },
        idempotency: idempotencyKey === undefined ? undefined : { key: idempotencyKey, fingerprint },
      });
    } catch (error) {
      // Two identical requests raced past the lookup above: the loser hits the
      // unique index. Treat it as the replay it is.
      if (
        idempotencyKey !== undefined &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.order.findUnique({
          where: { idempotencyKey },
          include: orderInclude,
        });
        if (existing) {
          return this.replay(existing, fingerprint, guestToken, guestTokenHash);
        }
      }
      throw error;
    }

    return CreateGuestOrderResponseSchema.parse({ ...toOrderDto(order), guestToken });
  }

  /**
   * Same key + same request: hand back the existing order. The original token
   * can't be re-issued (only its hash exists), and a client retrying after a
   * lost response never received it — so the token is ROTATED: the new one is
   * returned and the old one stops working. Knowing the key (a random value
   * only the original client holds) is the proof of ownership for this.
   */
  private async replay(
    existing: OrderWithItemsRow,
    fingerprint: string,
    guestToken: string,
    guestTokenHash: string,
  ): Promise<CreateGuestOrderResponse> {
    if (existing.guestTokenHash === null || existing.idempotencyFingerprint !== fingerprint) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "IDEMPOTENCY_KEY_REUSED",
        "This Idempotency-Key was already used for a different request.",
      );
    }

    const rotated = await this.prisma.order.update({
      where: { id: existing.id },
      data: { guestTokenHash },
      include: orderInclude,
    });
    return CreateGuestOrderResponseSchema.parse({ ...toOrderDto(rotated), guestToken });
  }

  /**
   * Loads an order for a guest presenting `Authorization: Bearer <token>`.
   * No header -> 401 (the caller forgot to authenticate). A wrong token and
   * a nonexistent order are BOTH the same 404, so order IDs can't be probed
   * to find out which exist.
   */
  async authorizeGuest(orderId: string, authorization: string | undefined): Promise<OrderWithItemsRow> {
    const token = parseBearerToken(authorization);
    if (token === null) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "GUEST_TOKEN_REQUIRED",
        "Send the order's guest token as 'Authorization: Bearer <token>'.",
      );
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!order || !guestTokenMatches(token, order.guestTokenHash)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", `Order "${orderId}" not found.`);
    }
    return order;
  }
}
