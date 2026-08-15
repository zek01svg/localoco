import type { ErrorCode, ErrorEnvelope } from "#shared/contracts/error";
import type { Hook } from "@hono/standard-validator";
import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { flattenErrors } from "@hono/standard-validator";

export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: unknown,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// The validator result shape, with the context parameter stripped: the hook
// never reads the context, and keeping it out lets tests exercise the hook
// without fabricating a Hono Context.
type ValidationResult = Parameters<Hook<unknown, Env, string>>[0];

// Schema failures at the request boundary are malformed input: 400. Semantic
// failures against the current state of the world are HttpError 422s raised
// deliberately inside handlers.
export const onValidationError = (result: ValidationResult): void => {
  if (!result.success) {
    throw new HttpError(400, "invalid_request", "Request parameters failed validation", {
      issues: flattenErrors(result.error),
    });
  }
};

type LoggerLike = {
  warning: (message: string, properties: Record<string, unknown>) => void;
  error: (error: Error, properties: Record<string, unknown>) => void;
};

const envelope = (
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown
): ErrorEnvelope => ({
  error: {
    code,
    message,
    requestId,
    ...(details === undefined ? {} : { details }),
  },
});

// The single failure path for the whole app: typed HttpErrors render as-is,
// anything else becomes a generic 500 whose message never leaves the server.
export const createErrorHandler =
  (deps: { logger: LoggerLike; captureException?: (err: unknown) => void }) =>
  (err: Error, c: Context<{ Variables: { requestId: string } }>) => {
    const request = {
      request_id: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
    };

    if (err instanceof HttpError) {
      deps.logger.warning("request.failed", {
        ...request,
        code: err.code,
        status: err.status,
        ...(err.cause === undefined ? {} : { cause: err.cause }),
      });
      return c.json(envelope(err.code, err.message, request.request_id, err.details), err.status);
    }

    deps.logger.error(err, request);
    deps.captureException?.(err);
    return c.json(
      envelope("internal_error", "An unexpected error occurred.", request.request_id),
      500
    );
  };
