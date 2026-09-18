# Travel CMS Platform

A reusable Next.js starter for travel agencies, trekking companies, tour
operators and hotels. Clients manage content at `/admin`; developers build the
website with ordinary Next.js.

**The CMS is a library sitting beside your app, not a framework replacing it.**
Nothing in `app/(frontend)/` is generated, wrapped or owned by the CMS. You
write React, you fetch data with one import, you render it however you like.

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000/admin** and create the first administrator.

No database and no credentials are needed to start: the default `local` adapter
stores JSON under `.cms-data/`. Switch to Supabase or Neon when the project is
real — that is one line in `cms.config.ts` and a few environment variables, and
no frontend file changes.

---

## The five-minute tour

```ts
import { cms } from "@/lib/cms";

const page   = await cms.pages.getBySlug("/about");
const posts  = await cms.posts.getPublished({ perPage: 10 });
const places = await cms.destinations.getFeatured(6);
const trips  = await cms.tours.getFeatured(6);
const menu   = await cms.navigation.get("main");
const site   = await cms.settings.get();
```

Call these in a Server Component. That is the entire public API surface a
frontend developer needs; everything else — adapters, sessions, permissions,
validation — is behind it.

```
app/(frontend)/          Your website. Replace it entirely.
app/admin/               The CMS. You will rarely open this.
cms.config.ts            The file you edit when starting a client project.
config/routes.ts         Routes you hand-built, declared for the admin.
.env.local               Which database, storage and auth provider to use.
```

---

## What you get

**For the client**, at `/admin`:

| Screen | What it does |
|---|---|
| Pages | Create, edit, duplicate, schedule, preview, trash. Nested pages. |
| Blog | Posts with an author byline, one category, free tags, reading time. |
| Destinations | Places with coordinates, best season, highlights and a gallery. |
| Tour packages | Price, length, difficulty, inclusions, FAQs and a day-by-day itinerary. |
| Activities | What travellers do, tagged onto tour packages. |
| Testimonials | Quotes with a rating and attribution. No page of their own. |
| FAQs | Questions and answers, grouped by category. |
| Enquiries | The inbox behind the contact and booking forms, with triage and internal notes. |
| Media | Upload with drag and drop, folders, alt text, search, picker. |
| Navigation | Menus with nesting, resolved to hrefs for the frontend. |
| SEO | Per-entity and site-wide, with a search-result preview and an audit of pages missing metadata. |
| Redirects | Exact-match, applied before a 404. |
| Header & Footer | Announcement bar, header CTA, footer columns, social and small print. |
| Site Settings | Identity, contact, social, analytics, maintenance mode. |
| Users & Roles | CRUD, role assignment, password reset, a read-only permission matrix. |
| Database & Connections | What backend is in use, and what `.env.local` actually provided. |
| Developer | An inventory of every route, and who owns it. |

Screens that are not built yet — bookings and customers — appear greyed out
with a "Soon" tag rather than as links that 404. See
[`docs/ROADMAP.md`](docs/ROADMAP.md).

**For the developer:** a typed SDK, five swappable database adapters, three
storage providers, four authentication providers, server-enforced permissions,
and no opinion whatsoever about how your pages look.

---

## Starting a client project

1. Copy this repository.
2. Edit `cms.config.ts` — site name, backend, and which modules that client
   needs. Unused modules disappear from the sidebar and their routes 404.
3. Copy `.env.example` to `.env.local` and fill in what you actually use.
4. Build the frontend in `app/(frontend)/`. Replace the placeholder home page.
5. Declare your routes in `config/routes.ts` so the admin can show who owns
   what. `npm run cms:routes` lists the ones you have missed.

### Connecting a real backend

Everything is configured in `.env.local` — there is nothing to type into the
admin. Add the variables, restart, and `/admin/settings/connections` reports
what it detected.

```bash
CMS_DATABASE=supabase        # local | supabase | postgres | neon | mongodb | firebase
CMS_STORAGE=supabase         # local | supabase | s3
CMS_AUTH=credentials         # credentials | supabase | neon | clerk
```

For Supabase or Neon, run `adapters/<provider>/schema.sql` against the project
once before first use. Verified against live projects: the Supabase and Neon
**database** adapters. Everything else is marked honestly in
[`docs/ROADMAP.md`](docs/ROADMAP.md) — including what is not implemented at all.

For one-VPS Docker hosting, use `CMS_DATABASE=postgres` and `CMS_STORAGE=local`.
`npm run deploy` builds the image locally and ships it to the VPS over SSH, where
Postgres, an `uploads/` folder and a private Adminer run beside the app. No
registry or external service is involved.
See [`docs/XCLOUD_DOCKER.md`](docs/XCLOUD_DOCKER.md).

Whichever authentication provider you choose, **roles stay in this CMS**. The
provider proves who someone is; the CMS decides what they may do. Add each
person under `/admin/users` with the email they sign in with, or they are
refused.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server. |
| `npm run build` | Production build. |
| `npm run check` | Typecheck **and** lint. Run this before every commit. |
| `npm run cms:routes` | Lists routes in `app/` missing from `config/routes.ts`. |
| `npm run cms:secret` | Generates a value for `CMS_SESSION_SECRET`. |
| `npm run cms:reset` | Wipes `.cms-data/`. Local adapter only. Irreversible. |

---

## Documentation

| Document | Read it when |
|---|---|
| [`docs/BUILDING-A-SITE.md`](docs/BUILDING-A-SITE.md) | You are building a client website on top of this. Start here. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | You are changing the CMS itself, or need to know why something is the way it is. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | You need to know what is built, what is not, and what was left out deliberately. |
| [`CLAUDE.md`](CLAUDE.md) | You are an AI assistant working in this repository — or a developer who wants the rules in one page. |

---

## Deployment

Any host that runs Next.js. On serverless platforms (Vercel included) note two
things:

- `CMS_SESSION_SECRET` is **required** in production. The app refuses to boot
  without it, rather than silently signing sessions with a key that changes on
  every deploy.
- `CMS_STORAGE=local` writes to the filesystem, which is ephemeral there.
  Uploads will vanish. Use `supabase` or `s3`.

---

## Status

Phase 1 (foundation, pages, SEO, navigation, settings, users) is complete, and
so is Phase 2's content half: the media library, blog, destinations, tour
packages, activities, testimonials, FAQs and enquiries. What remains in Phase 2
is entity links in the menu editor.

There is no test suite yet. The first tests worth writing are listed in the
roadmap.

---

Built by Aviva Web Technologies.
