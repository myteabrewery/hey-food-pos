import type { ReactElement } from "react";

/**
 * Shown at the top of EVERY page inside the HQ app. The app has no login and
 * (with Menu Management) can change prices for the whole business and read and cancel every outlet's orders, so this
 * is never dismissible and never hidden. It is a reminder, not a protection:
 * the protections are that the package scripts only bind to localhost and that
 * the backend's admin key never reaches the browser. See the CRITICAL banner at
 * the top of apps/hey-food-backend/README.md and docs/STATUS.md.
 */
export function NoLoginBanner(): ReactElement {
  return (
    <div role="alert" className="border-b-2 border-danger-solid bg-danger-tint px-8 py-2 text-hq-caption font-bold text-danger-solid">
      ⛔ NO LOGIN — anyone who can open this app can change ANY price and availability, read every outlet&apos;s orders and CANCEL ANY
      order. It must only ever run on localhost; never expose, tunnel or deploy it until real HQ authentication exists.
    </div>
  );
}
