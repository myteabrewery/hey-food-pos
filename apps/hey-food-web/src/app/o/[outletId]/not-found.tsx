import type { ReactElement } from "react";

export default function OutletNotFound(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-web-heading font-semibold">We could not find that menu</h1>
      <p className="text-brand-muted">
        This link does not match an outlet. Try scanning the QR code at the counter again.
      </p>
    </main>
  );
}
