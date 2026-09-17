"use client";

import { useState } from "react";

import { FormSection } from "@/components/cms/form-sections";
import { ImageField } from "@/components/cms/image-field";
import { SeoAnalysis } from "@/components/cms/seo-analysis";
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
  content = "",
  featuredImage = null,
  errors = {},
  id,
}: {
  seo: SeoMeta | null;
  fallbackTitle: string;
  fallbackDescription: string;
  slug: string;
  siteUrl: string;
  /**
   * The record's prose, live, for the analysis below. Optional because not
   * every content type has a body — an activity is a paragraph and a page is
   * a block list — and the checks that need prose degrade to a warning rather
   * than failing when it is absent.
   */
  content?: string;
  featuredImage?: string | null;
  errors?: Record<string, string[]>;
  /** Anchor for the form's section nav. This card is owned here, not by the
   * form, so the form cannot put an id on it from the outside. */
  id?: string;
}) {
  const [focusKeyword, setFocusKeyword] = useState(seo?.focusKeyword ?? "");
  const [title, setTitle] = useState(seo?.title ?? "");
  const [description, setDescription] = useState(seo?.description ?? "");
  const [advanced, setAdvanced] = useState(false);

  const previewTitle = title || fallbackTitle || "Untitled page";
  const previewDescription =
    description || fallbackDescription || "No description set yet.";

  return (
    <FormSection id={id} title="SEO" bodyClassName="space-y-5">
        <Field
          id="seo-focusKeyword"
          label="Focus keyword"
          error={errors["seo.focusKeyword"]?.[0]}
        >
          {(props) => (
            <Input
              {...props}
              name="seo.focusKeyword"
              value={focusKeyword}
              onChange={(event) => setFocusKeyword(event.target.value)}
              placeholder="everest base camp trek"
            />
          )}
        </Field>

        <Field
          id="seo-title"
          label="SEO title"
          error={errors["seo.title"]?.[0]}
          hint={`${title.length} characters`}
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
          hint={`${description.length} characters`}
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

        {/* A rough preview of the Google result, so editors can see length. */}
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Search result preview</p>
          <p className="mt-2 truncate text-sm text-[#1a0dab] dark:text-[#8ab4f8]">
            {previewTitle}
          </p>
          <p className="truncate text-xs text-[var(--success)]">
            {siteUrl}
            {slug === "/" ? "/" : `${slug.replace(/\/+$/, "")}/`}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {previewDescription}
          </p>
        </div>

        <ImageField
          id="seo-ogImage"
          name="seo.ogImage"
          label="Social share image"
          error={errors["seo.ogImage"]?.[0]}
          defaultValue={seo?.ogImage ?? ""}
          placeholder="/uploads/social-card.jpg"
        />

        {/*
          The grade sits under the fields it grades, not above them. It used to
          come second — directly after the focus keyword — which put a wall of
          red and amber bullets between an editor and the two inputs that fix
          most of them.
        */}
        <SeoAnalysis
          focusKeyword={focusKeyword}
          // The analysis grades what will actually be served, so it reads the
          // same fallbacks the preview does rather than the raw fields.
          title={previewTitle}
          description={description || fallbackDescription}
          slug={slug}
          content={content}
          featuredImage={featuredImage}
        />

        <button
          type="button"
          onClick={() => setAdvanced((value) => !value)}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {advanced ? "Hide advanced" : "Show advanced"}
        </button>

        {advanced ? (
          <div className="space-y-5 border-t border-border pt-5">
            <Field
              id="seo-canonical"
              label="Canonical URL"
              error={errors["seo.canonical"]?.[0]}
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
              <Field id="seo-robots" label="Indexing">
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
              label="Do not follow links on this page"
              defaultChecked={
                seo?.noFollow ?? false
              }
            />

            <Field id="seo-ogTitle" label="Social title">
              {(props) => (
                <Input {...props} name="seo.ogTitle" defaultValue={seo?.ogTitle ?? ""} />
              )}
            </Field>

            <Field id="seo-ogDescription" label="Social description">
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
    </FormSection>
  );
}
