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

## Step 6 — Blocks (optional)

Page bodies are an array of blocks. Today there is one built-in, `rich-text`,
rendered by `components/frontend/rich-text.tsx` with a deliberately small
Markdown subset — headings, lists, bold, italic, links.

To add a project-specific block:

```ts
registerBlock({
  name: "tour-grid",
  label: "Tour grid",
  schema: z.object({ destinationId: z.string(), limit: z.number().default(6) }),
  component: TourGrid,
});
```

The full block editor — adding, reordering and removing blocks in the admin —
is Phase 3. Until then a page body holds a single rich-text block, and the
stored shape will not change when the editor arrives.

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
