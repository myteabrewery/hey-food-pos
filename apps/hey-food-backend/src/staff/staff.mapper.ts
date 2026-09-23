import type { PublicStaffUser } from "@hey-food/api-client";
import type { StaffUser } from "@prisma/client";

/**
 * Prisma row -> the PUBLIC staff shape (never `pinHash`). Shared by admin-staff.service.ts
 * and pos-auth.service.ts so there is exactly one place this mapping happens.
 */
export function toPublicStaffDto(staff: StaffUser): PublicStaffUser {
  return {
    id: staff.id,
    businessId: staff.businessId,
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    assignedOutletIds: staff.assignedOutletIds,
    pinChangedAt: staff.pinChangedAt.toISOString(),
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
  };
}
