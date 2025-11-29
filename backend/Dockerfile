# -------------------------------
# 1) Base layer (modules installed at monorepo root)
# -------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Monorepo kök package ve tsconfig dosyalarını kopyala
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json

# packages ve backend dizinlerini kopyala
COPY packages ./packages
COPY backend ./backend

# Root install (config dahil)
RUN npm install

# -------------------------------
# 2) Backend build
# -------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Tüm monorepo içeriklerini tekrar kopyala (build için gerekli)
COPY . .

# Root’taki node_modules’u builder'a kopyala
COPY --from=deps /app/node_modules ./node_modules

# backend'i build et
WORKDIR /app/backend
RUN npm run build

# -------------------------------
# 3) Production runner
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app/backend

COPY --from=builder /app/backend/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/server.js"]
