"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { saveDefaultSeoAction } from "@/app/admin/(dashboard)/seo/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import type { SiteSettings } from "@/types/settings";

export function DefaultSeoForm({
  settings,
  readOnly,
}: {
  settings: SiteSettings;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDefaultSeoAction, IDLE);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader title="Site-wide defaults" />

        <CardBody className="space-y-4">
          <fieldset disabled={readOnly} className="space-y-4">
            <Field
              id="default-title"
              label="Default title"
              error={errors.title?.[0]}
              hint="Used when a page has no SEO title and no title of its own."
            >
              {(props) => (
                <Input
                  {...props}
                  name="defaultSeo.title"
                  defaultValue={settings.defaultSeo.title ?? ""}
                  placeholder={settings.siteName}
                />
              )}
            </Field>

            <Field
              id="default-description"
              label="Default meta description"
              error={errors.description?.[0]}
            >
              {(props) => (
                <Textarea
                  {...props}
                  name="defaultSeo.description"
                  rows={3}
                  defaultValue={settings.defaultSeo.description ?? ""}
                />
              )}
            </Field>

            <Field
              id="default-ogImage"
              label="Default social image"
              error={errors.ogImage?.[0]}
            >
              {(props) => (
                <Input
                  {...props}
                  name="defaultSeo.ogImage"
                  defaultValue={settings.defaultSeo.ogImage ?? ""}
                  placeholder="/uploads/social-default.jpg"
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="default-robots"
                label="Search engine visibility"
                hint="Choosing “hide” blocks the entire site, whatever individual pages say."
              >
                {(props) => (
                  <Select
                    {...props}
                    name="defaultSeo.robots"
                    defaultValue={settings.defaultSeo.robots}
                  >
                    <option value="index">Allow indexing</option>
                    <option value="noindex">Hide the whole site</option>
                  </Select>
                )}
              </Field>

              <Field id="default-twitterCard" label="Default Twitter card">
                {(props) => (
                  <Select
                    {...props}
                    name="defaultSeo.twitterCard"
                    defaultValue={settings.defaultSeo.twitterCard}
                  >
                    <option value="summary_large_image">Large image</option>
                    <option value="summary">Small summary</option>
                  </Select>
                )}
              </Field>
            </div>
          </fieldset>
        </CardBody>

        {!readOnly ? (
          <CardFooter>
            <Button type="submit" size="sm" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save defaults"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </form>
  );
}
