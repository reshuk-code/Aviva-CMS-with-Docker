import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * `Field` wires a label, hint and error message to a control by id, so every
 * form in the admin is accessible without each page remembering to do it.
 */
export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium text-foreground select-none",
        className,
      )}
      {...props}
    />
  );
}

const controlStyles =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlStyles, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(controlStyles, "min-h-24", className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlStyles, "h-9 pr-8", className)} {...props} />
  );
}

export interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
  }) => ReactNode;
}

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })}

      {error ? (
        // `data-field-error` is how `useFormFeedback` finds the first problem
        // on a rejected save when the control itself is not focusable.
        <p id={errorId} data-field-error className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Checkbox with an inline label, used for the many boolean page options. */
export function CheckboxField({
  id,
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { id: string; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-input accent-[var(--primary)]"
        {...props}
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
