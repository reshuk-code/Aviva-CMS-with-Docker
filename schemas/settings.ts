import { z } from "zod";

import { optionalText, optionalUrl } from "./common";

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || z.email().safeParse(value).success,
    "Enter a valid email address.",
  );

export const settingsInputSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required."),
  tagline: z.string().trim().default(""),
  logo: optionalUrl,
  favicon: optionalUrl,
  siteUrl: z
    .string()
    .trim()
    .default("")
    .transform((value) => value.replace(/\/+$/, ""))
    .refine(
      (value) => value === "" || /^https?:\/\//i.test(value),
      "Site URL must start with http:// or https://.",
    ),
  locale: z.string().trim().min(2).default("en"),
  timezone: z.string().trim().min(1).default("Asia/Kathmandu"),
  contact: z
    .object({
      email: optionalEmail,
      phone: optionalText,
      whatsapp: optionalText,
      address: optionalText,
    })
    .prefault({}),
  social: z
    .object({
      facebook: optionalUrl,
      instagram: optionalUrl,
      twitter: optionalUrl,
      youtube: optionalUrl,
      tripadvisor: optionalUrl,
    })
    .prefault({}),
  defaultSeo: z
    .object({
      title: optionalText,
      description: optionalText,
      ogImage: optionalUrl,
      twitterCard: z
        .enum(["summary", "summary_large_image"])
        .default("summary_large_image"),
      robots: z.enum(["index", "noindex"]).default("index"),
    })
    .prefault({}),
  integrations: z
    .object({
      googleAnalyticsId: optionalText,
      googleTagManagerId: optionalText,
      facebookPixelId: optionalText,
      googleSiteVerification: optionalText,
    })
    .prefault({}),
  maintenanceMode: z.coerce.boolean().default(false),
});

export const redirectInputSchema = z
  .object({
    source: z
      .string()
      .trim()
      .min(1, "Source path is required.")
      .transform((value) => (value.startsWith("/") ? value : `/${value}`)),
    destination: z.string().trim().min(1, "Destination is required."),
    permanent: z.coerce.boolean().default(true),
    enabled: z.coerce.boolean().default(true),
  })
  .refine(
    (value) => value.source !== value.destination,
    { path: ["destination"], message: "A redirect cannot point at itself." },
  );

export type SettingsInput = z.input<typeof settingsInputSchema>;
export type RedirectInput = z.input<typeof redirectInputSchema>;
