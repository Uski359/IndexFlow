# ============================================
# 1) BASE IMAGE
# Node 20: packages/config -> mongodb@7, bson@7 uyumlu
# ============================================
FROM node:20-alpine AS base
WORKDIR /app


# ============================================
# 2) INSTALL DEPS
# Sadece backend'in kendi package.json dosyası
# ============================================
FROM base AS deps

# Backend package.json
COPY backend/package*.json ./

# Root'taki packages/config'i include edeceğiz → build context . olmalı
COPY packages ./packages

RUN npm install


# ============================================
# 3) BUILDER STAGE – TypeScript build
# ============================================
FROM base AS builder
WORKDIR /app

# node_modules'ı kopyala
COPY --from=deps /app/node_modules ./node_modules

# Backend kaynak kodu
COPY backend ./

# packages/config'i tekrar dahil et (TS import pathleri için)
COPY packages ./packages

# Artık backend içinde tsconfig.prod.json var
RUN npx tsc -p tsconfig.prod.json


# ============================================
# 4) RUNNER – minimal image
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Çalışması için dist + backend package.json yeterli
COPY --from=builder /app/dist ./dist
COPY backend/package*.json ./

# node_modules
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 4000

CMD ["node", "dist/server.js"]
