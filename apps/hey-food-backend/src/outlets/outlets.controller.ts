import { Controller, Get, Param, Query } from "@nestjs/common";
import type { NearbyOutletsResponse, OutletDetailResponse } from "@hey-food/api-client";
import { NearbyOutletsQuerySchema } from "@hey-food/api-client";

import { OutletsService } from "./outlets.service";

@Controller("outlets")
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get("nearby")
  async nearby(
    @Query("lat") latRaw: string,
    @Query("lng") lngRaw: string,
  ): Promise<NearbyOutletsResponse> {
    // Query params always arrive as strings; coerce before validating
    // against the schema's real (numeric) shape, per api-client being the
    // source of truth for both request and response validation here.
    const query = NearbyOutletsQuerySchema.parse({
      lat: Number(latRaw),
      lng: Number(lngRaw),
    });

    return this.outletsService.findNearby(query);
  }

  @Get(":id")
  async detail(@Param("id") id: string): Promise<OutletDetailResponse> {
    return this.outletsService.findDetail(id);
  }
}
