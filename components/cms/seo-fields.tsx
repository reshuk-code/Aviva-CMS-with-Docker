"use client";

import { useState } from "react";

import { ImageField } from "@/components/cms/image-field";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/field";
import type { SeoMeta } from "@/types/seo";

/**
 * Reusable SEO editor.
 *
 * Shared by every content type, so the fields, help text and search-preview
 * behave identically for pages, tours and posts (§11). Inputs are named
 * `seo.*` and parsed by the matching server action.
 */
export function SeoFields({
  seo,
  fallbackTitle,
  fallbackDescription,
  slug,
  siteUrl,
  errors = {},
}: {
  seo: SeoMeta | null;
  fallbackTitle: string;
  fallbackDescription: string;
  slug: string;
  siteUrl: string;
  errors?: Record<string, string[]>;
}) {
  const [title, setTitle] = useState(seo?.title ?? "");
  const [description, setDescription] = useState(seo?.description ?? "");
  const [advanced, setAdvanced] = useState(false);

  const previewTitle = title || fallbackTitle || "Untitled page";
  const previewDescription =
    description || fallbackDescription || "No description set yet.";

  return (
    <Card>
      <CardHeader
        title="Search engines & sharing"
        description="Leave a field blank to fall back to the page content or your site defaults."
      />

      <CardBody className="space-y-5">
        {/* A rough preview of the Google result, so editors can see length. */}
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Search result preview</p>
          <p className="mt-2 truncate text-sm text-[#1a0dab] dark:text-[#8ab4f8]">
            {previewTitle}
          </p>
          <p className="truncate text-xs text-[var(--success)]">
            {siteUrl}
            {slug === "/" ? "" : slug}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {previewDescription}
          </p>
        </div>

        <Field
          id="seo-title"
          label="SEO title"
          error={errors["seo.title"]?.[0]}
          hint={`${title.length} characters. Around 60 shows in full.`}
        >
          {(props) => (
            <Input
              {...props}
              name="seo.title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={fallbackTitle}
            />
          )}
        </Field>

        <Field
          id="seo-description"
          label="Meta description"
          error={errors["seo.description"]?.[0]}
          hint={`${description.length} characters. Around 155 shows in full.`}
        >
          {(props) => (
            <Textarea
              {...props}
              name="seo.description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={fallbackDescription}
              rows={3}
            />
          )}
        </Field>

        <ImageField
          id="seo-ogImage"
          name="seo.ogImage"
          label="Social share image"
          error={errors["seo.ogImage"]?.[0]}
          hint="Shown when the page is shared. Falls back to the featured image."
          defaultValue={seo?.ogImage ?? ""}
          placeholder="/uploads/social-card.jpg"
        />

        <button
          type="button"
          onClick={() => setAdvanced((value) => !value)}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {advanced ? "Hide advanced SEO" : "Show advanced SEO"}
        </button>

        {advanced ? (
          <div className="space-y-5 border-t border-border pt-5">
            <Field
              id="seo-canonical"
              label="Canonical URL"
              error={errors["seo.canonical"]?.[0]}
              hint="Set this only when this content also lives at another address."
            >
              {(props) => (
                <Input
                  {...props}
                  name="seo.canonical"
                  defaultValue={seo?.canonical ?? ""}
                  placeholder="https://example.com/preferred-url"
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="seo-robots" label="Search engine indexing">
                {(props) => (
                  <Select
                    {...props}
                    name="seo.robots"
                    defaultValue={seo?.robots ?? "index"}
                  >
                    <option value="index">Allow indexing</option>
                    <option value="noindex">Hide from search engines</option>
                  </Select>
                )}
              </Field>

              <Field id="seo-twitterCard" label="Twitter card">
                {(props) => (
                  <Select
                    {...props}
                    name="seo.twitterCard"
                    defaultValue={
                      seo?.twitterCard ??
                      "summary_large_image"
                    }
                  >
                    <option value="summary_large_image">Large image</option>
                    <option value="summary">Small summary</option>
                  </Select>
                )}
              </Field>
            </div>

            <CheckboxField
              id="seo-noFollow"
              name="seo.noFollow"
              label="Ask search engines not to follow links on this page"
              defaultChecked={
                seo?.noFollow ?? false
              }
            />

            <Field id="seo-ogTitle" label="Social title" hint="Defaults to the SEO title.">
              {(props) => (
                <Input {...props} name="seo.ogTitle" defaultValue={seo?.ogTitle ?? ""} />
              )}
            </Field>

            <Field
              id="seo-ogDescription"
              label="Social description"
              hint="Defaults to the meta description."
            >
              {(props) => (
                <Textarea
                  {...props}
                  name="seo.ogDescription"
                  defaultValue={seo?.ogDescription ?? ""}
                  rows={2}
                />
              )}
            </Field>

            <Field
              id="seo-structuredData"
              label="Structured data (JSON-LD)"
              error={errors["seo.structuredData"]?.[0]}
              hint="Advanced. Valid JSON only; it is re-serialised before output."
            >
              {(props) => (
                <Textarea
                  {...props}
                  name="seo.structuredData"
                  defaultValue={
                    seo?.structuredData ??
                    ""
                  }
                  rows={4}
                  className="font-mono text-xs"
                />
              )}
            </Field>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
