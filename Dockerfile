FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend ./backend
COPY packages ./packages

RUN pnpm install --recursive --frozen-lockfile

RUN pnpm --filter @indexflow/config build
RUN pnpm --filter @indexflow/backend build

FROM node:20-alpine AS runner

RUN corepack enable

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist

ENV NODE_ENV=production

WORKDIR /app/backend

CMD ["node", "dist/server.js"]
