FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nextjs /app/scripts/docker-start.mjs ./scripts/docker-start.mjs
COPY --from=builder --chown=nextjs:nextjs /app/adapters/postgres/schema.sql ./adapters/postgres/schema.sql

RUN mkdir -p /app/public/uploads && chown -R nextjs:nextjs /app/public/uploads

# No USER line: docker-start.mjs starts as root only to take ownership of a
# bind-mounted uploads folder, then drops to nextjs before touching anything else.
EXPOSE 3000

CMD ["node", "scripts/docker-start.mjs"]
