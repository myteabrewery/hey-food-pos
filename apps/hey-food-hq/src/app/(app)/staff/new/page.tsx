import Link from "next/link";
import type { ReactElement } from "react";

import { StaffForm } from "@/components/StaffForm";
import { AdminApiError, listStaff } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/** New staff member: account fields plus the PIN they'll use for real POS login, and — for hq_admin/area_manager — the password they'll use for real HQ login. */
export default async function NewStaffPage(): Promise<ReactElement> {
  const outlets = await listStaff()
    .then((result) => result.outlets)
    .catch((caught) => {
      if (caught instanceof AdminApiError) throw caught;
      return [];
    });

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <Link href="/staff" className="text-hq-body text-brand-teal">
        ← Back to staff
      </Link>
      <h1 className="mt-2 text-hq-display font-bold text-brand-ink">New staff member</h1>
      <p className="mt-1 text-hq-body text-brand-muted">
        The PIN you set here is what this person actually logs into POS with. HQ Admin and Area Manager accounts also need a password, for logging into HQ.
      </p>

      <div className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <StaffForm mode="create" outlets={outlets} initial={{ name: "", phone: "", role: "outlet_staff", assignedOutletIds: [] }} />
      </div>
    </div>
  );
}
