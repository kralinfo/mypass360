FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @app-ingresso/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
