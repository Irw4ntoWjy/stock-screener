# === BUILDER ===
FROM node:20-alpine AS builder
WORKDIR /app

# pinned: an unpinned install picks up new pnpm majors that change install rules
RUN npm install -g pnpm@10.14.0

# pnpm-workspace.yaml holds the approved build scripts (sharp, tailwind oxide, ...)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_IDX_STOCK_SCREENER
ENV NEXT_PUBLIC_IDX_STOCK_SCREENER=$NEXT_PUBLIC_IDX_STOCK_SCREENER
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# === RUNNER ===
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1


RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# static files served as-is (e.g. /data/idx-add-filter-catalog.json)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

ENV IDX_STOCK_SCREENER_INTERNAL=http://stocks-screener-be:8080/stocks-screener
ENV IDX_STOCK_AUTOMATION=http://idx-stock-automation:8000

USER nextjs
EXPOSE 3000

CMD ["npm", "start"]
