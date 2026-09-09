# Roadmap

Status as of the Phase 1 delivery. Anything not marked **Done** is not built —
the admin shows unbuilt screens greyed out rather than as links that 404.

---

## Phase 1 — Foundation · **Done**

| Item | Status | Notes |
|---|---|---|
| Project architecture | Done | `docs/ARCHITECTURE.md` |
| CMS configuration | Done | `cms.config.ts`, module switches, env overrides |
| Database adapter interface | Done | `lib/database/adapter.ts` |
| Local JSON adapter | Done | Zero-config development. Not for production. |
| Supabase adapter | Done | **Verified** against a live Supabase project |
| Authentication foundation | Done | `AuthAdapter`, scrypt, signed-cookie sessions |
| Roles & permissions | Done | Server-enforced; read-only matrix at `/admin/roles` |
| Admin layout | Done | Configurable sidebar, light/dark, responsive |
| First-run setup | Done | `/admin/setup` creates the first super admin |
| Pages | Done | Create, edit, duplicate, trash, delete, schedule, preview |
| Dynamic CMS routing | Done | `app/(frontend)/[...slug]` |
| Developer route registry | Done | `config/routes.ts`, `/admin/developer`, `npm run cms:routes` |
| SEO | Done | Per-entity + site defaults, Metadata API bridge, audit list |
| Sitemap & robots | Done | Generated from CMS content and declared routes |
| Redirects | Done | Exact-match, applied before 404 |
| Navigation | Done | Menus with nesting, resolved to hrefs for the frontend |
| Site settings | Done | Identity, contact, social, analytics, maintenance |
| Users | Done | CRUD, role assignment, password reset, self-service change |
| Database status | Done | `/admin/database` |
| Activity log | Done | Feeds the dashboard |
| **Connections screen** | Done | `/admin/settings/connections`: read-only status of what `.env.local` provides |
| Neon adapter | Done | **Verified** against a live Neon project |
| Supabase / Neon / Clerk auth | Done | Unverified against live accounts |
| Setup tools | Done | Apply schema, copy data between backends. Development only. |

**Not in Phase 1, by design:** the media library, the tourism content models,
and any block editor beyond a single rich-text block.

---

## Phase 2 — Content

The tourism-specific half. Types are already defined in `types/content.ts`;
these items are the repositories, admin screens and SDK namespaces.

- [x] **Media library** — upload (multi-file, drag and drop), flat folders, alt
      text, caption, search and type filters, copy-URL, delete.
      `/admin/media`, `cms.media`, verified against Supabase Storage.
- [x] **Media picker** wired into the featured-image and OG-image fields via
      `components/cms/image-field.tsx`. Fields still store a plain URL, so a
      CDN address typed by hand stays valid.
- [x] **Blog** — posts with drafts, scheduling, trash and duplication;
      author byline; one category and free tags per post, filterable in the
      list. `/admin/blog`, `cms.posts`. Slugs are bare, not paths: the project
      mounts posts at whatever route it wants.
- [x] **Destinations** — name, place, coordinates, best season, highlights,
      gallery, featured flag and display order, with the same draft/schedule/
      trash lifecycle as pages. `/admin/destinations`, `cms.destinations`.
- [x] **Tour packages** — pricing with a compare-at price, duration,
      difficulty, group size, altitude, best season, highlights, inclusions and
      exclusions, FAQs, gallery, and a destination reference.
      `/admin/tours`, `cms.tours`.
- [x] **Itinerary editor** — day by day, reorderable, with accommodation,
      meals, altitude, walking time and per-day photographs. Days are
      renumbered 1..n on save, and the schema rejects an itinerary whose length
      contradicts the headline duration.
- [ ] **Activities**, **Testimonials**, **FAQs**.
- [ ] **Enquiries** — inbox for the contact/booking form.
- [ ] Entity links in the menu editor (`target: "entity"`, stubbed today).
- [ ] SDK namespaces: `cms.testimonials`, `cms.faqs`, `cms.enquiries`.
      (`cms.media`, `cms.posts`, `cms.destinations` and `cms.tours` are done.)

**A tour's `activityIds` is stored but has no picker yet** — there is nothing
to choose from until the activities module lands. Existing values round-trip
untouched.

**Categories and tags are strings on the post, not their own collections.**
A travel blog has a dozen categories that change twice a year; two more tables
and two more admin screens would cost more than they return. `cms.posts`
derives the facet lists from the posts themselves. Revisit if a client ever
needs per-category descriptions or SEO.

**Not done in the media library, deliberately:** image dimensions (needs a
decoder; the CMS ships no native dependency), nested folders, replacing a file
in place, and knowing which pages reference a file — fields store URLs, not
media ids, so that check would be a guess. The last one is the reason the
delete dialog says what it says.

---

## Phase 3 — Editing experience

- [ ] **Block editor** — add, reorder and remove blocks on a page.
- [ ] **Built-in blocks** — hero, image, gallery, video, CTA, features,
      testimonials, FAQ, tour grid, destination grid, blog grid, contact form,
      map, custom component.
- [ ] **Block registration docs** for project-specific blocks.
- [ ] **Structured data** — automatic JSON-LD for tours (`Trip`/`Product`),
      destinations (`Place`) and posts (`Article`), on top of today's manual field.
- [ ] **Revision history** with restore. The activity log records that a change
      happened; this records what changed.
- [ ] **Wildcard redirects** and hit counters.
- [ ] **Autosave** in the page editor.
- [ ] **Bulk actions** in list views.

---

## Phase 4 — Platform

- [ ] **Verify the remaining live integrations.** The Supabase and Neon
      *database* adapters are verified. Still untested against real accounts:
      - Supabase Auth sign-in
      - Neon Auth (Stack Auth) sign-in
      - Clerk sign-in, provider and middleware wiring
- [ ] **Media migration.** Copying between backends moves database records but
      not files held by the storage adapter.
- [ ] **Verify the MongoDB adapter** against a live cluster; add index creation
      at `init()`.
- [ ] **Implement the Firebase adapter**, or formally drop it. The file
      documents what makes Firestore awkward for this contract.
- [ ] **S3 storage adapter** with presigned browser uploads.
- [ ] **Custom roles** — edit permission bundles from the admin.
- [ ] **Per-record ownership** so an author edits only their own drafts.
- [ ] **Session revocation** ("sign out everywhere").
- [ ] **CLI** — `create-travel-site <name>` to scaffold a client project.
- [ ] **Multi-tenancy** if it is ever needed. Seams are noted in the code; the
      MVP deliberately does not implement it.
- [ ] **Tests.** There is no test suite yet. The first ones worth writing:
      `lib/database/query.ts` (filter/sort/paginate semantics), slug
      normalisation, the permission matrix, and publication-window logic.
- [ ] **i18n.** `locales` and `defaultLocale` exist in config so the data model
      can absorb translations without a migration; nothing consumes them yet.

---

## Deliberately out of scope

- A drag-and-drop visual builder that competes with Elementor.
- Plugin marketplaces, themes, or anything resembling WordPress's extension
  ecosystem.
- Microservices. This is one Next.js app.
- Replacing developers' freedom to write ordinary React and query their own data.
