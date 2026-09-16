"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  useFormSections,
  type FormSectionDescriptor,
} from "@/components/cms/form-sections";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Jump list for a long content editor.
 *
 * The tour form is ten sections and six hundred lines; reaching SEO meant
 * scrolling past an itinerary editor. This pins the sections beside the form,
 * expands one to list the fields inside it, and scrolls to whichever is picked.
 *
 * **It moves the viewport, it never unmounts anything.** Tabs would be tidier
 * and would quietly break saving: these forms post with
 * `new FormData(event.currentTarget)`, which reads only the inputs currently in
 * the DOM. Collapsing is done with CSS by `FormSection` for the same reason.
 *
 * The field list under each section is read from the DOM — every `Field`
 * renders a `<label for>` — rather than declared per form. A hand-written list
 * would be one more thing to update when a field moves, and would be wrong
 * silently.
 */
export type FormSection = FormSectionDescriptor;

/**
 * Cleared by the sticky admin header, which would otherwise cover the heading
 * of whichever section was just jumped to.
 */
const HEADER_OFFSET = 96;

interface SubField {
  key: string;
  label: string;
  /** Held as an element because a <legend> has no id to look up. */
  target: HTMLElement;
  /** Legends name a group; there is no single control to put the caret in. */
  focus: boolean;
}

export function FormSectionNav({
  sections: sectionsProp,
  className,
}: {
  /** Used when the form has no FormSections provider. */
  sections?: FormSection[];
  className?: string;
}) {
  const controller = useFormSections();
  // Memoised because it feeds the observer effect's dependency list: a fresh
  // array every render would tear the observer down and rebuild it constantly.
  const sections = useMemo(
    () => controller?.sections ?? sectionsProp ?? [],
    [controller?.sections, sectionsProp],
  );

  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fields, setFields] = useState<SubField[]>([]);
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    // Whichever tracked section is nearest the top of the readable area wins,
    // rather than "the first one intersecting": with tall sections several are
    // on screen at once and the naive answer flickers between them.
    const tops = new Map<string, number>();
    let frame: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        /*
         * Read the position the observer already measured instead of calling
         * getBoundingClientRect on every section. The old version forced a
         * synchronous layout per section on every scroll tick — eight reflows
         * a frame here — which is what made the admin scroll feel rough.
         */
        for (const entry of entries) {
          tops.set(entry.target.id, entry.boundingClientRect.top);
        }

        // At most one state update per frame, however many entries arrive.
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;

          let best: { id: string; distance: number } | null = null;
          for (const [id, top] of tops) {
            const distance = Math.abs(top - HEADER_OFFSET);
            if (!best || distance < best.distance) best = { id, distance };
          }

          if (best) setActive(best.id);
        });
      },
      // A band of thresholds keeps the callback firing while a long section
      // scrolls past, which a single 0/1 threshold would not.
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-80px 0px -60% 0px" },
    );

    for (const element of elements) observer.observe(element);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [sections]);

  /** Scrolls after the browser has painted, so a just-opened section measures. */
  function scrollTo(element: HTMLElement) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top:
            window.scrollY +
            element.getBoundingClientRect().top -
            HEADER_OFFSET,
          behavior: "smooth",
        });
      });
    });
  }

  function jump(id: string) {
    controller?.open(id);
    const element = document.getElementById(id);
    if (element) scrollTo(element);
    setActive(id);
  }

  function toggleFields(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }

    // Read the labels now rather than on every render: the list only changes
    // when a repeating field gains a row, and this reopens to refresh it.
    const section = document.getElementById(id);
    const found: SubField[] = [];
    const seen = new Set<string>();

    // Both selectors in one pass so entries stay in document order.
    const candidates =
      section?.querySelectorAll("label[for], fieldset > legend") ?? [];

    for (const node of candidates) {
      const text = node.textContent?.trim().replace(/\s*\*$/, "") ?? "";
      if (!text) continue;

      if (node instanceof HTMLLegendElement) {
        const group = node.parentElement;
        if (!group || seen.has(text)) continue;
        seen.add(text);
        found.push({ key: text, label: text, target: group, focus: false });
        continue;
      }

      // A control inside a fieldset is one of a group — the twelve month
      // checkboxes behind "Best season", say. Listing each of them buries the
      // handful of fields somebody actually navigates to, so the legend above
      // stands in for the whole group.
      if (node.closest("fieldset")) continue;

      const targetId = node.getAttribute("for");
      const control = targetId ? document.getElementById(targetId) : null;
      if (!control || seen.has(targetId!)) continue;

      seen.add(targetId!);
      found.push({ key: targetId!, label: text, target: control, focus: true });
    }

    setFields(found);
    setExpanded(id);
  }

  function jumpToField(sectionId: string, field: SubField) {
    controller?.open(sectionId);

    scrollTo(field.target);
    // Focusing is the point of picking a field rather than a section, but a
    // group heading has nothing to focus.
    if (field.focus) {
      requestAnimationFrame(() =>
        field.target.focus({ preventScroll: true }),
      );
    }

    setActive(sectionId);
  }

  if (sections.length < 2) return null;

  return (
    /*
     * Deliberately not sticky. It used to be, and the rest of the rail scrolled
     * underneath it — the Publishing card's heading disappeared behind the
     * stuck menu. Sections now start collapsed, so the form is short enough
     * that the menu stays in view on its own and stickiness buys nothing.
     */
    <Card className={className}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Fast menu
        </p>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              menuOpen ? "rotate-180" : undefined,
            )}
          />
          <span className="sr-only">
            {menuOpen ? "Hide fast menu" : "Show fast menu"}
          </span>
        </button>
      </div>

      {menuOpen ? (
      <CardBody className="p-2 pt-0">
        <nav aria-label="Sections">
          <ul className="space-y-0.5">
            {sections.map((section) => {
              const current = active === section.id;
              const isExpanded = expanded === section.id;

              return (
                <li key={section.id}>
                  <div
                    className={cn(
                      "flex items-center gap-0.5 rounded-md transition-colors",
                      current
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => jump(section.id)}
                      aria-current={current ? "true" : undefined}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-left text-sm",
                        current ? "font-semibold" : undefined,
                      )}
                    >
                      {section.label}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFields(section.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Hide" : "Show"} fields in ${section.label}`}
                      className="shrink-0 rounded-md p-2 hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          isExpanded ? "rotate-90" : undefined,
                        )}
                      />
                    </button>
                  </div>

                  {isExpanded ? (
                    fields.length > 0 ? (
                      <ul className="mb-1 ml-3 space-y-0.5 border-l border-border pl-2">
                        {fields.map((field) => (
                          <li key={field.key}>
                            <button
                              type="button"
                              onClick={() => jumpToField(section.id, field)}
                              className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {field.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-1 ml-5 py-1 text-xs text-muted-foreground">
                        No separate fields.
                      </p>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </CardBody>
      ) : null}
    </Card>
  );
}
