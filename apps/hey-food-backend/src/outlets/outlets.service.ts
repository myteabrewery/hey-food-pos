import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  NearbyOutletsQuery,
  NearbyOutletsResponse,
  OutletDetailResponse,
} from "@hey-food/api-client";
import { NearbyOutletSchema, NearbyOutletsResponseSchema, OutletDetailResponseSchema, ResolvedMenuItemSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { haversineDistanceMeters } from "../common/haversine";
import { resolveOutletPricing } from "../menu/outlet-pricing";
import { PrismaService } from "../prisma/prisma.service";
import { toOutletDto } from "./outlet.mapper";

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(query: NearbyOutletsQuery): Promise<NearbyOutletsResponse> {
    const outlets = await this.prisma.outlet.findMany();

    // "Within range" (dev spec Section 2) is read as: inside that specific
    // outlet's own geofence, not some fixed/global radius — closed outlets
    // are still included (the customer app renders them disabled rather
    // than hiding them, per the existing OutletCard treatment), so status
    // is deliberately not filtered on here.
    const nearby = outlets
      .map((outlet) => ({
        outlet,
        distanceM: haversineDistanceMeters(query.lat, query.lng, outlet.lat, outlet.lng),
      }))
      .filter(({ outlet, distanceM }) => distanceM <= outlet.geofenceRadiusM)
      .sort((a, b) => a.distanceM - b.distanceM);

    const data = nearby.map(({ outlet, distanceM }) =>
      NearbyOutletSchema.parse({
        ...toOutletDto(outlet),
        // Sub-meter GPS precision isn't meaningful; round for a clean value.
        distanceM: Math.round(distanceM),
      }),
    );

    return NearbyOutletsResponseSchema.parse({ data });
  }

  async findDetail(outletId: string): Promise<OutletDetailResponse> {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        "OUTLET_NOT_FOUND",
        `Outlet "${outletId}" not found.`,
      );
    }

    const [products, overrides] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId: outlet.businessId },
        include: {
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      }),
      this.prisma.outletProductOverride.findMany({ where: { outletId: outlet.id } }),
    ]);

    const overrideByProductId = new Map(overrides.map((override) => [override.productId, override]));

    const menu = products.map((product) => {
      const { price, isAvailable } = resolveOutletPricing(product, overrideByProductId.get(product.id));

      return ResolvedMenuItemSchema.parse({
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        category: product.category,
        // Master price + outlet override / availability: resolved by
        // resolveOutletPricing, the same rule order creation charges by.
        price: price.toNumber(),
        isAvailable,
        // docs/product-customization-v2.md — modifier groups/options are
        // product-wide (not outlet-scoped, unlike price/availability), so
        // no override merging applies here, just a straight passthrough.
        modifierGroups: product.modifierGroups.map((group) => ({
          id: group.id,
          productId: group.productId,
          name: group.name,
          selectionType: group.selectionType,
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
          sortOrder: group.sortOrder,
          options: group.options.map((option) => ({
            id: option.id,
            groupId: option.groupId,
            name: option.name,
            priceDelta: option.priceDelta.toNumber(),
            quantityEnabled: option.quantityEnabled,
            sortOrder: option.sortOrder,
            imageUrl: option.imageUrl,
          })),
        })),
      });
    });

    return OutletDetailResponseSchema.parse({
      outlet: toOutletDto(outlet),
      menu,
    });
  }
}
