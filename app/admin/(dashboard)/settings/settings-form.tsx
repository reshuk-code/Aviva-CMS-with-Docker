"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import type { SiteSettings } from "@/types/settings";

export function SettingsForm({
  settings,
  readOnly,
}: {
  settings: SiteSettings;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, IDLE);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={readOnly} className="space-y-5">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field id="siteName" label="Site name" error={errors.siteName?.[0]} required>
              {(props) => (
                <Input {...props} name="siteName" defaultValue={settings.siteName} required />
              )}
            </Field>

            <Field id="tagline" label="Tagline">
              {(props) => (
                <Input {...props} name="tagline" defaultValue={settings.tagline} />
              )}
            </Field>

            <Field
              id="siteUrl"
              label="Public URL"
              error={errors.siteUrl?.[0]}
              hint="Used for canonical URLs, the sitemap and social images."
            >
              {(props) => (
                <Input
                  {...props}
                  name="siteUrl"
                  defaultValue={settings.siteUrl}
                  placeholder="https://example.com"
                />
              )}
            </Field>

            <Field id="timezone" label="Timezone" hint="Used when scheduling content.">
              {(props) => (
                <Input {...props} name="timezone" defaultValue={settings.timezone} />
              )}
            </Field>

            <Field id="logo" label="Logo URL">
              {(props) => (
                <Input {...props} name="logo" defaultValue={settings.logo ?? ""} />
              )}
            </Field>

            <Field id="favicon" label="Favicon URL">
              {(props) => (
                <Input {...props} name="favicon" defaultValue={settings.favicon ?? ""} />
              )}
            </Field>

            <input type="hidden" name="locale" value={settings.locale} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Contact"
            description="Your frontend can render these anywhere with cms.settings.get()."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field
              id="contact-email"
              label="Email"
              error={errors["contact.email"]?.[0]}
            >
              {(props) => (
                <Input
                  {...props}
                  name="contact.email"
                  type="email"
                  defaultValue={settings.contact.email ?? ""}
                />
              )}
            </Field>

            <Field id="contact-phone" label="Phone">
              {(props) => (
                <Input
                  {...props}
                  name="contact.phone"
                  defaultValue={settings.contact.phone ?? ""}
                />
              )}
            </Field>

            <Field id="contact-whatsapp" label="WhatsApp">
              {(props) => (
                <Input
                  {...props}
                  name="contact.whatsapp"
                  defaultValue={settings.contact.whatsapp ?? ""}
                />
              )}
            </Field>

            <Field id="contact-address" label="Address" className="sm:col-span-2">
              {(props) => (
                <Textarea
                  {...props}
                  name="contact.address"
                  rows={2}
                  defaultValue={settings.contact.address ?? ""}
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Social profiles" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["facebook", "Facebook"],
                ["instagram", "Instagram"],
                ["twitter", "X / Twitter"],
                ["youtube", "YouTube"],
                ["tripadvisor", "TripAdvisor"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                id={`social-${key}`}
                label={label}
                error={errors[`social.${key}`]?.[0]}
              >
                {(props) => (
                  <Input
                    {...props}
                    name={`social.${key}`}
                    defaultValue={settings.social[key] ?? ""}
                    placeholder="https://…"
                  />
                )}
              </Field>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Analytics & verification"
            description="Add the IDs here; your layout decides whether and how to load the scripts."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field id="ga" label="Google Analytics ID">
              {(props) => (
                <Input
                  {...props}
                  name="integrations.googleAnalyticsId"
                  defaultValue={settings.integrations.googleAnalyticsId ?? ""}
                  placeholder="G-XXXXXXXXXX"
                />
              )}
            </Field>

            <Field id="gtm" label="Google Tag Manager ID">
              {(props) => (
                <Input
                  {...props}
                  name="integrations.googleTagManagerId"
                  defaultValue={settings.integrations.googleTagManagerId ?? ""}
                  placeholder="GTM-XXXXXXX"
                />
              )}
            </Field>

            <Field id="pixel" label="Facebook Pixel ID">
              {(props) => (
                <Input
                  {...props}
                  name="integrations.facebookPixelId"
                  defaultValue={settings.integrations.facebookPixelId ?? ""}
                />
              )}
            </Field>

            <Field id="gsv" label="Google site verification">
              {(props) => (
                <Input
                  {...props}
                  name="integrations.googleSiteVerification"
                  defaultValue={settings.integrations.googleSiteVerification ?? ""}
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Availability"
            description="Maintenance mode tells search engines to stay away. It does not take the site offline — your frontend decides what to render."
          />
          <CardBody>
            <CheckboxField
              id="maintenanceMode"
              name="maintenanceMode"
              label="Maintenance mode"
              hint="Blocks all crawlers in robots.txt while you are still building."
              defaultChecked={settings.maintenanceMode}
            />
          </CardBody>
        </Card>

        {/* Default SEO lives on this page too, so a single save covers both. */}
        <input type="hidden" name="defaultSeo.title" value={settings.defaultSeo.title ?? ""} />
        <input
          type="hidden"
          name="defaultSeo.description"
          value={settings.defaultSeo.description ?? ""}
        />
        <input
          type="hidden"
          name="defaultSeo.ogImage"
          value={settings.defaultSeo.ogImage ?? ""}
        />
        <input
          type="hidden"
          name="defaultSeo.twitterCard"
          value={settings.defaultSeo.twitterCard}
        />
        <input type="hidden" name="defaultSeo.robots" value={settings.defaultSeo.robots} />

        {!readOnly ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your role can view settings but not change them.
          </p>
        )}
      </fieldset>
    </form>
  );
}
