import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import type { PosQueueResponse } from "@hey-food/api-client";
import { PosQueueResponseSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { orderInclude, toOrderDto } from "../orders/order.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { PosDeviceKeyGuard } from "./pos-device-key.guard";

/**
 * POS Stage A: READ-ONLY. The write paths (status transitions, cancel) and
 * real staff/device auth are Stage B — until then this endpoint sits behind
 * the temporary shared-key guard (see PosDeviceKeyGuard).
 */
@Controller("pos")
@UseGuards(PosDeviceKeyGuard)
export class PosOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The outlet's live queue: paid orders that haven't been collected or
   * cancelled, oldest first. `pending` is excluded — an unpaid order is not
   * the kitchen's business yet.
   */
  @Get("outlets/:outletId/orders")
  async queue(@Param("outletId") outletId: string): Promise<PosQueueResponse> {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
    if (!outlet) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${outletId}" not found.`);
    }

    const orders = await this.prisma.order.findMany({
      where: { outletId, status: { in: ["paid", "received", "preparing", "ready"] } },
      orderBy: { createdAt: "asc" },
      include: orderInclude,
    });

    return PosQueueResponseSchema.parse({ data: orders.map(toOrderDto) });
  }
}
