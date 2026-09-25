/**
 * Centralized Application Errors & Formatting
 * Sanitizes technical and database errors into safe, user-friendly messages.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, details, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required. Please sign in.") {
    super("AUTHENTICATION_ERROR", message, undefined, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "You do not have permission to perform this action."
  ) {
    super("AUTHORIZATION_ERROR", message, undefined, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, identifier?: string) {
    super(
      "NOT_FOUND",
      identifier
        ? `${entity} with identifier "${identifier}" was not found.`
        : `${entity} not found.`,
      undefined,
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, undefined, 409);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "A database operation could not be completed.") {
    super("DATABASE_ERROR", message, undefined, 500);
  }
}

/**
 * Format any thrown error or Postgres error code into a user-safe message.
 */
export function formatUserErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }

  if (typeof err === "object" && err !== null) {
    const errorObj = err as { code?: string; message?: string; details?: string };
    const code = errorObj.code || "";
    const msg = (errorObj.message || "").toLowerCase();

    // PostgreSQL Unique Violation
    if (code === "23505" || msg.includes("unique constraint") || msg.includes("already exists")) {
      if (msg.includes("jhs_index") || msg.includes("students_jhs_index")) {
        return "A student with this JHS/BECE Index Number already exists in the system.";
      }
      if (msg.includes("profiles_email") || msg.includes("email")) {
        return "An account with this email address already exists.";
      }
      if (msg.includes("receipt_number")) {
        return "This receipt number is already registered.";
      }
      return "A record with this unique information already exists.";
    }

    // PostgreSQL Foreign Key Violation
    if (code === "23503" || msg.includes("foreign key")) {
      return "This record cannot be processed because a required linked entity does not exist.";
    }

    // PL/pgSQL Raise Exception (business logic)
    if (code === "P0001" || msg.includes("raise exception")) {
      return errorObj.message?.replace(/^[A-Z0-9_]+:\s*/, "") || "Operation failed business rule validation.";
    }

    if (errorObj.message && !errorObj.message.includes("violates") && !errorObj.message.includes("relation")) {
      return errorObj.message;
    }
  }

  if (typeof err === "string") {
    return err;
  }

  return "An unexpected error occurred while processing your request. Please try again.";
}
