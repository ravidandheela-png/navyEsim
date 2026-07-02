/**
 * Global error handler middleware.
 * Must be registered last in the Express app (after all routes).
 *
 * Handles:
 *   - Errors with an explicit .status / .statusCode (e.g. created by controllers)
 *   - Prisma known errors (P2002 unique violation, P2025 not found, etc.)
 *   - Generic unknown errors → 500
 *
 * Never exposes stack traces when NODE_ENV=production.
 * Always returns: { "error": "<message>" }
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const { Prisma } = require('@prisma/client');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isProd = process.env.NODE_ENV === 'production';

  // ── Determine HTTP status ────────────────────────────────────────────────
  let status  = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Handle Prisma known errors ───────────────────────────────────────────
  // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        status  = 409;
        message = 'A record with that value already exists.';
        break;
      case 'P2025':
        // Record not found (e.g. update/delete on non-existent row)
        status  = 404;
        message = 'Record not found.';
        break;
      case 'P2003':
        // Foreign key constraint failed
        status  = 400;
        message = 'Related record not found.';
        break;
      case 'P2014':
        // Required relation violation
        status  = 400;
        message = 'Invalid relation in request.';
        break;
      default:
        // Other Prisma errors (connection issues, etc.) → 500
        status  = 500;
        message = 'Database error.';
        break;
    }
  }

  // ── Clamp status to a valid HTTP range ───────────────────────────────────
  if (typeof status !== 'number' || status < 100 || status > 599) {
    status = 500;
  }

  // ── Log the error (always, regardless of env) ────────────────────────────
  // Use stderr so it doesn't pollute stdout in production log pipelines
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${status} ${err.message}`;
  if (!isProd && err.stack) {
    console.error(logMessage);
    console.error(err.stack);
  } else {
    console.error(logMessage);
  }

  // ── Build response ───────────────────────────────────────────────────────
  const body = { error: message };

  // In development, attach the stack trace to the response for easier debugging
  if (!isProd && err.stack) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}

module.exports = errorHandler;
