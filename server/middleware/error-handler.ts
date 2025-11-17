import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from 'zod';

/**
 * This middleware catches all errors thrown in the application,
 * logs them, and formats a standardized JSON error response.
 *
 * It handles:
 * - HTTPException (for controlled, expected errors like 404, 400)
 * - ZodError (for validation errors)
 * - Generic Errors
 */
const errorHandler = async (err: Error, c: Context) => {

    console.error(`[ErrorHandler] Path: ${c.req.path}, Method: ${c.req.method}`);
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // handle http errors thrown by the controllers
    if (err instanceof HTTPException) {
        return err.getResponse();
    }
    
    // handle zod validation errors
    if (err instanceof ZodError) {
        return c.json({
            error: 'ValidationError',
            errorMessage: 'Input validation failed',
            details: err,
        },400,);
    }

    // handle unknown/generic errors last
    return c.json({
        error: 'InternalServerError',
        errorMessage: 'An unexpected error occurred on the server.',
        details: err.message,
    },500,);
};

export default errorHandler