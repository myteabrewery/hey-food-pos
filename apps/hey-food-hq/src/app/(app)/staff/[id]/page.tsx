import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { needsHqPassword, type AdminStaffDetailResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";
import { ResetPinPanel } from "@/components/ResetPinPanel";
import { StaffActiveToggle } from "@/components/StaffActiveToggle";
import { StaffForm } from "@/components/StaffForm";
import { AdminApiError, getStaff } from "@/lib/admin-api";
import { formatStaffTime, ROLE_LABELS } from "@/lib/staff-format";

export const dynamic = "force-dynamic";

/**
 * Staff Detail: edit account fields, reset the PIN, reset the HQ password
 * (hq_admin/area_manager only), and deactivate/reactivate. Separate actions
 * on purpose — a routine rename should never accidentally also change
 * someone's credentials or lock them out.
 */
export default async function StaffDetailPage({ params }: { params: { id: string } }): Promise<ReactElement> {
  let detail: AdminStaffDetailResponse;
  try {
    detail = await getStaff(params.id);
  } catch (caught) {
    if (caught instanceof AdminApiError && caught.status === 404) notFound();
    return (
      <div className="mx-auto max-w-2xl px-8 py-6">
        <Link href="/staff" className="text-hq-body text-brand-teal">
          ← Back to staff
        </Link>
        <BackendError title="Couldn't load this staff member" message={caught instanceof AdminApiError ? caught.message : "Couldn't load this staff member."} />
      </div>
    );
  }

  const { staff, outlets } = detail;

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <Link href="/staff" className="text-hq-body text-brand-teal">
        ← Back to staff
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-hq-display font-bold text-brand-ink">{staff.name}</h1>
        {staff.isActive ? (
          <span className="rounded-pill bg-brand-soft px-2 py-0.5 text-hq-caption font-bold text-brand-teal">Active</span>
        ) : (
          <span className="rounded-pill bg-danger-tint px-2 py-0.5 text-hq-caption font-bold text-danger-solid" data-testid="deactivated-badge">
            Deactivated
          </span>
        )}
      </div>
      <p className="mt-1 text-hq-body text-brand-muted">
        {ROLE_LABELS[staff.role]} · added {formatStaffTime(staff.createdAt)} · PIN last changed {formatStaffTime(staff.pinChangedAt)}
      </p>

      <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">Account details</h2>
        <div className="mt-4">
          <StaffForm
            mode="edit"
            staffId={staff.id}
            outlets={outlets}
            initial={{ name: staff.name, phone: staff.phone, role: staff.role, assignedOutletIds: staff.assignedOutletIds }}
          />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">PIN</h2>
        <p className="mt-1 text-hq-caption text-brand-muted">
          What this person logs into POS with. Last changed {formatStaffTime(staff.pinChangedAt)}.
        </p>
        <div className="mt-3">
          <ResetPinPanel staffId={staff.id} />
        </div>
      </section>

      {needsHqPassword(staff.role) && (
        <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
          <h2 className="text-hq-heading font-bold text-brand-ink">HQ password</h2>
          <p className="mt-1 text-hq-caption text-brand-muted">
            What this person logs into HQ with.{" "}
            {staff.passwordChangedAt ? `Last changed ${formatStaffTime(staff.passwordChangedAt)}.` : "Not set yet — this person cannot log into HQ until it is."}
          </p>
          <div className="mt-3">
            <ResetPasswordPanel staffId={staff.id} />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <h2 className="text-hq-heading font-bold text-brand-ink">Account status</h2>
        <p className="mt-1 text-hq-caption text-brand-muted">
          {staff.isActive
            ? "Deactivating keeps this record but blocks login immediately — to POS and HQ alike."
            : "Deactivated. Reactivating restores login immediately."}
        </p>
        <div className="mt-3">
          <StaffActiveToggle staffId={staff.id} isActive={staff.isActive} />
        </div>
      </section>
    </div>
  );
}
