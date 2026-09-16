"use client";

import { useEffect, type RefObject } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/result";

/**
 * Reports the outcome of a save, once, for every admin form.
 *
 * The split it enforces: **a field's problem belongs under that field, and
 * everything else belongs in a toast.** A content editor is two screens long,
 * so a banner at the top of the form is a message nobody sees — the editor
 * presses Save at the bottom, nothing appears to happen, and the explanation
 * is a thousand pixels above the fold.
 *
 * So on a rejected save this does two things: it raises the action-level
 * message as a toast, which is visible wherever you are on the page, and it
 * scrolls the first invalid control into view and focuses it, which puts you
 * on the thing that needs fixing instead of leaving you to hunt for it.
 *
 * Inline field errors are not rendered here. `Field` already draws them under
 * its control, which is where they belong and where a screen reader finds them
 * through `aria-describedby`.
 */

/**
 * Anything worth scrolling to.
 *
 * `Field` marks its control `aria-invalid`, which is the better target because
 * it can take focus. The editors that build their own rows — itinerary days,
 * group rate bands — mark their message instead, so those are found too.
 * `querySelector` returns whichever comes first in the document, which is the
 * first problem on the page either way.
 */
const FIRST_PROBLEM = '[aria-invalid="true"], [data-field-error]';

const FOCUSABLE = "input, select, textarea, [contenteditable='true']";

export function useFormFeedback(
  state: ActionState,
  formRef: RefObject<HTMLFormElement | null>,
): void {
  useEffect(() => {
    // `IDLE` carries neither, which is what keeps this quiet on first render.
    if (!state.message && !state.fieldErrors) return;

    if (state.ok) {
      if (state.message) toast.success(state.message);
      return;
    }

    const target =
      formRef.current?.querySelector<HTMLElement>(FIRST_PROBLEM) ?? null;

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // `preventScroll` so focusing does not cancel the smooth scroll with an
      // instant jump of its own.
      if (target.matches(FOCUSABLE)) target.focus({ preventScroll: true });
    }

    /*
     * "Please fix the highlighted fields" with nothing highlighted is a dead
     * end. It happens when a field error is keyed to something the form does
     * not render a control for, so the messages are carried in the toast
     * instead of being lost.
     */
    const unshown =
      !target && state.fieldErrors
        ? Object.values(state.fieldErrors).flat()
        : [];

    toast.error(state.message ?? "That could not be saved.", {
      description: unshown.length > 0 ? unshown.join(" ") : undefined,
    });
  }, [state, formRef]);
}
