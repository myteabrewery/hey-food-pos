import type { Outlet as PrismaOutlet } from "@prisma/client";

/**
 * Prisma's row shape isn't quite api-client's `OutletSchema` shape yet
 * (`createdAt` is a `Date`, not an ISO string; `operatingHours` is untyped
 * `Json`) — this bridges that gap. The caller is expected to feed the
 * result into `OutletSchema.parse()` (or a schema built on top of it),
 * which is what actually validates/narrows `operatingHours` back into
 * `OperatingHours` at runtime.
 */
export function toOutletDto(outlet: PrismaOutlet) {
  return {
    id: outlet.id,
    businessId: outlet.businessId,
    name: outlet.name,
    address: outlet.address,
    lat: outlet.lat,
    lng: outlet.lng,
    geofenceRadiusM: outlet.geofenceRadiusM,
    operatingHours: outlet.operatingHours,
    status: outlet.status,
    createdAt: outlet.createdAt.toISOString(),
  };
}
