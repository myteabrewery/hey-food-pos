import type { ReactElement } from "react";

import type { OutletRef } from "@hey-food/api-client";
import type { StaffRole } from "@hey-food/shared-types";

interface Props {
  role: StaffRole;
  outlets: OutletRef[];
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
}

/**
 * The outlet-assignment part of the Staff form: what it looks like depends on
 * the role picked above it (blueprint Section 13) — `hq_admin` needs no picker
 * at all (it sees every outlet BECAUSE of the role), `outlet_staff` picks
 * exactly ONE outlet (a radio group), `area_manager` picks one or more (a
 * checklist). The backend enforces the same shape (`checkStaffOutletAssignment`
 * plus a database CHECK) — this is convenience, not the only guard.
 */
export function OutletAssignmentField({ role, outlets, value, onChange, invalid }: Props): ReactElement {
  if (role === "hq_admin") {
    return <p className="text-hq-body text-brand-muted">Sees every outlet automatically — no outlets to pick.</p>;
  }

  if (role === "outlet_staff") {
    return (
      <div role="radiogroup" aria-label="Assigned outlet" className="grid gap-2">
        {outlets.map((outlet) => (
          <label
            key={outlet.id}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-hq-body text-brand-ink ${
              value[0] === outlet.id ? "border-brand-teal bg-brand-soft" : "border-brand-line"
            }`}
          >
            <input type="radio" name="assigned-outlet" checked={value[0] === outlet.id} onChange={() => onChange([outlet.id])} />
            {outlet.name}
          </label>
        ))}
      </div>
    );
  }

  // area_manager: one or more.
  return (
    <div role="group" aria-label="Assigned outlets" className={`grid gap-2 ${invalid ? "rounded-md border border-danger-solid p-2" : ""}`}>
      {outlets.map((outlet) => {
        const checked = value.includes(outlet.id);
        return (
          <label
            key={outlet.id}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-hq-body text-brand-ink ${
              checked ? "border-brand-teal bg-brand-soft" : "border-brand-line"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? value.filter((id) => id !== outlet.id) : [...value, outlet.id])}
            />
            {outlet.name}
          </label>
        );
      })}
    </div>
  );
}
