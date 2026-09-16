"use client";

import { useMemo } from "react";

import { analyseSeo, type SeoAnalysisInput, type SeoCheckStatus } from "@/lib/seo/analysis";
import { cn } from "@/lib/utils";

/**
 * On-page SEO scoring panel, in the spirit of Rank Math.
 *
 * Presentation only. Every judgement is made by `lib/seo/analysis.ts`, which
 * is a plain function with no imports of its own worth speaking of, so the
 * same grade can be produced on the server without rendering anything.
 *
 * The score is a checklist with arithmetic, and the footnote says so. A
 * number out of a hundred invites an editor to read it as a ranking
 * prediction, and no honest tool can offer one.
 */

const STATUS_STYLES: Record<SeoCheckStatus, { dot: string; label: string }> = {
  good: { dot: "bg-[var(--success)]", label: "Pass" },
  warning: { dot: "bg-[var(--warning)]", label: "Could be better" },
  bad: { dot: "bg-destructive", label: "Needs fixing" },
};

const GRADE_COPY = {
  none: { label: "Not graded", tone: "text-muted-foreground" },
  poor: { label: "Needs work", tone: "text-destructive" },
  ok: { label: "Nearly there", tone: "text-[var(--warning)]" },
  good: { label: "Good", tone: "text-[var(--success)]" },
} as const;

export function SeoAnalysis(input: SeoAnalysisInput) {
  // Runs on every keystroke in the title, description and body, so it is
  // memoised on the values it actually reads.
  const analysis = useMemo(
    () => analyseSeo(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input.focusKeyword,
      input.title,
      input.description,
      input.slug,
      input.content,
      input.featuredImage,
    ],
  );

  const grade = GRADE_COPY[analysis.grade];
  const failing = analysis.checks.filter((check) => check.status !== "good");

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <ScoreRing score={analysis.score} status={analysis.grade} />
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", grade.tone)}>{grade.label}</p>
          <p className="text-xs text-muted-foreground">
            {failing.length === 0
              ? "Every check passed."
              : `${failing.length} of ${analysis.checks.length} checks want attention.`}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {analysis.checks.map((check) => (
          <li key={check.id} className="flex gap-2.5 text-xs">
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                STATUS_STYLES[check.status].dot,
              )}
            />
            <span className="min-w-0">
              <span className="font-medium">{check.label}</span>
              <span className="sr-only">
                {" "}
                — {STATUS_STYLES[check.status].label}.{" "}
              </span>
              <span className="block leading-relaxed text-muted-foreground">
                {check.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        These are mechanical checks, not a ranking prediction. A page can score
        100 and rank nowhere, and a genuinely useful page can score 60.
      </p>
    </div>
  );
}

function ScoreRing({
  score,
  status,
}: {
  score: number;
  status: "none" | "poor" | "ok" | "good";
}) {
  const stroke =
    status === "good"
      ? "var(--success)"
      : status === "ok"
        ? "var(--warning)"
        : status === "poor"
          ? "var(--destructive)"
          : "var(--muted-foreground)";

  const radius = 18;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative size-12 shrink-0">
      <svg viewBox="0 0 44 44" className="size-full -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">
        {score}
      </span>
    </div>
  );
}
