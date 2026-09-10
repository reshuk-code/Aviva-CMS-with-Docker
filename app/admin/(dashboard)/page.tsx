import Link from "next/link";
import {
  BookOpen,
  Check,
  Compass,
  FilePlus2,
  FileText,
  Mail,
  MapPinned,
  PencilLine,
} from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { EnquiryStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { isModuleEnabled } from "@/lib/cms/config";
import { activity } from "@/lib/cms/repositories/activity";
import { destinations } from "@/lib/cms/repositories/destinations";
import { enquiries } from "@/lib/cms/repositories/enquiries";
import { pages } from "@/lib/cms/repositories/pages";
import { posts } from "@/lib/cms/repositories/posts";
import { tours } from "@/lib/cms/repositories/tours";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/**
 * Dashboard.
 *
 * Every number on this screen is a real count from the database. There are no
 * decorative charts: the one plot here is enquiries per day, which is a trend
 * a travel agency actually acts on. Page-edit sparklines were considered and
 * rejected — they look busy and tell nobody anything (§22, §28).
 *
 * Widgets follow the enabled modules and the viewer's permissions, so a client
 * without Enquiries never sees an inbox panel, and an Author never sees counts
 * they cannot open.
 *
 * Deliberately NOT here, for want of data rather than want of design: a
 * "seats booked" figure (there is no booking model — the module is off) and a
 * converted-over-time series (an enquiry stores its current status, not when
 * it reached it; that needs a `convertedAt` stamp first).
 */
export default async function DashboardPage() {
  const session = await requirePermission("pages.read");
  const can = (permission: Parameters<typeof hasPermission>[1]) =>
    hasPermission({ role: session.role }, permission);

  const showEnquiries = isModuleEnabled("enquiries") && can("enquiries.read");

  const [
    published,
    drafts,
    scheduled,
    tourCount,
    destinationCount,
    postCount,
    statusCounts,
    daily,
    sources,
    latest,
    recent,
  ] = await Promise.all([
    pages.count({ status: "published" }),
    pages.count({ status: "draft" }),
    pages.count({ status: "scheduled" }),
    isModuleEnabled("tours") ? tours.count({ status: "published" }) : 0,
    isModuleEnabled("destinations")
      ? destinations.count({ status: "published" })
      : 0,
    isModuleEnabled("blog") ? posts.count({ status: "published" }) : 0,
    showEnquiries ? enquiries.statusCounts() : null,
    showEnquiries ? enquiries.dailyCounts(7) : [],
    showEnquiries ? enquiries.sourceSplit() : [],
    showEnquiries ? enquiries.list({ perPage: 5 }) : null,
    activity.recent(6),
  ]);

  const contentMix = [
    { label: "Pages", value: published, tone: "bg-[var(--primary)]" },
    { label: "Trips", value: tourCount, tone: "bg-[#49a2a3]" },
    { label: "Posts", value: postCount, tone: "bg-[#94c9c9]" },
  ].filter((slice) => slice.value > 0);

  const contentTotal = contentMix.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div>
      {/*
        The min-height sits on the GRID, not on a wrapper: `h-full` needs a
        definite parent height to resolve against, and a parent with only a
        min-height does not provide one — the columns collapsed to their content
        and left a band of bare surface under the fold.
      */}
      <div className="grid gap-4 lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[17rem_minmax(0,1fr)_17rem]">

        {/* ─────────────────────────────────────────────── left column */}
        <div className="flex flex-col gap-4 lg:order-1">
          {showEnquiries ? (
            <Card>
              <CardBody className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Enquiries
                    </h2>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight">
                    {daily.reduce((sum, day) => sum + day.count, 0)}
                  </span>
                </div>

                <DayChart days={daily} />

                {sources.length > 0 ? (
                  <ul className="mt-5 space-y-2.5">
                    {sources.slice(0, 3).map((entry, index) => (
                      <li
                        key={entry.source}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full border-[3px]"
                          style={{
                            borderColor:
                              index === 0 ? "var(--primary)" : "#94c9c9",
                          }}
                        />
                        <span className="flex-1 truncate capitalize">
                          {entry.source.replace(/-/g, " ")}
                        </span>
                        <span className="font-semibold">{entry.share}%</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {contentTotal > 0 ? (
            <Card className="flex flex-1 flex-col">
              <CardBody className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Content
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Published items
                    </p>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight">
                    {contentTotal}
                  </span>
                </div>

                <Donut slices={contentMix} total={contentTotal} />

                <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {contentMix.map((slice) => (
                    <li
                      key={slice.label}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className={`size-2.5 rounded-[3px] ${slice.tone}`}
                        aria-hidden="true"
                      />
                      {slice.label} {slice.value}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* ────────────────────────────────────────────── centre column */}
        <div className="flex flex-col gap-4 lg:order-2">
          <Card>
            <CardBody className="p-6">
              <h1 className="text-xl font-semibold tracking-tight">
                Welcome back, {session.name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {showEnquiries && statusCounts && statusCounts.new > 0
                  ? `${statusCounts.new} ${
                      statusCounts.new === 1 ? "enquiry needs" : "enquiries need"
                    } a first reply.`
                  : "Nothing is waiting on you right now."}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {showEnquiries && statusCounts ? (
                  <>
                    <Highlight
                      icon={Mail}
                      tint="bg-accent text-accent-foreground"
                      value={statusCounts.new}
                      label="New"
                      hint="Awaiting a reply"
                      href="/admin/enquiries?state=new"
                    />
                    <Highlight
                      icon={FileText}
                      tint="bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[color-mix(in_oklch,var(--warning)_75%,var(--foreground))]"
                      value={statusCounts.quoted}
                      label="Quoted"
                      hint="Waiting on dates"
                      href="/admin/enquiries?state=quoted"
                    />
                    <Highlight
                      icon={Check}
                      tint="bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]"
                      value={statusCounts.converted}
                      label="Converted"
                      hint="All time"
                      href="/admin/enquiries?state=converted"
                    />
                  </>
                ) : (
                  <>
                    <Highlight
                      icon={FileText}
                      tint="bg-accent text-accent-foreground"
                      value={published}
                      label="Published"
                      hint="Live pages"
                      href="/admin/pages?status=published"
                    />
                    <Highlight
                      icon={PencilLine}
                      tint="bg-muted text-muted-foreground"
                      value={drafts}
                      label="Drafts"
                      hint="Not yet live"
                      href="/admin/pages?status=draft"
                    />
                    <Highlight
                      icon={FileText}
                      tint="bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[color-mix(in_oklch,var(--warning)_75%,var(--foreground))]"
                      value={scheduled}
                      label="Scheduled"
                      hint="Queued to publish"
                      href="/admin/pages?status=scheduled"
                    />
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                {can("pages.create") ? (
                  <Button size="sm" asChild>
                    <Link href="/admin/pages/new">
                      <FilePlus2 className="size-4" />
                      New page
                    </Link>
                  </Button>
                ) : null}
                {isModuleEnabled("blog") && can("blog.create") ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/blog/new">
                      <BookOpen className="size-4" />
                      Write a post
                    </Link>
                  </Button>
                ) : null}
                {isModuleEnabled("tours") && can("tours.create") ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/tours/new">
                      <Compass className="size-4" />
                      New trip
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {showEnquiries && latest ? (
            <Card className="flex flex-1 flex-col">
              <CardBody className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight">
                    Latest enquiries
                  </h2>
                  <Link
                    href="/admin/enquiries"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View inbox →
                  </Link>
                </div>

                {latest.items.length === 0 ? (
                  <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    Nothing yet. Enquiries arrive when your site posts a contact
                    form to <code>cms.enquiries.create()</code>.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {latest.items.map((enquiry) => (
                      <li key={enquiry.id}>
                        <Link
                          href={`/admin/enquiries/${enquiry.id}`}
                          className="flex items-center gap-3 py-3"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                            {initials(enquiry.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {enquiry.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {enquiry.message}
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                            {formatRelative(enquiry.createdAt)}
                          </span>
                          <EnquiryStatusBadge status={enquiry.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* ────────────────────────────────────────────── right column */}
        <div className="flex flex-col gap-4 lg:order-3">
          <Card>
            <CardBody className="p-5">
              <h2 className="text-base font-semibold tracking-tight">
                Your library
              </h2>
              <p className="text-xs text-muted-foreground">Published, live now</p>

              <ul className="mt-4 space-y-3">
                <Stat
                  icon={FileText}
                  label="Pages"
                  value={published}
                  href="/admin/pages?status=published"
                />
                {isModuleEnabled("destinations") ? (
                  <Stat
                    icon={MapPinned}
                    label="Destinations"
                    value={destinationCount}
                    href="/admin/destinations?status=published"
                  />
                ) : null}
                {isModuleEnabled("tours") ? (
                  <Stat
                    icon={Compass}
                    label="Trips"
                    value={tourCount}
                    href="/admin/tours?status=published"
                  />
                ) : null}
                {isModuleEnabled("blog") ? (
                  <Stat
                    icon={BookOpen}
                    label="Posts"
                    value={postCount}
                    href="/admin/blog?status=published"
                  />
                ) : null}
                {drafts > 0 ? (
                  <Stat
                    icon={PencilLine}
                    label="Drafts"
                    value={drafts}
                    href="/admin/pages?status=draft"
                  />
                ) : null}
              </ul>
            </CardBody>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardBody className="flex flex-1 flex-col p-5">
              <h2 className="text-base font-semibold tracking-tight">
                Recent activity
              </h2>

              {recent.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nothing has happened yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {recent.map((entry) => (
                    <li key={entry.id} className="flex gap-2.5">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.82rem] leading-snug">
                          <strong className="font-semibold">
                            {entry.userName ?? "Someone"}
                          </strong>{" "}
                          {entry.action}{" "}
                          <strong className="font-semibold">
                            {entry.entityTitle}
                          </strong>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatRelative(entry.createdAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function Highlight({
  icon: Icon,
  tint,
  value,
  label,
  hint,
  href,
}: {
  icon: typeof Mail;
  tint: string;
  value: number;
  label: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-[0.85rem] ${tint}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold leading-tight tracking-tight">
          {value} <span className="text-sm font-medium">{label}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {hint}
        </span>
      </span>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="flex-1 text-sm">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </Link>
    </li>
  );
}

/**
 * Seven-day column chart.
 *
 * Drawn as divs rather than SVG so it inherits the theme's colours directly
 * and needs no chart dependency. Every column keeps a full-height track, which
 * is what stops a quiet week from looking like a broken widget.
 */
function DayChart({
  days,
}: {
  days: { day: string; label: string; count: number }[];
}) {
  const peak = Math.max(1, ...days.map((day) => day.count));

  return (
    <div className="mt-5">
      <div className="flex h-24 items-end gap-2">
        {days.map((day) => (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex h-20 w-full items-end justify-center rounded bg-muted">
              <div
                className="w-full rounded bg-primary"
                style={{
                  height: `${Math.max(day.count > 0 ? 8 : 0, (day.count / peak) * 100)}%`,
                }}
                title={`${day.count} on ${day.day}`}
              />
            </div>
            <span className="text-[0.65rem] text-muted-foreground">
              {day.label[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Content mix donut.
 *
 * A sequential teal ramp rather than three unrelated hues: the segments are
 * shades of one colour, so nobody has to tell two similar hues apart, and the
 * counts are printed beside it either way.
 */
function Donut({
  slices,
  total,
}: {
  slices: { label: string; value: number; tone: string }[];
  total: number;
}) {
  const RADIUS = 52;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const GAP = 2;
  const COLOURS = ["var(--primary)", "#49a2a3", "#94c9c9"];

  // Offsets are accumulated up front rather than inside the map: mutating a
  // variable across a render callback is exactly what the React Compiler
  // rejects, and it would break under any future re-ordering of the work.
  const segments = slices.reduce<
    { label: string; colour: string; dash: number; offset: number }[]
  >((acc, slice, index) => {
    const previous = acc[acc.length - 1];
    const offset = previous
      ? previous.offset + (slices[index - 1].value / total) * CIRCUMFERENCE
      : 0;
    const length = (slice.value / total) * CIRCUMFERENCE;

    acc.push({
      label: slice.label,
      colour: COLOURS[index] ?? "#94c9c9",
      dash: Math.max(0, length - GAP),
      offset,
    });
    return acc;
  }, []);

  return (
    <div className="mt-4 flex justify-center">
      <svg viewBox="0 0 136 136" className="size-36" role="img" aria-label={`${total} published items`}>
        <g transform="translate(68,68) rotate(-90)">
          {segments.map((segment) => (
            <circle
              key={segment.label}
              r={RADIUS}
              fill="none"
              stroke={segment.colour}
              strokeWidth={16}
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
        <text
          x="68"
          y="66"
          textAnchor="middle"
          className="fill-foreground text-[1.4rem] font-semibold"
        >
          {total}
        </text>
        <text
          x="68"
          y="82"
          textAnchor="middle"
          className="fill-muted-foreground text-[0.7rem]"
        >
          items
        </text>
      </svg>
    </div>
  );
}

/** "Marta Kowalska" -> "MK". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}

