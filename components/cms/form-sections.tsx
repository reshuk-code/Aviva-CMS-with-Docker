"use client";

import { ChevronDown } from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Collapsible sections for a long content editor, and the shared state the
 * jump list needs to drive them.
 *
 * The state is shared rather than per-card because the two features are one
 * feature: clicking a section in the nav has to *open* it before it can scroll
 * to it, and a card holding its own boolean could not be opened from outside.
 *
 * **A closed section is hidden, never unmounted.** These forms post with
 * `new FormData(event.currentTarget)`, which reads only the inputs in the DOM,
 * so unmounting a section would silently drop every field in it on save. The
 * body keeps rendering and CSS hides it.
 *
 * **A failed save opens everything.** A collapsed section hides its own
 * validation errors, and an editor who is told to "fix the highlighted fields"
 * with nothing highlighted is stuck. One blunt rule beats a hand-maintained
 * map from field name to section, which would rot the first time a field moved.
 */
export interface FormSectionDescriptor {
  id: string;
  label: string;
}

export interface FormTabDescriptor {
  id: string;
  label: string;
  sectionIds: string[];
}

interface FormSectionsValue {
  sections: FormSectionDescriptor[];
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  open: (id: string) => void;
  tabs: FormTabDescriptor[];
  activeTab: string | null;
  selectTab: (id: string) => void;
  revealAll: boolean;
}

const FormSectionsContext = createContext<FormSectionsValue | null>(null);
const ContentPanelContext = createContext(false);

export function FormSections({
  sections,
  /** Open only this section initially. Everything else starts collapsed. */
  defaultOpenId,
  /** Flip to true to reveal every section — pass a failed save. */
  revealAll = false,
  tabs = [],
  children,
}: {
  sections: FormSectionDescriptor[];
  defaultOpenId?: string;
  revealAll?: boolean;
  tabs?: FormTabDescriptor[];
  children: ReactNode;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(defaultOpenId ? [defaultOpenId] : []),
  );
  const [activeTab, setActiveTab] = useState<string | null>(tabs[0]?.id ?? null);

  // Adjusting state during render rather than in an effect, the way the upload
  // zone does: the lint rule against setState-in-effect is on for a reason.
  const [seenReveal, setSeenReveal] = useState(revealAll);
  if (seenReveal !== revealAll) {
    setSeenReveal(revealAll);
    if (revealAll) setOpenIds(new Set(sections.map((section) => section.id)));
  }

  const value: FormSectionsValue = {
    sections,
    tabs,
    activeTab,
    selectTab: setActiveTab,
    revealAll,
    isOpen: (id) => openIds.has(id),
    toggle: (id) =>
      setOpenIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    open: (id) =>
      setOpenIds((current) =>
        current.has(id) ? current : new Set(current).add(id),
      ),
  };

  return (
    <FormSectionsContext.Provider value={value}>
      {children}
    </FormSectionsContext.Provider>
  );
}

/**
 * Read the section state.
 *
 * Returns null outside a provider so a form that has not adopted sections
 * still renders — the nav and the cards simply behave as always-open.
 */
export function useFormSections(): FormSectionsValue | null {
  return useContext(FormSectionsContext);
}

/** One collapsible card. Falls back to a plain card outside a provider. */
export function FormSection({
  id,
  title,
  description,
  children,
  bodyClassName,
}: {
  /**
   * Omitted by a form that has no section provider — pages and posts — where
   * the card is simply always open, exactly as it was before sections existed.
   */
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  const sections = useFormSections();
  // An untracked section cannot be collapsed: there is nothing for the jump
  // list to reopen it with, so leaving it shut would strand its fields.
  const open = sections && id ? sections.isOpen(id) : true;
  const tab = sections?.tabs.find((entry) => id && entry.sectionIds.includes(id));
  const insideContentPanel = useContext(ContentPanelContext);
  const inActiveTab = !tab || sections?.revealAll || tab.id === sections?.activeTab;
  const bodyOpen = tab ? inActiveTab : open;
  const bodyId = id ? `${id}-body` : undefined;

  if (insideContentPanel && tab) {
    return (
      <div id={id} hidden={!inActiveTab} className="border-t border-border px-5 py-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className={cn("mt-5", bodyClassName)}>{children}</div>
      </div>
    );
  }

  return (
    <Card id={id} hidden={!inActiveTab}>
      <CardHeader
        title={title}
        description={description}
        /*
         * Tinted with the existing `--accent` token rather than a new colour:
         * it is already a soft cyan in light mode and a muted teal in dark, so
         * the bar stays legible in both themes and matches the primary without
         * anyone maintaining a second palette.
         *
         * The corners are rounded to match the card because the card does not
         * clip its children — a square-cornered bar would bleed past the
         * rounded edge. When the section is collapsed the header *is* the
         * card, so it rounds at the bottom too.
         */
        className={cn(
          "rounded-t-card bg-accent/70",
          bodyOpen ? undefined : "rounded-b-card border-b-0",
        )}
        action={
          sections && id && !tab ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => sections.toggle(id)}
              aria-expanded={open}
              aria-controls={bodyId}
              className="size-8 px-0"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  open ? "rotate-180" : undefined,
                )}
              />
              <span className="sr-only">
                {open ? `Collapse ${title}` : `Expand ${title}`}
              </span>
            </Button>
          ) : null
        }
      />

      {/*
        `hidden` rather than conditional rendering: the fields must stay in the
        DOM or FormData will not see them when the form is submitted.
      */}
      <CardBody id={bodyId} hidden={!bodyOpen} className={bodyClassName}>
        {children}
      </CardBody>
    </Card>
  );
}

export function ContentManagementPanel({ children }: { children: ReactNode }) {
  const sections = useFormSections();

  return (
    <Card className="border border-border shadow-[var(--shadow-card)]">
      <CardHeader title="Content management" />
      <div className="flex flex-wrap gap-1 px-4 pt-2" role="group" aria-label="Content management sections">
        {sections?.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={sections.activeTab === tab.id}
            aria-controls={tab.sectionIds.join(" ")}
            onClick={() => sections.selectTab(tab.id)}
            className={cn(
              "rounded-t-md border border-transparent px-3 py-2.5 text-sm transition-colors hover:bg-muted",
              sections.activeTab === tab.id
                ? "border-border border-b-card bg-card font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ContentPanelContext.Provider value={true}>
        {children}
      </ContentPanelContext.Provider>
    </Card>
  );
}
