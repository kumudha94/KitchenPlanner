import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async Express route handler so a rejected promise is forwarded to
 * `next()` (and therefore to the error-handling middleware) instead of
 * becoming an unhandled rejection that crashes the process.
 *
 * Express 4 does not do this automatically for async handlers.
 */
export function wrap(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
