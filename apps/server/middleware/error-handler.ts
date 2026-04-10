import * as Sentry from "@sentry/node";
import logger from "@server/lib/pino";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod/v4";

/**
 * Standard error handler to catch all uncaught errors, log them,
 * and send them to Sentry before returning a JSON response.
 *
 * @param {Error} err - Error object.
 * @param {Context} c - Hono context.
 */
const errorHandler = async (err: Error, c: Context) => {
  const status = err instanceof HTTPException ? err.status : 500;
  logger.error(
    {
      err,
      path: c.req.path,
      method: c.req.method,
      status,
    },
    `[ErrorHandler] ${err.message}`
  );

  // send the logs to sentry
  Sentry.captureException(err);

  // handle http errors thrown by the controllers
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // handle zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: "ValidationError",
        errorMessage: "Input validation failed",
        details: err,
      },
      400
    );
  }

  // handle unknown/generic errors last
  return c.json(
    {
      error: "InternalServerError",
      errorMessage: "An unexpected error occurred on the server.",
      details: err.message,
    },
    500
  );
};

export default errorHandler;
