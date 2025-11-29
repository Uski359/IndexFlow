# -------------------------
# Base Image
# -------------------------
FROM node:20-alpine AS base
WORKDIR /app

# pnpm enable
RUN corepack enable

# Root dosyaları
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Base tsconfig
COPY tsconfig.base.json ./tsconfig.base.json

# Paketler ve backend
COPY packages ./packages
COPY backend ./backend

# Tüm workspace bağımlılıklarını kur
RUN pnpm install --recursive

# -------------------------
# config package build
# -------------------------
WORKDIR /app/packages/config
RUN pnpm build

# -------------------------
# backend build
# -------------------------
WORKDIR /app/backend
RUN pnpm build

# -------------------------
# Runner
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/backend/dist ./dist
COPY --from=base /app/backend/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
