import { Body, Controller, Param, Patch, UseGuards } from "@nestjs/common";
import type { UpdateProductAvailabilityResponse } from "@hey-food/api-client";
import { UpdateProductAvailabilityRequestSchema } from "@hey-food/api-client";

import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { StaffSessionGuard } from "../staff/staff-session.guard";
import { PosMenuService } from "./pos-menu.service";

/**
 * Menu Availability's write path. Guarded by a real staff PIN session
 * (StaffSessionGuard); scoped to the session's own outlet regardless of what
 * `:outletId` in the URL claims (see the service).
 */
@Controller("pos")
@UseGuards(StaffSessionGuard)
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
    @CurrentStaffSession() session: StaffSessionContext,
  ): Promise<UpdateProductAvailabilityResponse> {
    const { isAvailable } = UpdateProductAvailabilityRequestSchema.parse(body);
    return this.posMenu.setAvailability(outletId, productId, isAvailable, session);
  }
}
