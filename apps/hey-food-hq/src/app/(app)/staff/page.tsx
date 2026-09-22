import Link from "next/link";
import type { ReactElement } from "react";

import type { AdminStaffListResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { AdminApiError, listStaff } from "@/lib/admin-api";
import { ROLE_LABELS } from "@/lib/staff-format";

// Live data: never serve a cached list.
export const dynamic = "force-dynamic";

/**
 * Staff (dev spec Section 6/9.4 "Staff (accounts, role, outlet assignment)",
 * blueprint Section 13's three-role hierarchy): every staff member for the
 * business, their role, and which outlet(s) they're assigned to.
 *
 * REAL DATA from the backend's /admin/staff, reached from this page's server
 * with the temporary HQ admin key (never the browser). This app has NO LOGIN
 * (banner) — and this screen is the first one that writes real credentials
 * (a PIN) nothing currently checks; see the detail page for that note.
 */
export default async function StaffPage(): Promise<ReactElement> {
  let result: AdminStaffListResponse | null = null;
  let failure: string | null = null;
  try {
    result = await listStaff();
  } catch (caught) {
    failure = caught instanceof AdminApiError ? caught.message : "Couldn't load staff.";
  }
  const outletName = new Map((result?.outlets ?? []).map((outlet) => [outlet.id, outlet.name]));
  const staff = result?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-hq-display font-bold text-brand-ink">Staff</h1>
        <Link href="/staff/new" className="flex min-h-11 items-center rounded-md bg-brand-teal px-5 text-hq-body font-semibold text-brand-white hover:bg-brand-tealDark">
          New staff member
        </Link>
      </div>
      <p className="mt-1 text-hq-body text-brand-muted">
        Accounts, role and outlet assignment. Deactivating an account keeps its record but blocks login once real PIN login exists — nothing checks a PIN today.
      </p>

      {failure !== null ? (
        <BackendError title="Couldn't load staff" message={failure} />
      ) : staff.length === 0 ? (
        <p className="mt-6 text-hq-body text-brand-muted">No staff yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          <div className="flex items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
            <span className="flex-1">NAME</span>
            <span className="w-32">ROLE</span>
            <span className="w-48">OUTLET(S)</span>
            <span className="w-24">STATUS</span>
          </div>
          <ul data-testid="staff-list">
            {staff.map((member, index) => (
              <li key={member.id} className={index < staff.length - 1 ? "border-b border-brand-line" : ""}>
                <Link href={`/staff/${encodeURIComponent(member.id)}`} className="flex items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft" data-testid={`staff-${member.id}`}>
                  <span className="flex-1">
                    <span className="block font-semibold text-brand-ink">{member.name}</span>
                    <span className="block text-hq-caption text-brand-muted">{member.phone}</span>
                  </span>
                  <span className="w-32 text-brand-ink">{ROLE_LABELS[member.role]}</span>
                  <span className="w-48 text-hq-caption text-brand-muted">
                    {member.assignedOutletIds.length === 0 ? "All outlets" : member.assignedOutletIds.map((id) => outletName.get(id) ?? id).join(", ")}
                  </span>
                  <span className="w-24">
                    {member.isActive ? (
                      <span className="inline-flex rounded-pill bg-brand-soft px-2 py-0.5 text-hq-caption font-bold text-brand-teal">Active</span>
                    ) : (
                      <span className="inline-flex rounded-pill bg-danger-tint px-2 py-0.5 text-hq-caption font-bold text-danger-solid">Deactivated</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
