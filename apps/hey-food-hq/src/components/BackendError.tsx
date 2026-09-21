import type { ReactElement } from "react";

/** A visible panel for "the backend refused or could not be reached", instead of a blank page or a stack trace. */
export function BackendError({ title, message }: { title: string; message: string }): ReactElement {
  return (
    <div role="alert" className="mt-6 rounded-md border border-danger-solid bg-danger-tint p-4 text-hq-body text-danger-solid">
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
