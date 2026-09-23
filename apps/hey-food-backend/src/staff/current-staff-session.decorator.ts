import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { StaffSessionContext } from "./staff-session.guard";

/**
 * The calling staff session, attached by StaffSessionGuard. Only valid on a
 * route guarded by it — every route this decorator is used on must be.
 */
export const CurrentStaffSession = createParamDecorator((_: unknown, context: ExecutionContext): StaffSessionContext => {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.staffSession) {
    throw new Error("CurrentStaffSession used on a route not guarded by StaffSessionGuard.");
  }
  return request.staffSession;
});
