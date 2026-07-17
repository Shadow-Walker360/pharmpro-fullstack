/**
 * lib/errors.ts
 *
 * A single error shape used across the whole API so the global error
 * handler can distinguish "expected" errors (bad input, not found,
 * forbidden) from genuine bugs, without leaking stack traces to clients.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string) { return new ApiError(400, message); }
  static unauthorized(message = 'Unauthorized') { return new ApiError(401, message); }
  static forbidden(message = 'Forbidden') { return new ApiError(403, message); }
  static notFound(message = 'Not found') { return new ApiError(404, message); }
  static conflict(message: string) { return new ApiError(409, message); }
}