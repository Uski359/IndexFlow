# -----------------------------
# 1) BASE IMAGE
# -----------------------------
FROM node:20-alpine AS base
WORKDIR /app

# pnpm / corepack aktif
RUN corepack enable

COPY package.json pnpm-lock.yaml ./

COPY backend ./backend
COPY packages ./packages

# -----------------------------
# 2) INSTALL ROOT DEPENDENCIES
# -----------------------------
RUN pnpm install --filter ./packages/config... \
    && pnpm install --filter ./backend...

# -----------------------------
# 3) BUILD CONFIG PACKAGE
# -----------------------------
WORKDIR /app/packages/config
RUN pnpm build   # <-- dist klasörünü oluşturur!!

# -----------------------------
# 4) BUILD BACKEND
# -----------------------------
WORKDIR /app/backend
RUN pnpm build   # tsconfig.prod.json kullanır

# -----------------------------
# 5) RUNNER
# -----------------------------
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/backend/dist ./dist
COPY --from=base /app/backend/package.json ./package.json
COPY --from=base /app/backend/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/server.js"]
