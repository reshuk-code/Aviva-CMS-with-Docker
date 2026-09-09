import { ZodError } from "zod";

import { CmsError, ConflictError, ValidationError } from "@/lib/cms/errors";

/**
 * The shape every server action returns, so forms can render errors uniformly
 * with `useActionState`.
 */
export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Optional payload, e.g. the id of a newly created record. */
  data?: Record<string, string>;
}

export const IDLE: ActionState = { ok: false };

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState {
  return { ok: false, message, fieldErrors };
}

export function actionSuccess(
  message?: string,
  data?: Record<string, string>,
): ActionState {
  return { ok: true, message, data };
}

/**
 * Turns any thrown error into an ActionState.
 *
 * Unknown errors are logged server-side and reported generically, so an
 * internal message (a database URL in a driver error, say) never reaches the
 * browser.
 */
export function toActionState(error: unknown): ActionState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return actionError("Please fix the highlighted fields.", fieldErrors);
  }

  if (error instanceof ValidationError) {
    return actionError(error.message, error.fieldErrors);
  }

  if (error instanceof ConflictError) {
    return actionError(
      error.message,
      error.field ? { [error.field]: [error.message] } : undefined,
    );
  }

  if (error instanceof CmsError) {
    return actionError(error.message);
  }

  console.error("[cms] Unhandled server action error:", error);
  return actionError("Something went wrong. Please try again.");
}

/** Zod flattened field errors, keyed the way ActionState expects. */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Reads a checkbox out of FormData: present means true. */
export function formBoolean(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

/** Reads a text field, mapping "" to "" (schemas turn that into null). */
export function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
