import { HttpException } from "@nestjs/common";

/**
 * Throw this (rather than Nest's built-in HttpException subclasses) for any
 * error that should reach the client in the api-client `ApiErrorSchema`
 * shape (`{ error: { code, message } }`, cross-cutting decision #5) with a
 * meaningful `code` — ApiExceptionFilter reads `code`/`message` straight
 * off this exception's response body.
 */
export class ApiException extends HttpException {
  constructor(status: number, code: string, message: string) {
    super({ code, message }, status);
  }
}
