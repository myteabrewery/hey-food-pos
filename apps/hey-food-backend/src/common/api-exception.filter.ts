import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ApiError } from "@hey-food/api-client";
import type { Response } from "express";
import { ZodError } from "zod";

/**
 * Every response this API sends — success or failure — matches an
 * api-client schema. This is the failure half: whatever gets thrown,
 * translate it to `ApiErrorSchema`'s `{ error: { code, message } }` shape
 * (cross-cutting decision #5) rather than letting Nest's default error
 * body (a differently-shaped `{ statusCode, message, error }`) leak out.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const [status, body] = this.toApiError(exception);
    response.status(status).json(body);
  }

  private toApiError(exception: unknown): [number, ApiError] {
    if (exception instanceof ZodError) {
      const message = exception.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      return [HttpStatus.BAD_REQUEST, { error: { code: "VALIDATION_ERROR", message } }];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // ApiException (this app's own) already puts { code, message } here.
      if (typeof body === "object" && body !== null && "code" in body && "message" in body) {
        return [status, { error: { code: String(body.code), message: String(body.message) } }];
      }

      // A built-in Nest exception (e.g. NotFoundException thrown directly) —
      // fall back to deriving a code from the status name.
      const message = typeof body === "string" ? body : exception.message;
      return [status, { error: { code: HttpStatus[status] ?? "HTTP_ERROR", message } }];
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      { error: { code: "INTERNAL_ERROR", message: "Internal server error." } },
    ];
  }
}
