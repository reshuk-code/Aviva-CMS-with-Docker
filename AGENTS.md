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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
