# Docker Hosting Without GitHub

The CMS, PostgreSQL and every uploaded file live on your VPS. No GitHub, Docker
Hub, Supabase or external storage service is involved in running or updating
the site.

On the server, the site folder looks like this:

```
/var/www/your-site.xc1.app/
├── .env                  secrets and settings (keep a copy somewhere safe)
├── docker-compose.yml    uploaded by `npm run deploy`
├── uploads/              every image and video the editors upload
└── backups/              a database dump taken before each deploy (last 10)
```

The database itself lives in the `postgres_data` Docker volume. Browse it with
Adminer (below), not through the files.

## Recommended: `npm run deploy`

The image is built on your computer and streamed to the VPS over SSH. The VPS
never builds anything, and no registry holds the company's code.

### One-time setup

On your computer:

1. Install and start Docker Desktop.
2. Set up an SSH key so deploys do not ask for a password three times:
   `ssh-keygen -t ed25519`, then add `~/.ssh/id_ed25519.pub` to the site's SSH
   user in xCloud.
3. Copy `.env.deploy.example` to `.env.deploy` and fill it in.
4. Check that the SSH user may run Docker: `ssh USER@HOST docker ps`. If that
   says *permission denied*, the user must be added to the `docker` group on the
   VPS (a server admin task in xCloud).

On the VPS, the site folder needs a `.env`. Start from `.env.docker.example`:
set `APP_PORT=6000`, `NEXT_PUBLIC_SITE_URL` to the HTTPS domain,
`POSTGRES_PASSWORD` and `CMS_SESSION_SECRET` to separate values from
`openssl rand -hex 32`. Leave `CMS_IMAGE` out; the deploy writes it.

### Every release

```bash
npm version 0.1.5 --no-git-tag-version   # the version becomes the image tag
npm run deploy
```

The deploy:

1. builds `aviva-cms:<version>` and loads it on the VPS;
2. dumps the database into `backups/`;
3. on the first run after an older release, copies uploads out of the old
   `cms_uploads` volume into `uploads/` (the volume is left in place);
4. swaps in the new `docker-compose.yml` (the previous one is kept as `.bak`),
   sets `CMS_IMAGE` in `.env`, and restarts;
5. waits for the app to answer and prints the logs if it does not.

A brand-new site has no stack to find yet. The deploy refuses rather than guess,
so the very first time run `npm run deploy -- --first`.

**Rolling back.** The last three images stay on the VPS:

```bash
npm run deploy -- --rollback 0.1.3
```

Code rolls back; the database does not. If a release changed data, restore the
matching dump from `backups/`.

Configure xCloud's domain proxy to host port 6000 (container port 3000). Visit
your HTTPS domain and `/admin/setup` on a new site. Do not put `:6000` in the
public URL when using xCloud's HTTPS proxy.

## Viewing the database

Adminer runs beside the app but listens only on the VPS itself, so it is not
reachable from the internet. Open a tunnel from your computer:

```bash
ssh -L 8081:127.0.0.1:8081 USER@HOST
```

Leave that terminal open, browse to <http://localhost:8081>, and sign in with
system **PostgreSQL**, server `postgres`, and the `POSTGRES_USER`,
`POSTGRES_PASSWORD` and `POSTGRES_DB` from the server's `.env`. Tables are
prefixed `cms_`.

Adminer can edit and delete rows directly, skipping every rule the CMS enforces.
Use it to look, and make changes through the admin.

## Viewing uploads

They are ordinary files in `uploads/`, organised as
`uploads/<year>/<month>/<day>/<time>/<file>`. The public URL
`https://your-site/uploads/2026/09/18/062454/photo.jpg` is
`uploads/2026/09/18/062454/photo.jpg` on disk. The app owns the folder, so your
SSH user can read and download files but not delete them; remove media through
the admin so the database stays in step.

## Alternative: build on the VPS

For when Docker Desktop is not available on your computer. The VPS needs enough
memory for a Next.js build.

1. Run `node scripts/package-docker.mjs` on your computer.
2. Upload `dist/cms-docker-source.tar.gz` using SFTP to the site directory.
   This is a source archive, not an image for `docker load`.
3. On the VPS:

```bash
cd /var/www/your-site.xc1.app
tar -xzf cms-docker-source.tar.gz
cp -n .env.docker.example .env
nano .env
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

This path uses `docker-compose.yml`, which keeps uploads in the `cms_uploads`
named volume rather than an `uploads/` folder, and does not include Adminer.

## Persistence and Backups

Deploys and restarts keep the database volume and the `uploads/` folder.
`docker compose down -v` deletes the database volume; never run it on a live
site. Existing PostgreSQL volumes keep their original credentials; changing
`.env` does not rotate the database password.

`backups/` sits on the same disk as the site, so it protects against a bad
release, not a lost server. Periodically copy `backups/`, `uploads/` and `.env`
off the VPS. For a dump outside a deploy:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backups/manual.sql.gz
```

The local storage adapter has a 50 MiB ceiling. CMS validation currently limits
images to 1 MiB, videos to 50 MiB, and other files to 25 MiB; the reverse proxy
must allow the request.

## Local Docker Verification

```bash
docker build -t trekking-cms:local .
node scripts/test-docker.mjs
```

The smoke test uses port 16000 (override with `CMS_TEST_PORT`), a unique
temporary Compose project and a temporary uploads folder. It verifies schema
initialization, setup-page availability, uploads landing in the host folder,
newly added image delivery, byte ranges, path traversal rejection, and
database/upload persistence across restarts. It then removes only that test
project, its disposable volumes and its folder. The `/uploads/[...key]` handler
serves files created after Next.js starts; relying only on the public-folder
snapshot would return 404 for new uploads in production.
