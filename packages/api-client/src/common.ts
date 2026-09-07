import { z } from "zod";

/** Every endpoint returns errors in this shape (cross-cutting decision #5). */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Cursor-based pagination request params — used everywhere, never page/limit (decision #3). */
export const CursorPaginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type CursorPaginationParams = z.infer<typeof CursorPaginationParamsSchema>;

/**
 * Non-paginated list envelope. Every endpoint whose top-level response body
 * IS a collection uses this — never a bare array (cross-cutting decision #1).
 */
export function listResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
  });
}
export interface ListResponse<T> {
  data: T[];
}

/** Paginated list envelope — adds a cursor for the next page. */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      nextCursor: z.string().optional(),
    }),
  });
}
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor?: string;
  };
}
