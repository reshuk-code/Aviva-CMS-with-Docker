# Building a client site

For the developer — or the AI assistant — building a website on top of this
CMS. It assumes you know Next.js and have never seen this repository.

If you are changing the CMS itself rather than using it, read
[`CLAUDE.md`](../CLAUDE.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## The one thing to understand first

**The CMS does not own your website.** It has no theme, no layout, no page
builder and no opinion about your markup. It is a typed data source with an
admin interface attached.

Concretely: `app/(frontend)/` is yours. Delete the placeholder, build whatever
the client's designer drew, and fetch content with one import. Nothing you write
there needs to know which database is behind it, and switching Supabase for Neon
does not touch a single frontend file.

---

## Step 0 — Branch, do not fork the frontend out

`main` is the reusable template. It must always build on a fresh clone, so
nothing in `app/` is gitignored — a repository whose source is half-ignored is
worse than one carrying a placeholder.

Client work goes on its own branch:

```bash
git checkout -b client/<name>       # e.g. client/mission-himalaya
```

The next developer starting a different client branches from `main` again and
gets a working, empty starting point.

**What `main` carries, and why it is not client code:**

| Path | Whose | Safe to delete on a client branch? |
|---|---|---|
| `app/(frontend)/layout.tsx` | yours | Replace, do not delete — the route group needs a layout |
| `app/(frontend)/page.tsx` | yours | Yes, replace wholesale |
| `app/(frontend)/contact/` | yours | Yes — it is a reference example |
| `app/(frontend)/[...slug]/` | **the CMS** | **No.** This is the dynamic page renderer. Delete it and every page an editor creates 404s |

Only the last row is CMS machinery. The rest is a placeholder that exists so
the template runs before anyone has written a line of client markup.

Do not "clean up" `main` by deleting the placeholder either: with no `page.tsx`
the site has no `/` route, and with no `layout.tsx` the build fails.

---

## Step 1 — Configure the project

`cms.config.ts` is the file you edit when starting a client:

```ts
export default defineCmsConfig({
  siteName: "Himalaya Treks",
  siteUrl: "https://himalayatreks.com",

  database: "local",   // switch to "supabase" once the project is real
  storage: "local",

  modules: {
    pages: true,
    blog: true,
    destinations: true,
    tours: true,
    bookings: false,   // this client does not take online bookings
    // …
  },
});
```

Switching a module off removes it from the admin sidebar and 404s its routes.
A hotel does not sell trekking packages; an agency that takes enquiries by
phone has no use for `bookings`. Turn off what the client will never open — an
admin full of empty screens looks unfinished.

`CMS_DATABASE`, `CMS_STORAGE` and `NEXT_PUBLIC_SITE_URL` in `.env.local`
override the file at runtime, so staging and production can differ without a
code change.

---

## Step 2 — Fetch content

One import, in a Server Component:

```tsx
import { cms } from "@/lib/cms";

export default async function HomePage() {
  const [places, posts, site] = await Promise.all([
    cms.destinations.getFeatured(6),
    cms.posts.getPublished({ perPage: 3 }),
    cms.settings.get(),
  ]);

  return (
    <main>
      <Hero title={site.tagline} />
      <DestinationGrid destinations={places} />
      <LatestPosts posts={posts} />
    </main>
  );
}
```

The SDK is server-only by design: every method reaches a database with
privileged credentials. Fetch in a Server Component, a Server Action or a route
handler, then pass plain data down to Client Components.

### What is available

| Namespace | Main methods |
|---|---|
| `cms.pages` | `getBySlug`, `getPublished`, `getNavigable`, `tree`, `list` |
| `cms.posts` | `getBySlug`, `getPublished`, `categories`, `tags`, `list` |
| `cms.destinations` | `getBySlug`, `getPublished`, `getFeatured`, `countries`, `options` |
| `cms.tours` | `getBySlug`, `getPublished`, `getFeatured`, `getByDestination` |
| `cms.media` | `list`, `get`, `getMany`, `folders` |
| `cms.navigation` | `get(key)` — menu items resolved to hrefs; `listMenus` |
| `cms.settings` | `get`, `siteUrl` |
| `cms.redirects` | `match(pathname)` |
| `cms.seo` | `get(source)` — resolves a record's SEO over the site defaults |
| `cms.users`, `cms.activity` | Admin-side reads |

Read methods that serve the public — `getBySlug`, `getPublished`,
`getFeatured` — already exclude drafts and honour scheduling. A scheduled post
becomes visible the moment its time passes, with no cron job. Use the
`…IncludingDrafts` variants only for preview.

---

## Step 3 — Route your content

The CMS serves **pages** automatically through the catch-all at
`app/(frontend)/[...slug]/`. A page with slug `/about` is live at `/about` with
no work from you.

Everything else has a bare slug and no route of its own, because the CMS
refuses to guess your URL layout. You mount it:

```tsx
// app/(frontend)/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { cms } from "@/lib/cms";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await cms.posts.getBySlug(slug);
  if (!post) notFound();

  return <article>{/* your markup */}</article>;
}
```

**A hand-written route always wins.** If you build `app/(frontend)/tours/`, it
serves `/tours` even when a CMS page claims that slug. The catch-all only sees
paths nothing else matched, and a redirect only fires on what would otherwise
404 — so a redirect can never shadow real content.

Declare what you build in `config/routes.ts`:

```ts
export default defineRoutes([
  { path: "/", label: "Home", cmsMetadata: true },
  { path: "/tours", label: "Tour packages", description: "Hand-built listing." },
]);
```

You are not obliged to. Registering buys two things: the route appears in the
admin's inventory at `/admin/developer` instead of looking missing, and with
`cmsMetadata: true` the client can manage its SEO while you keep the rendering.
`npm run cms:routes` lists routes you have forgotten.

---

## Step 4 — Wire up SEO

For a CMS page, the catch-all already generates metadata. For your own routes,
bridge to the Next.js Metadata API:

```tsx
import type { Metadata } from "next";
import { generateCmsMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await cms.posts.getBySlug(slug);
  if (!post) return { title: "Not found" };

  return generateCmsMetadata({
    title: post.title,
    path: `/blog/${post.slug}`,
    description: post.excerpt,
    image: post.featuredImage,
    seo: post.seo,
  });
}
```

`generateCmsMetadata` resolves the record's own SEO fields over the site
defaults and returns a Next.js `Metadata` object. `structuredDataScript()` from
the same module renders the JSON-LD `<script>` when a record carries one.

Site-wide defaults, the title template and social images come from Site
Settings, so an editor filling in one field in the admin changes every page
that falls back to it. `sitemap.xml` and `robots.txt` are generated from
published CMS content plus your declared routes.

---

## Step 5 — Images

Media items store a plain URL, whichever storage provider is behind them. That
means `<img src={post.featuredImage}>` just works, and a URL typed by hand —
pointing at a CDN the CMS does not manage — is equally valid.

If you use `next/image`, add the storage host to `remotePatterns` in
`next.config.ts`. The CMS deliberately does not, because it cannot know which
provider your project chose.

Media records also carry `altText`, `caption`, `width` and `height`. Width and
height are always `null` today: reading image dimensions needs a decoder, and
this template ships no native dependency.

---

## Step 6 — Blocks

A page body is an array of blocks, and the admin builds it with the block
editor: add, reorder, remove. These ship built in:

| Block | Reads |
|---|---|
| Text | Formatted prose from the rich text editor |
| Hero | its own props |
| Image, Gallery | its own props |
| Call to action | its own props |
| Destination grid | `cms.destinations.getPublished()` |
| Trip grid | `cms.tours.getPublished()` |
| Activity grid | `cms.activities.getPublished()` |
| Blog grid | `cms.posts.getPublished()` |
| Testimonials | `cms.testimonials.getPublished()` |
| FAQs | `cms.faqs.getPublished()` |
| Contact form | files to `cms.enquiries.create()` |

The grid blocks query at render time, so an editor who publishes a destination
sees it appear in every Destination grid on the site.

### Adding your own block

Two steps, in two files, because the registry is data and the rendering is not.

**1. Register the schema and its editor fields** — anywhere that runs on both
server and client (`lib/cms/blocks.ts`, or your own module imported by it):

```ts
registerBlock({
  name: "price-table",
  label: "Price table",
  description: "Shown in the block picker.",
  schema: z.object({
    heading: z.string().default(""),
    currency: z.string().default("USD"),
  }),
  fields: [
    { name: "heading", label: "Heading", kind: "text" },
    { name: "currency", label: "Currency", kind: "text" },
  ],
});
```

`kind` is one of `text`, `textarea`, `number`, `boolean`, `image`, `gallery`,
`select` (with `options`). That is all the admin needs — you do not write a
form.

**2. Render it** in `components/frontend/blocks/index.tsx`:

```tsx
export const BLOCK_COMPONENTS: Record<string, BlockComponent> = {
  // …
  "price-table": PriceTable,
};
```

The component may be an async Server Component and query the SDK directly; the
grids above do exactly that.

**Do not put components in the registry.** `lib/cms/blocks.ts` is imported by
the block editor, which runs in the browser — a component there would drag the
CMS SDK and your database driver into the client bundle.

A block whose type is not in the map, or whose props fail their schema, is
skipped rather than crashing the page, and its props stay on the record. That
is what makes it safe to remove a block from the code.

---

## Working with the client's roles

| Role | Can |
|---|---|
| Super Admin | Everything, including roles and developer settings. |
| Admin | Runs the site day to day. No role changes, no destructive database actions. |
| Editor | Owns the content and can publish it. No users or settings writes. |
| Author | Writes and edits content. **Cannot publish**, and cannot delete anything except media. |
| Viewer | Read-only. For a client who just wants to look. |

Permissions are enforced on the server. The UI hides controls a user cannot
use, but that is a courtesy, not the boundary.

If you use an external identity provider (Supabase Auth, Neon Auth, Clerk),
roles still live in this CMS. The provider proves identity; the CMS decides
capability. Every person must exist under `/admin/users` with the email they
sign in with, or they are refused.

---

## Local development notes

- The `local` database adapter writes JSON to `.cms-data/`. It is for
  development only — no concurrency control, no migrations. `npm run cms:reset`
  wipes it.
- `CMS_STORAGE=local` writes to `public/uploads/`. On a serverless host each
  instance gets its own disk, so uploads vanish. Use Supabase Storage or S3.
- `CMS_SESSION_SECRET` is generated for you in development and **required** in
  production; the app refuses to boot without it rather than silently signing
  sessions with a key that changes on every deploy.
- Neither directory is committed. Both hold real client content.

---

## Before handing over

- [ ] `npm run check` and `npm run build` are clean.
- [ ] `npm run cms:routes` reports nothing undeclared.
- [ ] Every module the client will not use is switched off in `cms.config.ts`.
- [ ] A real backend is configured, and `/admin/settings/connections` confirms
      it detected the credentials.
- [ ] `CMS_SESSION_SECRET` is set in the production environment.
- [ ] Storage is *not* `local` if the site is deployed serverless.
- [ ] The client has a Super Admin account and at least one Editor.
- [ ] `/admin/seo` shows no pages missing metadata.

---

## When something is missing

Check [`ROADMAP.md`](ROADMAP.md) before building around a gap: it says what is
built, what is not, and what was left out deliberately — a media library that
cannot tell which pages use a file, coordinates without a map widget, no test
suite. The list is honest on purpose, so nobody spends a day discovering it.
