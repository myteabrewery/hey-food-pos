import { Body, Controller, Param, Patch, UseGuards } from "@nestjs/common";
import type { UpdateProductAvailabilityResponse } from "@hey-food/api-client";
import { UpdateProductAvailabilityRequestSchema } from "@hey-food/api-client";

import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosMenuService } from "./pos-menu.service";

/**
 * Menu Availability's write path. Behind the same TEMPORARY shared device key
 * as the other POS endpoints (see PosDeviceKeyGuard), with the same
 * consequences: the key is not outlet-bound and the outlet is just a path
 * segment, so anyone holding it can mark ANY outlet's products sold out — not
 * only the outlet the tablet is bound to — and nothing records who did.
 */
@Controller("pos")
@UseGuards(PosDeviceKeyGuard)
export class PosMenuController {
  constructor(private readonly posMenu: PosMenuService) {}

  /**
   * Body: `{ isAvailable: boolean }` and nothing else — the schema is strict,
   * so a `priceOverride` (or any unknown key) is a 400, not silently ignored.
   * `isAvailable` is the desired state, not a flip.
   */
  @Patch("outlets/:outletId/products/:productId/availability")
  async setAvailability(
    @Param("outletId") outletId: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ): Promise<UpdateProductAvailabilityResponse> {
    const { isAvailable } = UpdateProductAvailabilityRequestSchema.parse(body);
    return this.posMenu.setAvailability(outletId, productId, isAvailable);
  }
}
