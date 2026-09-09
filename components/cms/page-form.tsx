"use client";

import { AlertCircle, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { savePageAction } from "@/app/admin/(dashboard)/pages/actions";
import { ImageField } from "@/components/cms/image-field";
import { SeoFields } from "@/components/cms/seo-fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  CheckboxField,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { RICH_TEXT_BLOCK } from "@/lib/cms/blocks";
import { normaliseSlug } from "@/schemas/common";
import { toDateTimeLocal } from "@/lib/utils";
import type { CmsPage } from "@/types/page";

export interface PageFormProps {
  page: CmsPage | null;
  /** Candidate parents, excluding the page being edited and its children. */
  parentOptions: { id: string; title: string; slug: string }[];
  siteUrl: string;
  canPublish: boolean;
}

/**
 * The page editor.
 *
 * Two columns on desktop: content on the left, publishing controls on the
 * right — the arrangement a WordPress editor already knows (§18).
 */
export function PageForm({
  page,
  parentOptions,
  siteUrl,
  canPublish,
}: PageFormProps) {
  const [state, formAction, pending] = useActionState(savePageAction, IDLE);

  const [title, setTitle] = useState(page?.title ?? "");
  // null means "follow the title"; a string means the editor typed their own.
  // Deriving during render avoids an effect that would cascade re-renders.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    page?.slug ?? null,
  );
  const slug = slugOverride ?? (title ? normaliseSlug(title) : "");
  const [excerpt, setExcerpt] = useState(page?.excerpt ?? "");
  const [status, setStatus] = useState(page?.status ?? "draft");
  const [meta, setMeta] = useState<{ key: string; value: string }[]>(
    Object.entries(page?.meta ?? {}).map(([key, value]) => ({ key, value })),
  );

  const errors = state.fieldErrors ?? {};

  const bodyBlock = page?.body.find((block) => block.type === RICH_TEXT_BLOCK);
  const initialContent =
    typeof bodyBlock?.props.content === "string" ? bodyBlock.props.content : "";




  /**
   * Submitting by hand rather than through `<form action=...>`.
   *
   * React resets a form whose action prop is a function once that action
   * completes. On a validation failure that throws away everything the editor
   * typed: uncontrolled inputs fall back to their defaults, and controlled
   * ones are blanked in the DOM without React noticing, which can leave a
   * required field empty and silently block the next submit. Dispatching the
   * same action ourselves skips the reset and leaves the work on screen.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}
      {bodyBlock ? (
        <input type="hidden" name="blockId" value={bodyBlock.id} />
      ) : null}

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-5">
              <Field id="title" label="Title" error={errors.title?.[0]} required>
                {(props) => (
                  <Input
                    {...props}
                    name="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="About us"
                    className="text-base"
                    required
                  />
                )}
              </Field>

              <Field
                id="slug"
                label="Slug"
                error={errors.slug?.[0]}
                hint={
                  <>
                    The page will be served at{" "}
                    <code className="rounded bg-muted px-1">
                      {siteUrl}
                      {slug || "/…"}
                    </code>
                  </>
                }
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    name="slug"
                    value={slug}
                    onChange={(event) => setSlugOverride(event.target.value)}
                    onBlur={(event) =>
                      setSlugOverride(
                        event.target.value ? normaliseSlug(event.target.value) : null,
                      )
                    }
                    placeholder="/about"
                    className="font-mono text-xs"
                    required
                  />
                )}
              </Field>

              <Field
                id="excerpt"
                label="Short description"
                error={errors.excerpt?.[0]}
                hint="Used in listings, and as the meta description when you leave that blank."
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="excerpt"
                    value={excerpt}
                    onChange={(event) => setExcerpt(event.target.value)}
                    rows={2}
                  />
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Content"
              description="Markdown-lite: # headings, - lists, **bold**, *italic*, [links](/url)."
            />
            <CardBody>
              <label htmlFor="content" className="sr-only">
                Page content
              </label>
              <Textarea
                id="content"
                name="content"
                defaultValue={initialContent}
                rows={16}
                className="font-mono text-xs leading-relaxed"
                placeholder={"## Who we are\n\nWe are a Kathmandu-based trekking operator…"}
              />
            </CardBody>
          </Card>

          <SeoFields
            seo={page?.seo ?? null}
            fallbackTitle={title}
            fallbackDescription={excerpt}
            slug={slug || "/"}
            siteUrl={siteUrl}
            errors={errors}
          />

          <Card>
            <CardHeader
              title="Custom metadata"
              description="Project-specific key/value pairs your frontend can read from page.meta."
            />
            <CardBody className="space-y-3">
              {meta.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No custom metadata on this page.
                </p>
              ) : null}

              {meta.map((entry, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="sr-only" htmlFor={`metaKey-${index}`}>
                      Metadata key
                    </label>
                    <Input
                      id={`metaKey-${index}`}
                      name="metaKey"
                      value={entry.key}
                      placeholder="key"
                      onChange={(event) =>
                        setMeta((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, key: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label className="sr-only" htmlFor={`metaValue-${index}`}>
                      Metadata value
                    </label>
                    <Input
                      id={`metaValue-${index}`}
                      name="metaValue"
                      value={entry.value}
                      placeholder="value"
                      onChange={(event) =>
                        setMeta((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, value: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setMeta((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove metadata row ${index + 1}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMeta((current) => [...current, { key: "", value: "" }])}
              >
                <Plus className="size-4" />
                Add field
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-4">
              <Field id="status" label="Status" error={errors.status?.[0]}>
                {(props) => (
                  <Select
                    {...props}
                    name="status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as CmsPage["status"])
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published" disabled={!canPublish}>
                      Published
                    </option>
                    <option value="scheduled" disabled={!canPublish}>
                      Scheduled
                    </option>
                    <option value="trash">Trash</option>
                  </Select>
                )}
              </Field>

              {!canPublish ? (
                <p className="text-xs text-muted-foreground">
                  Your role can save drafts but not publish them.
                </p>
              ) : null}

              {status === "scheduled" ? (
                <Field
                  id="publishedAt"
                  label="Publish at"
                  error={errors.publishedAt?.[0]}
                  hint="The page goes live automatically once this time passes."
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="publishedAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocal(page?.publishedAt ?? null)}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={page?.publishedAt ?? ""}
                />
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button type="submit" disabled={pending}>
                  <Save className="size-4" />
                  {pending ? "Saving…" : page ? "Save changes" : "Create page"}
                </Button>

                {page ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={
                        page.status === "published"
                          ? page.slug
                          : `/api/cms/preview?slug=${encodeURIComponent(page.slug)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      {page.status === "published" ? "View page" : "Preview"}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organisation" />
            <CardBody className="space-y-4">
              <Field
                id="parentId"
                label="Parent page"
                error={errors.parentId?.[0]}
                hint="Used for breadcrumbs and menu nesting. It does not change the slug."
              >
                {(props) => (
                  <Select {...props} name="parentId" defaultValue={page?.parentId ?? ""}>
                    <option value="">No parent</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                id="order"
                label="Order"
                error={errors.order?.[0]}
                hint="Lower numbers come first."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="order"
                    type="number"
                    defaultValue={page?.order ?? 0}
                  />
                )}
              </Field>

              <CheckboxField
                id="showInNavigation"
                name="showInNavigation"
                label="Offer in navigation menus"
                hint="Makes this page easy to pick in the menu editor."
                defaultChecked={
                  page?.showInNavigation ??
                  false
                }
              />

              <Field
                id="template"
                label="Template hint"
                hint="Optional. Your frontend can read page.template to vary the layout."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="template"
                    defaultValue={page?.template ?? ""}
                    placeholder="landing"
                  />
                )}
              </Field>

              <ImageField
                id="featuredImage"
                name="featuredImage"
                label="Featured image"
                hint="Pick from the media library, or paste a URL from anywhere."
                defaultValue={page?.featuredImage ?? ""}
                placeholder="/uploads/hero.jpg"
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </form>
  );
}
