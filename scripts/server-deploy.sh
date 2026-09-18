#!/usr/bin/env bash
# Runs on the VPS. scripts/deploy.mjs streams it over SSH after the image has
# been loaded and the new compose file uploaded as docker-compose.yml.next.
set -euo pipefail

dir=$1
image=$2
first=$3

cd "$dir"
[ -f .env ] || { echo "[server] No .env in $dir. Create it first (see docs/XCLOUD_DOCKER.md)."; exit 1; }
docker image inspect "$image" >/dev/null 2>&1 || { echo "[server] Image $image is not on this server."; exit 1; }

# Reuse whatever project name the running stack was started under (xCloud may
# not use the folder name). Guessing wrong would start a second, empty
# database next to the real one.
project=$(docker ps -a --filter "label=com.docker.compose.project.working_dir=$(pwd -P)" \
  --format '{{.Label "com.docker.compose.project"}}' | head -n1)
if [ -z "$project" ]; then
  if [ "$first" != "1" ]; then
    echo "[server] No existing stack found for $dir."
    echo "[server] If this really is the first deploy, rerun with: npm run deploy -- --first"
    exit 1
  fi
  project=$(basename "$(pwd -P)" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')
fi
dc() { docker compose -p "$project" "$@"; }

# Every site on this VPS needs its own ports. Check before anything changes:
# a clash found by `docker compose up` would leave the site half switched over.
env_value() {
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d "\"' \r"
}
ours() {
  docker ps --filter "label=com.docker.compose.project=$project" --format '{{.Ports}}' | grep -qE "[:.]$1->"
}
busy() {
  if command -v ss >/dev/null 2>&1; then
    ss -Hltn "sport = :$1" 2>/dev/null | grep -q . && return 0
  fi
  docker ps --format '{{.Ports}}' | grep -qE "[:.]$1->"
}
clash=0
for name in APP_PORT ADMINER_PORT; do
  default=6000; [ "$name" = ADMINER_PORT ] && default=8081
  port=$(env_value "$name"); port=${port:-$default}
  # This site's own running containers hold its ports until they are replaced.
  if ! ours "$port" && busy "$port"; then
    free=$((port + 1))
    while busy "$free"; do free=$((free + 1)); done
    echo "[server] $name=$port is already in use by something else on this server."
    echo "[server] Set $name=$free (or another free port) in $dir/.env."
    [ "$name" = APP_PORT ] && echo "[server] Then point xCloud's domain proxy at port $free."
    clash=1
  fi
done
[ "$clash" = 0 ] || exit 1

mkdir -p backups
if [ -n "$(dc ps -q postgres 2>/dev/null)" ]; then
  backup="backups/cms-$(date +%Y%m%d-%H%M%S).sql.gz"
  dc exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$backup"
  echo "[server] Database backed up to $backup"
  ls -1t backups/cms-*.sql.gz | tail -n +11 | xargs -r rm --
fi

# Earlier releases kept uploads in the cms_uploads named volume. Copy them out
# once, while the old container is still running, into the visible folder.
if [ ! -d uploads ]; then
  mkdir uploads
  if [ -n "$(dc ps -q app 2>/dev/null)" ]; then
    dc cp app:/app/public/uploads/. uploads/
    echo "[server] Copied existing uploads into $dir/uploads"
  fi
fi

[ -f docker-compose.yml ] && cp docker-compose.yml docker-compose.yml.bak
mv docker-compose.yml.next docker-compose.yml
if grep -q '^CMS_IMAGE=' .env; then
  sed -i "s|^CMS_IMAGE=.*|CMS_IMAGE=$image|" .env
else
  printf '\nCMS_IMAGE=%s\n' "$image" >> .env
fi

dc up -d --remove-orphans
for _ in $(seq 1 45); do
  if dc exec -T app wget -q -O /dev/null http://127.0.0.1:3000/admin/login 2>/dev/null; then
    dc ps
    # Keep the three newest releases for --rollback; older ones only take disk.
    docker images aviva-cms --format '{{.Tag}}' | sort -V -r | tail -n +4 \
      | xargs -r -I{} docker rmi "aviva-cms:{}" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done
echo "[server] The app did not become ready. Recent logs:"
dc logs --tail=60 app
exit 1
