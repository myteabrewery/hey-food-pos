import type { ReactElement } from "react";

export default function ItemNotFound(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-web-heading font-semibold">We could not find that item</h1>
      <p className="text-brand-muted">It may have been removed from the menu. Go back and pick something else.</p>
    </main>
  );
}
