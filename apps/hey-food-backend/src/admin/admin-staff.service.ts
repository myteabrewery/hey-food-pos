import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AdminStaffDetailResponse,
  AdminStaffListResponse,
  CreateStaffResponse,
  ParsedCreateStaffRequest,
  ParsedUpdateStaffRequest,
  ResetStaffPasswordResponse,
  ResetStaffPinResponse,
  SetStaffActiveResponse,
  UpdateStaffResponse,
} from "@hey-food/api-client";
import {
  AdminStaffDetailResponseSchema,
  AdminStaffListResponseSchema,
  checkStaffOutletAssignment,
  CreateStaffResponseSchema,
  needsHqPassword,
  ResetStaffPasswordResponseSchema,
  ResetStaffPinResponseSchema,
  SetStaffActiveResponseSchema,
  UpdateStaffResponseSchema,
} from "@hey-food/api-client";
import type { StaffUser } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword } from "../staff/password-hash";
import { hashPin, verifyPin } from "../staff/pin-hash";
import { toPublicStaffDto } from "../staff/staff.mapper";

/**
 * HQ Staff (dev spec 6/9.4, blueprint Section 13): CRUD on StaffUser, PIN/
 * password reset, and deactivate/reactivate. Guarded by `HqAdminSessionGuard`
 * (`POST /auth/hq/login`), replacing the `HQ_ADMIN_KEY` shared-secret
 * stand-in outright — see the CRITICAL banner in README.md for what remains.
 * Every method here takes `businessId` from the CALLING SESSION (the
 * controller's job), never from the request body/query.
 *
 * This is the screen writing `pinHash`/`passwordHash` — real POS login
 * (pos-auth.service.ts) and real HQ login (hq-auth.service.ts) each check
 * theirs for real, so creating/resetting either here has immediate effect on
 * what each accepts. Deactivating a staff member here also immediately
 * invalidates any of their live sessions, POS or HQ (re-checked on every
 * request, not just at login).
 *
 * Rules that hold throughout:
 *  - `pinHash`/`passwordHash` are never computed from, or exposed as, the raw
 *    credential outside `create`/`reset-pin`/`reset-password`, and every
 *    response uses the PUBLIC shape (neither field at all) — same discipline
 *    as the guest token;
 *  - the role/outlet-assignment invariant (`checkStaffOutletAssignment`,
 *    shared with the request schema) is re-checked here against the MERGED
 *    values whenever only one of the two changes, and is backed by a database
 *    CHECK constraint as a backstop;
 *  - a password is required for `hq_admin`/`area_manager`, forbidden for
 *    `outlet_staff` (`needsHqPassword`) — unlike PIN, not necessarily set at
 *    creation (a role promoted INTO needing one gets it via reset-password);
 *    demoting AWAY from needing one clears any existing hash rather than
 *    leaving a stale, structurally-unusable credential behind;
 *  - deactivating the business's LAST active hq_admin is refused, so HQ can
 *    never lock itself out of its own staff screen;
 *  - no delete: a departed staff member is deactivated, never removed;
 *  - every staff row is looked up WITHIN the calling session's own business —
 *    a staff id from another business is 404, never silently reachable.
 */
@Injectable()
export class AdminStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async listStaff(businessId: string): Promise<AdminStaffListResponse> {
    const [staff, outlets] = await Promise.all([
      this.prisma.staffUser.findMany({ where: { businessId }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
      this.prisma.outlet.findMany({ where: { businessId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return AdminStaffListResponseSchema.parse({ data: staff.map(toPublicStaffDto), outlets });
  }

  async getStaff(businessId: string, staffId: string): Promise<AdminStaffDetailResponse> {
    const staff = await this.requireStaff(businessId, staffId);
    const outlets = await this.prisma.outlet.findMany({ where: { businessId: staff.businessId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    return AdminStaffDetailResponseSchema.parse({ staff: toPublicStaffDto(staff), outlets });
  }

  async createStaff(businessId: string, body: ParsedCreateStaffRequest): Promise<CreateStaffResponse> {
    await this.requireOutletsInBusiness(businessId, body.assignedOutletIds);
    await this.requireUniquePhone(businessId, body.phone, null);
    await this.requireUniquePin(businessId, body.pin, null);

    const now = new Date();
    const created = await this.prisma.staffUser.create({
      data: {
        businessId,
        name: body.name,
        phone: body.phone,
        role: body.role,
        assignedOutletIds: body.assignedOutletIds,
        pinHash: hashPin(body.pin),
        pinChangedAt: now,
        // The request schema already requires `password` exactly when
        // needsHqPassword(role) — `body.password` is defined here iff it does.
        passwordHash: body.password !== undefined ? hashPassword(body.password) : null,
        passwordChangedAt: body.password !== undefined ? now : null,
        isActive: true,
      },
    });
    return CreateStaffResponseSchema.parse(toPublicStaffDto(created));
  }

  async updateStaff(businessId: string, staffId: string, patch: ParsedUpdateStaffRequest): Promise<UpdateStaffResponse> {
    const staff = await this.requireStaff(businessId, staffId);

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

    // A role change that no longer needs an HQ password clears it outright
    // (outlet_staff can never log into HQ, so a lingering hash would be
    // structurally unusable, not just unused — tidier to remove it). A role
    // change INTO needing one does NOT auto-set it: that's reset-password's
    // job, same as a fresh promotion needs no immediate PIN either.
    const clearsPassword = patch.role !== undefined && !needsHqPassword(patch.role) && needsHqPassword(staff.role);

    const data = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.assignedOutletIds !== undefined ? { assignedOutletIds: patch.assignedOutletIds } : {}),
      ...(clearsPassword ? { passwordHash: null, passwordChangedAt: null } : {}),
    };
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data });
    return UpdateStaffResponseSchema.parse(toPublicStaffDto(updated));
  }

  async resetPin(businessId: string, staffId: string, pin: string): Promise<ResetStaffPinResponse> {
    const staff = await this.requireStaff(businessId, staffId);
    await this.requireUniquePin(staff.businessId, pin, staff.id);

    const updated = await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { pinHash: hashPin(pin), pinChangedAt: new Date() },
    });
    return ResetStaffPinResponseSchema.parse(toPublicStaffDto(updated));
  }

  /** Also how a staff member freshly promoted into hq_admin/area_manager gets their FIRST password — same action either way. Rejects an outlet_staff target outright: they can never log into HQ. */
  async resetPassword(businessId: string, staffId: string, password: string): Promise<ResetStaffPasswordResponse> {
    const staff = await this.requireStaff(businessId, staffId);
    if (!needsHqPassword(staff.role)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "STAFF_ROLE_HAS_NO_HQ_PASSWORD", "Outlet Staff never log into HQ — there is no password to set.");
    }

    const updated = await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { passwordHash: hashPassword(password), passwordChangedAt: new Date() },
    });
    return ResetStaffPasswordResponseSchema.parse(toPublicStaffDto(updated));
  }

  async deactivate(businessId: string, staffId: string): Promise<SetStaffActiveResponse> {
    const staff = await this.requireStaff(businessId, staffId);
    if (!staff.isActive) {
      return SetStaffActiveResponseSchema.parse(toPublicStaffDto(staff)); // already deactivated: silent no-op
    }
    if (staff.role === "hq_admin") {
      await this.requireNotLastActiveHqAdmin(staff.businessId, staff.id);
    }
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data: { isActive: false } });
    return SetStaffActiveResponseSchema.parse(toPublicStaffDto(updated));
  }

  async reactivate(businessId: string, staffId: string): Promise<SetStaffActiveResponse> {
    const staff = await this.requireStaff(businessId, staffId);
    if (staff.isActive) {
      return SetStaffActiveResponseSchema.parse(toPublicStaffDto(staff)); // already active: silent no-op
    }
    const updated = await this.prisma.staffUser.update({ where: { id: staff.id }, data: { isActive: true } });
    return SetStaffActiveResponseSchema.parse(toPublicStaffDto(updated));
  }

  /** A staff id from another business is 404 — hidden, not merely forbidden, same framing as a cross-outlet POS lookup. */
  private async requireStaff(businessId: string, staffId: string): Promise<StaffUser> {
    const staff = await this.prisma.staffUser.findFirst({ where: { id: staffId, businessId } });
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
