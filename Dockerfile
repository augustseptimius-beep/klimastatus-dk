FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Kompilér seed til standalone JS så den kan køres i runner-stadiet uden tsx
RUN node_modules/.bin/esbuild db/seed.ts \
  --bundle --platform=node --format=esm \
  --alias:@=. \
  --external:@node-rs/argon2 --external:postgres --external:drizzle-orm --external:"drizzle-orm/*" \
  --outfile=scripts/seed-compiled.mjs

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrationer ved opstart: kør drizzle-migrator før serveren starter.
# Containeren kører inde i Docker-netværket, hvor den interne Postgres kan nås
# (DB-porten er ikke eksponeret eksternt). Standalone-tracing tager ikke
# migrator-undermodulet med, så vi kopierer hele drizzle-orm + postgres ind.
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-compiled.mjs ./scripts/seed-compiled.mjs
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
# @node-rs/argon2 er native addon — bruges af seed til password-hashing
COPY --from=builder /app/node_modules/@node-rs ./node_modules/@node-rs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "node scripts/migrate.mjs && node scripts/seed-compiled.mjs && node server.js"]
