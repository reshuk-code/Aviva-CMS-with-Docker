"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";

import { submitEnquiryAction } from "@/app/(frontend)/contact/actions";
import { IDLE } from "@/lib/actions/result";

export interface EnquiryFormProps {
  /** Tours a visitor can enquire about. Optional — omit for a plain contact form. */
  tours?: { id: string; name: string }[];
  /** Preselects a tour when the visitor arrived from a tour page. */
  defaultTourId?: string | null;
  /**
   * Context from a destination page. Used only while no tour is selected —
   * picking a trip is the more specific answer to "what is this about?".
   */
  destination?: { id: string; name: string } | null;
  /** An opening line the visitor can keep, edit or delete. */
  defaultMessage?: string;
}

/**
 * Public enquiry form — a reference implementation.
 *
 * Deliberately plain markup with no design system: it is here to show the
 * seam (`submitEnquiryAction` → `cms.enquiries.create()`), and a real client
 * project replaces the styling wholesale.
 *
 * It submits through `onSubmit` rather than `<form action={…}>` for the same
 * reason every editor in the admin does: React resets a form whose action prop
 * is a function once the action resolves, which would wipe a visitor's message
 * the moment their email address failed validation. See CLAUDE.md, "Form rules".
 */
export function EnquiryForm({
  tours = [],
  defaultTourId = null,
  destination = null,
  defaultMessage = "",
}: EnquiryFormProps) {
  const [state, formAction, pending] = useActionState(
    submitEnquiryAction,
    IDLE,
  );

  /*
   * Which trip the enquiry is about, held in state rather than read off the
   * select at submit time: the hidden `subjectType` has to change with it, and
   * a visitor who arrived from a destination page and then picked a trip must
   * post the trip rather than both.
   */
  const [tourId, setTourId] = useState(defaultTourId ?? "");

  // Cleared on success so the form empties, but only then — a rejected submit
  // must keep every word the visitor typed.
  const [formKey, setFormKey] = useState(0);
  const [lastHandled, setLastHandled] = useState(IDLE);

  // Adjusting state during render rather than in an effect: the lint rule that
  // forbids setState-in-effect is on for a reason (CLAUDE.md, "Form rules").
  if (state !== lastHandled) {
    setLastHandled(state);
    if (state.ok) setFormKey((value) => value + 1);
  }

  const errors = state.fieldErrors ?? {};

  const subject = tourId
    ? { type: "tour", id: tourId }
    : destination
      ? { type: "destination", id: destination.id }
      : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  if (state.ok && state.message) {
    return (
      <p
        role="status"
        className="rounded-xl bg-muted px-4 py-3 text-sm"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Your name" error={errors.name?.[0]} required>
          <input
            name="name"
            required
            autoComplete="name"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>

        <Labelled label="Email" error={errors.email?.[0]} required>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>

        <Labelled label="Phone" error={errors.phone?.[0]}>
          <input
            name="phone"
            autoComplete="tel"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>

        <Labelled label="Country" error={errors.country?.[0]}>
          <input
            name="country"
            autoComplete="country-name"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>

        <Labelled label="Preferred travel date" error={errors.travelDate?.[0]}>
          <input
            name="travelDate"
            type="date"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>

        <Labelled label="Travellers" error={errors.travellers?.[0]}>
          <input
            name="travellers"
            type="number"
            min={1}
            max={100}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
        </Labelled>
      </div>

      {tours.length > 0 ? (
        <Labelled label="Which trip?" error={errors.subjectId?.[0]}>
          <select
            value={tourId}
            onChange={(event) => setTourId(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="">
              {destination ? `Not sure — anything in ${destination.name}` : "Not sure yet"}
            </option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name}
              </option>
            ))}
          </select>
        </Labelled>
      ) : null}

      {/*
        What the enquiry is about, posted as a pair so the inbox can resolve the
        id back to a name — see resolveSubject() in the admin enquiry screen,
        which handles a subject that has since been deleted.

        A chosen trip always wins over the destination the visitor arrived from:
        both would be true, but only one of them is what they asked about. The
        select above is deliberately unnamed so it cannot post a second
        `subjectId` of its own.
      */}
      {subject ? (
        <>
          <input type="hidden" name="subjectType" value={subject.type} />
          <input type="hidden" name="subjectId" value={subject.id} />
        </>
      ) : null}

      <Labelled label="Message" error={errors.message?.[0]} required>
        <textarea
          name="message"
          rows={6}
          required
          /*
            An opening line rather than the whole message: enough that arriving
            from a trip page does not mean starting at a blank box, little
            enough that the visitor still says what they actually want.
          */
          defaultValue={defaultMessage}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          placeholder="Tell us roughly what you have in mind — dates, group size, anything you are unsure about."
        />
      </Labelled>

      {/*
        Honeypot. Off-screen rather than `display:none`, which some bots detect,
        and hidden from assistive technology so nobody is asked to fill it in.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}

function Labelled({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
