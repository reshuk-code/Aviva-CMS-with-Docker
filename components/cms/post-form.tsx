"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { savePostAction } from "@/app/admin/(dashboard)/blog/actions";
import { ImageField } from "@/components/cms/image-field";
import { MediaLibraryPanel } from "@/components/cms/media-drawer";
import { RichTextField } from "@/components/cms/rich-text-field";
import { SeoFields } from "@/components/cms/seo-fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { RICH_TEXT_BLOCK } from "@/lib/cms/blocks";
import { slugify } from "@/schemas/common";
import { toDateTimeLocal } from "@/lib/utils";
import type { Post } from "@/types/content";

export interface PostFormProps {
  post: Post | null;
  /** Users who can be credited as the author. */
  authorOptions: { id: string; name: string }[];
  /** Categories already in use, offered as suggestions. */
  categoryOptions: string[];
  tagOptions: string[];
  siteUrl: string;
  /**
   * Where the frontend mounts posts. Used only to render an honest example URL
   * in the slug hint — the CMS stores a bare slug and never assumes a route.
   */
  blogBasePath?: string;
  canPublish: boolean;
}

/**
 * The post editor.
 *
 * Deliberately the page editor minus page-shaped things (parent, order,
 * navigation, template) and plus blog-shaped ones (author, category, tags).
 * An editor who has used one recognises the other.
 */
export function PostForm({
  post,
  authorOptions,
  categoryOptions,
  tagOptions,
  siteUrl,
  blogBasePath = "/blog",
  canPublish,
}: PostFormProps) {
  const [state, formAction, pending] = useActionState(savePostAction, IDLE);

  const [title, setTitle] = useState(post?.title ?? "");
  // null means "follow the title"; a string means the editor typed their own.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    post?.slug ?? null,
  );
  const slug = slugOverride ?? (title ? slugify(title) : "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  // Mirrored out of the editors so the SEO panel grades what is on
  // screen rather than what was last saved.
  const [seoContent, setSeoContent] = useState(post?.content ?? "");
  const [seoImage, setSeoImage] = useState(post?.featuredImage ?? "");

  const [status, setStatus] = useState(post?.status ?? "draft");

  const errors = state.fieldErrors ?? {};

  const bodyBlock = post?.body.find((block) => block.type === RICH_TEXT_BLOCK);
  const initialContent =
    typeof bodyBlock?.props.content === "string"
      ? bodyBlock.props.content
      : (post?.content ?? "");




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

  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      {bodyBlock ? (
        <input type="hidden" name="blockId" value={bodyBlock.id} />
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
                    placeholder="Ten days on the Annapurna Circuit"
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
                    Typically served at{" "}
                    <code className="rounded bg-muted px-1">
                      {siteUrl}
                      {blogBasePath}/{slug || "…"}/
                    </code>{" "}
                    — the exact route is your frontend&apos;s to decide.
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
                        event.target.value ? slugify(event.target.value) : null,
                      )
                    }
                    placeholder="ten-days-annapurna-circuit"
                    className="font-mono text-xs"
                    required
                  />
                )}
              </Field>

              <Field
                id="excerpt"
                label="Excerpt"
                error={errors.excerpt?.[0]}
                hint="Shown in the blog listing, and used as the meta description when you leave that blank."
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
            <CardHeader title="Content" />
            <CardBody>
              <RichTextField
                id="content"
                name="content"
                label="Post content"
                hideLabel
                defaultValue={initialContent}
                error={errors.content?.[0]}
                hint="Reading time is calculated from these words when you save."
                onValueChange={setSeoContent}
              />
            </CardBody>
          </Card>

          <SeoFields
            seo={post?.seo ?? null}
            fallbackTitle={title}
            fallbackDescription={excerpt}
            slug={`${blogBasePath}/${slug}`}
            siteUrl={siteUrl}
            errors={errors}
            content={seoContent}
            featuredImage={seoImage || null}
          />
        </div>

        <div className="space-y-5">
          <MediaLibraryPanel />

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
                      setStatus(event.target.value as Post["status"])
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
                  hint="The post goes live automatically once this time passes."
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="publishedAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocal(post?.publishedAt ?? null)}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={post?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending ? "Saving…" : post ? "Save changes" : "Create post"}
              </Button>

              {post?.readingMinutes ? (
                <p className="text-xs text-muted-foreground">
                  About {post.readingMinutes} minute
                  {post.readingMinutes === 1 ? "" : "s"} to read.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organisation" />
            <CardBody className="space-y-4">
              <Field
                id="authorId"
                label="Author"
                error={errors.authorId?.[0]}
                hint="The byline. Stored as a name too, so it survives the account being removed."
              >
                {(props) => (
                  <Select
                    {...props}
                    name="authorId"
                    defaultValue={post?.authorId ?? ""}
                  >
                    <option value="">Me</option>
                    {authorOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                id="category"
                label="Category"
                error={errors.category?.[0]}
                hint="One per post. Type a new one to create it."
              >
                {(props) => (
                  <>
                    <Input
                      {...props}
                      name="category"
                      defaultValue={post?.category ?? ""}
                      list="post-categories"
                      placeholder="Trekking"
                    />
                    <datalist id="post-categories">
                      {categoryOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>

              <Field
                id="tags"
                label="Tags"
                error={errors.tags?.[0]}
                hint={
                  tagOptions.length
                    ? `Comma separated. In use: ${tagOptions.slice(0, 6).join(", ")}`
                    : "Comma separated, e.g. annapurna, autumn, teahouse."
                }
              >
                {(props) => (
                  <Input
                    {...props}
                    name="tags"
                    defaultValue={(post?.tags ?? []).join(", ")}
                    placeholder="annapurna, autumn"
                  />
                )}
              </Field>

              <ImageField
                id="featuredImage"
                name="featuredImage"
                label="Featured image"
                hint="Pick from the media library, or paste a URL from anywhere."
                defaultValue={post?.featuredImage ?? ""}
                placeholder="/uploads/annapurna.jpg"
                onValueChange={setSeoImage}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </form>
  );
}
