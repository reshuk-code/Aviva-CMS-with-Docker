# Docker Hosting Without GitHub

The CMS and PostgreSQL run on your VPS. Uploaded images and videos live in the
`cms_uploads` Docker volume; database records live in `postgres_data`. No GitHub,
Supabase, or external storage service is required.

## Upload Once and Build on the VPS

This option requires no registry account or Docker installation on your computer.
The VPS must already have Docker and Docker Compose.

1. Run `node scripts/package-docker.mjs` on your computer.
2. Upload `dist/cms-docker-source.tar.gz` using SFTP to the xCloud site directory.
   This is a source archive, not an image for `docker load`.
3. In the VPS terminal, run:

```bash
cd /var/www/cmssite-vcp0.xc1.app
tar -xzf cms-docker-source.tar.gz
cp -n .env.docker.example .env
nano .env
```

Keep existing credentials if retrying with an existing database volume. Set
`APP_PORT=6000`, `NEXT_PUBLIC_SITE_URL` to your HTTPS domain, `POSTGRES_PASSWORD`
to a random password, and `CMS_SESSION_SECRET` to at least 32 random characters.
Run `openssl rand -hex 32` separately for each secret. Then start Docker:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Configure xCloud's domain proxy to host port 6000 (container port 3000). Visit
your HTTPS domain and `/admin/setup`. Do not put `:6000` in the public URL when
using xCloud's HTTPS proxy.

The source archive must be extracted into the site directory before xCloud can
build from pasted YAML. For a creation wizard that only accepts pasted YAML,
use the published-image option below instead. YAML cannot create a custom app
image without access to its code.

## Paste-Only Deployment with a Published Image

Paste `docker-compose.xcloud.yml` into xCloud's Custom Docker Compose field.
It has no local build context, SQL bind mount, or `env_file` dependency. The
image includes the schema and initializes the database before starting the app.

First build and publish on a Docker-enabled machine (the VPS is fine). Replace
`YOUR_DOCKERHUB_USER` with a Docker Hub repository you control:

```bash
docker login
docker build -t YOUR_DOCKERHUB_USER/trekking-cms:1 .
docker push YOUR_DOCKERHUB_USER/trekking-cms:1
```

Build on the target VPS CPU architecture, or use Docker Buildx for that platform.
For a private repository, authenticate Docker on the VPS before deployment.
Publish publicly only if the app code and bundled public assets may be public.
Credentials and live uploads are excluded from the image build context.

Enable **Provide Environment File (.env)** in xCloud and enter:

```dotenv
CMS_IMAGE=YOUR_DOCKERHUB_USER/trekking-cms:1
APP_PORT=6000
NEXT_PUBLIC_SITE_URL=https://your-site.xc1.app
POSTGRES_DB=cms
POSTGRES_USER=cms
POSTGRES_PASSWORD=REPLACE_WITH_RANDOM_PASSWORD
CMS_SESSION_SECRET=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

The image must exist first; the example name is not a published image. The
registry distributes the app. Your database and uploads remain on the VPS.

## Persistence and Backups

Rebuilds retain both named volumes. `docker compose down -v` deletes them.
Existing PostgreSQL volumes retain their original credentials; changing `.env`
does not rotate the database password.

Back up the database from the project directory:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > cms.sql
```

Also back up the uploads volume (find its project-prefixed name with
`docker volume ls`) and keep a secure copy of `.env`. The local storage adapter
has a 50 MiB ceiling. CMS validation currently limits images to 1 MiB, videos
to 50 MiB, and other files to 25 MiB; the reverse proxy must allow the request.

## Local Docker Verification

```bash
docker build -t trekking-cms:local .
node scripts/test-docker.mjs
```

The smoke test uses port 16000 (override with `CMS_TEST_PORT`) and a unique
temporary Compose project. It verifies schema initialization, setup-page
availability, newly added image delivery, byte ranges, path traversal rejection,
and database/upload persistence across restarts. It then removes only that test
project and its disposable volumes. The `/uploads/[...key]` handler serves files
created after Next.js starts; relying only on the public-folder snapshot would
return 404 for new uploads in production.
