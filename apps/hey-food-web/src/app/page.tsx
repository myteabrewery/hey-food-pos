import type { ReactElement } from "react";

/**
 * There's deliberately no outlet picker here: this web checkout is only
 * ever entered via an outlet's QR code (docs dev spec Section 7's QR
 * fallback), which lands straight on /o/[outletId].
 */
export default function HomePage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-web-display font-semibold">Hey Food</h1>
      <p className="text-brand-muted">Scan the QR code at the counter to see the menu and order.</p>
    </main>
  );
}
