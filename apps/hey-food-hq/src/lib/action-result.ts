import { AdminApiError } from "./admin-api";

/** What every HQ server action returns: success with data, or a message (optionally tied to one field). */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; field?: string };

/** The parts of a zod error this needs (HQ does not depend on zod directly; api-client does). */
export interface SchemaError {
  issues: Array<{ path: Array<string | number>; message: string }>;
}

/** A schema failure as an action result, with the message tied to the field it is about. */
export function fromZod(error: SchemaError): ActionResult<never> {
  const issue = error.issues[0];
  const field = issue?.path[0] === undefined ? undefined : String(issue.path[0]);
  return { ok: false, field, error: `${field ? `${field}: ` : ""}${issue?.message ?? "invalid input"}` };
}

/** A caught error as an action result. The backend's own messages pass through; anything else does not. */
export function fromCaught(caught: unknown, label: string): ActionResult<never> {
  if (caught instanceof AdminApiError) {
    return { ok: false, error: caught.message };
  }
  // Never echo an unexpected error's text back to the browser: it could carry internals.
  console.error(`[${label}]`, caught instanceof Error ? caught.message : caught);
  return { ok: false, error: "Something went wrong. Nothing was saved." };
}
