import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AdminStaffDetailResponse,
  AdminStaffListResponse,
  CreateStaffResponse,
  ParsedCreateStaffRequest,
  ParsedUpdateStaffRequest,
  ResetStaffPinResponse,
  SetStaffActiveResponse,
  UpdateStaffResponse,
} from "@hey-food/api-client";
import {
  AdminStaffDetailResponseSchema,
  AdminStaffListResponseSchema,
  checkStaffOutletAssignment,
  CreateStaffResponseSchema,
  ResetStaffPinResponseSchema,
  SetStaffActiveResponseSchema,
  UpdateStaffResponseSchema,
} from "@hey-food/api-client";
import type { StaffUser } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { hashPin, verifyPin } from "../staff/pin-hash";
import { toPublicStaffDto } from "../staff/staff.mapper";

/**
 * HQ Staff (dev spec 6/9.4, blueprint Section 13): CRUD on StaffUser, PIN
 * reset, and deactivate/reactivate. ALL of it sits behind the TEMPORARY shared
 * HQ admin key (see HqAdminKeyGuard) — see the CRITICAL banner in README.md.
 *
 * This is the screen writing `pinHash` — real POS login (pos-auth.service.ts,
 * dev spec 5.5) now checks it, so creating/resetting a staff member's PIN
 * here has immediate, real effect on what the POS accepts. Deactivating a
 * staff member here also immediately invalidates any of their live POS
 * sessions (re-checked on every request, not just at login).
 *
 * Rules that hold throughout:
 *  - `pinHash` is never computed from, or exposed as, the raw PIN outside
 *    `create` and `reset-pin`, and every response uses the PUBLIC shape
 *    (no `pinHash` field at all) — same discipline as the guest token;
 *  - the role/outlet-assignment invariant (`checkStaffOutletAssignment`,
 *    shared with the request schema) is re-checked here against the MERGED
 *    values whenever only one of the two changes, and is backed by a database
 *    CHECK constraint as a backstop;
 *  - deactivating the business's LAST active hq_admin is refused, so HQ can
 *    never lock itself out of its own staff screen;
 *  - no delete: a departed staff member is deactivated, never removed.
 */
@Injectable()
export class AdminStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async listStaff(businessId: string): Promise<AdminStaffListResponse> {
    await this.requireBusiness(businessId);
    const [staff, outlets] = await Promise.all([
      this.prisma.staffUser.findMany({ where: { businessId }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
      this.prisma.outlet.findMany({ where: { businessId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return AdminStaffListResponseSchema.parse({ data: staff.map(toPublicStaffDto), outlets });
  }

  async getStaff(staffId: string): Promise<AdminStaffDetailResponse> {
    const staff = await this.requireStaff(staffId);
    const outlets = await this.prisma.outlet.findMany({ where: { businessId: staff.businessId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    return AdminStaffDetailResponseSchema.parse({ staff: toPublicStaffDto(staff), outlets });
  }

  async createStaff(body: ParsedCreateStaffRequest): Promise<CreateStaffResponse> {
    await this.requireBusiness(body.businessId);
    await this.requireOutletsInBusiness(body.businessId, body.assignedOutletIds);
    await this.requireUniquePhone(body.businessId, body.phone, null);
    await this.requireUniquePin(body.businessId, body.pin, null);

    const now = new Date();
    const created = await this.prisma.staffUser.create({
      data: {
        businessId: body.businessId,
        name: body.name,
        phone: body.phone,
        role: body.role,
        assignedOutletIds: body.assignedOutletIds,
        pinHash: hashPin(body.pin),
        pinChangedAt: now,
        isActive: true,
      },
    });
    return CreateStaffResponseSchema.parse(toPublicStaffDto(created));
  }

  async updateStaff(staffId: string, patch: ParsedUpdateStaffRequest): Promise<UpdateStaffResponse> {
    const staff = await this.requireStaff(staffId);

    const nextRole = patch.role ?? staff.role;
    const nextOutlets = patch.assignedOutletIds ?? staff.assignedOutletIds;
    if (patch.role !== undefined || patch.assignedOutletIds !== undefined) {
      const problem = checkStaffOutletAssignment(nextRole, nextOutlets);
      if (problem) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OUTLET_ASSIGNMENT", problem);
      }
    }
    if (patch.assignedOutletIds !== undefined) {
      await this.requireOutletsInBusiness(staff.businessId, patch.assignedOutletIds);
    }
    if (patch.phone !== undefined && patch.phone !== staff.phone) {
      await this.requireUniquePhone(staff.businessId, patch.phone, staff.id);
    }
    // Demoting the business's last active hq_admin away from the role would
    // have the same lockout effect as deactivating them — same guard.
    if (patch.role !== undefined && patch.role !== "hq_admin" && staff.role === "hq_admin" && staff.isActive) {
      await this.requireNotLastActiveHqAdmin(staff.businessId, staff.id);
    }

    const data = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.assignedOutletIds !== undefined ? { assignedOutletIds: patch.assignedOutletIds } : {}),
    };
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data });
    return UpdateStaffResponseSchema.parse(toPublicStaffDto(updated));
  }

  async resetPin(staffId: string, pin: string): Promise<ResetStaffPinResponse> {
    const staff = await this.requireStaff(staffId);
    await this.requireUniquePin(staff.businessId, pin, staff.id);

    const updated = await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { pinHash: hashPin(pin), pinChangedAt: new Date() },
    });
    return ResetStaffPinResponseSchema.parse(toPublicStaffDto(updated));
  }

  async deactivate(staffId: string): Promise<SetStaffActiveResponse> {
    const staff = await this.requireStaff(staffId);
    if (!staff.isActive) {
      return SetStaffActiveResponseSchema.parse(toPublicStaffDto(staff)); // already deactivated: silent no-op
    }
    if (staff.role === "hq_admin") {
      await this.requireNotLastActiveHqAdmin(staff.businessId, staff.id);
    }
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data: { isActive: false } });
    return SetStaffActiveResponseSchema.parse(toPublicStaffDto(updated));
  }

  async reactivate(staffId: string): Promise<SetStaffActiveResponse> {
    const staff = await this.requireStaff(staffId);
    if (staff.isActive) {
      return SetStaffActiveResponseSchema.parse(toPublicStaffDto(staff)); // already active: silent no-op
    }
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data: { isActive: true } });
    return SetStaffActiveResponseSchema.parse(toPublicStaffDto(updated));
  }

  private async requireBusiness(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
    if (!business) {
      throw new ApiException(HttpStatus.NOT_FOUND, "BUSINESS_NOT_FOUND", `Business "${businessId}" not found.`);
    }
  }

  private async requireStaff(staffId: string): Promise<StaffUser> {
    const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new ApiException(HttpStatus.NOT_FOUND, "STAFF_NOT_FOUND", `Staff member "${staffId}" not found.`);
    }
    return staff;
  }

  /** Every assigned outlet must exist and belong to THIS business (an outlet id from another business is a 404, not silently accepted). */
  private async requireOutletsInBusiness(businessId: string, outletIds: string[]): Promise<void> {
    if (outletIds.length === 0) return;
    const found = await this.prisma.outlet.findMany({ where: { id: { in: outletIds }, businessId }, select: { id: true } });
    const foundIds = new Set(found.map((outlet) => outlet.id));
    const missing = outletIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${missing[0]}" not found.`);
    }
  }

  /**
   * No two staff in a business share a phone number (compared exactly — phone
   * inputs are already normalized to E.164 by the request schema). Checked in
   * the application, not by a DB constraint, so it is not race-proof — same
   * caveat as the product-name check this mirrors.
   */
  private async requireUniquePhone(businessId: string, phone: string, exceptStaffId: string | null): Promise<void> {
    const clash = await this.prisma.staffUser.findFirst({
      where: { businessId, phone, ...(exceptStaffId ? { id: { not: exceptStaffId } } : {}) },
      select: { id: true },
    });
    if (clash) {
      throw new ApiException(HttpStatus.CONFLICT, "STAFF_PHONE_TAKEN", `A staff member with phone ${phone} already exists.`);
    }
  }

  /**
   * No two staff in a business (active or not — a deactivated account's old PIN
   * isn't freed for reuse) share a PIN: `POST /auth/staff/login` (unbuilt) takes
   * only `pin` + `deviceId`, no name, so a collision would make a future login
   * unable to tell two staff apart. Re-hashes the candidate PIN against every
   * existing staff member's stored salt and compares — O(n) scrypt calls, one
   * per staff member in the business, fine for a small business and worth
   * revisiting long before it isn't. Excludes `exceptStaffId` so resetting a PIN
   * to the value it already has is not treated as a collision with itself.
   */
  private async requireUniquePin(businessId: string, pin: string, exceptStaffId: string | null): Promise<void> {
    const others = await this.prisma.staffUser.findMany({
      where: { businessId, ...(exceptStaffId ? { id: { not: exceptStaffId } } : {}) },
      select: { pinHash: true },
    });
    if (others.some((row) => verifyPin(pin, row.pinHash))) {
      throw new ApiException(HttpStatus.CONFLICT, "STAFF_PIN_TAKEN", "That PIN is already in use by someone else at this business. Choose a different one.");
    }
  }

  /** Refuses an action that would leave the business with zero active hq_admin staff. */
  private async requireNotLastActiveHqAdmin(businessId: string, excludingStaffId: string): Promise<void> {
    const remaining = await this.prisma.staffUser.count({
      where: { businessId, role: "hq_admin", isActive: true, id: { not: excludingStaffId } },
    });
    if (remaining === 0) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "LAST_HQ_ADMIN",
        "This is the only active HQ Admin at this business. Make someone else an active HQ Admin first.",
      );
    }
  }
}
