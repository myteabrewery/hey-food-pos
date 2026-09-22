import Link from "next/link";
import type { ReactElement } from "react";

import { StaffForm } from "@/components/StaffForm";
import { AdminApiError, listStaff } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/** New staff member: account fields plus the PIN they'll log in with once real POS PIN login exists. */
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
        No real POS PIN login exists yet — the PIN you set here is stored but nothing checks it today. The POS still uses a separate shared device key.
      </p>

      <div className="mt-6 rounded-md border border-brand-line bg-brand-white p-6">
        <StaffForm mode="create" outlets={outlets} initial={{ name: "", phone: "", role: "outlet_staff", assignedOutletIds: [] }} />
      </div>
    </div>
  );
}
