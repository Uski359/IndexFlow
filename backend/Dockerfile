# Base stage: install deps
FROM node:20-alpine AS base

WORKDIR /app

# Corepack + pnpm
RUN corepack enable

# Root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json   # <-- EKLENMESİ GEREKEN SATIR

# Monorepo packages
COPY packages ./packages
COPY backend ./backend

# Install all workspace deps
RUN pnpm install --recursive

# -----------------------------
# Build config package
# -----------------------------
WORKDIR /app/packages/config
RUN pnpm build   # <-- Artık tsconfig.base.json bulunacak!

# -----------------------------
# Build backend
# -----------------------------
WORKDIR /app/backend
RUN pnpm build

# -----------------------------
# Final runner image
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=base /app/backend/dist ./dist
COPY --from=base /app/backend/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
