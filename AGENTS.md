# Agent instructions

The rules for working in this repository live in **[`CLAUDE.md`](CLAUDE.md)**.
Read that file before making any change. It is the single source of truth; this
file exists so agents that look for `AGENTS.md` by convention find their way
there rather than guessing.

Short version, in case you read nothing else:

- `npm run check` (typecheck + lint) must pass, and `npm run build` after any
  change that crosses a server/client boundary. Then verify the change in the
  running app — most real bugs here are invisible to the type checker.
- Every mutation begins with `requirePermission()`. Every input crossing a
  trust boundary is parsed by a Zod schema from `schemas/`.
- Business rules go in `lib/cms/repositories/`. Adapters translate; they do not
  decide.
- Content editors submit via `onSubmit`, never `<form action={fn}>` — React
  resets such a form on completion and destroys a rejected save.
- Never commit `.cms-data/`, `public/uploads/` or `.env.local`. They hold real
  content and working credentials.
- Building a client site rather than changing the CMS? Read
  [`docs/BUILDING-A-SITE.md`](docs/BUILDING-A-SITE.md).
