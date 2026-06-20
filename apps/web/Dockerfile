FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY packages ./packages
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @app-ingresso/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
