/**
 * Errors the CMS core raises. Server actions translate these into form errors;
 * route handlers translate them into status codes.
 */
export class CmsError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "CmsError";
  }
}

export class NotFoundError extends CmsError {
  constructor(what: string) {
    super(`${what} not found.`, "not_found", 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends CmsError {
  /** `field` lets a server action attach the message to the right input. */
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message, "conflict", 409);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends CmsError {
  constructor(message = "You need to sign in to do that.") {
    super(message, "unauthorized", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends CmsError {
  constructor(message = "You do not have permission to do that.") {
    super(message, "forbidden", 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends CmsError {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message, "validation", 422);
    this.name = "ValidationError";
  }
}
