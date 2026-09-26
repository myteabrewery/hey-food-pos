import type { ReactElement } from "react";

/**
 * `area_manager` can log into HQ for real (real auth exists now) but every
 * `/admin/*` route still rejects them outright (`AREA_MANAGER_NOT_YET_SUPPORTED`,
 * `HqAdminSessionGuard`) — scoping HQ's screens to an area manager's assigned
 * outlets is real, separate follow-on work (Orders is the natural first one
 * to open up), not built in this pass. `AppLayout` renders this in place of
 * `children` for the whole session rather than letting each of the ~6 screens
 * independently show its own raw 403.
 */
export function AreaManagerBlocked(): ReactElement {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-8">
      <div className="max-w-md text-center">
        <h1 className="text-hq-heading font-bold text-brand-ink">Not available for Area Managers yet</h1>
        <p className="mt-2 text-hq-body text-brand-muted">
          You&apos;re logged in, but none of HQ&apos;s screens are scoped to an area manager&apos;s outlets yet — every one is
          HQ Admin-only for now. Orders is next in line to open up.
        </p>
        <p className="mt-4 text-hq-caption text-brand-muted">Ask an HQ Admin, or log out from the sidebar.</p>
      </div>
    </div>
  );
}
