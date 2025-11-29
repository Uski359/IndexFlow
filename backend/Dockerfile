# ------------------------------------------
# Base deps (install all dependencies)
# ------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages     # ❗ config package dahil
COPY backend ./backend        # backend dahil

WORKDIR /app/packages/config
RUN npm install
RUN npx tsc -p tsconfig.json   # config package build → dist oluşur

WORKDIR /app/backend
RUN npm install

# ------------------------------------------
# Builder
# ------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Dep'leri komple al
COPY --from=deps /app ./

# Backend build
WORKDIR /app/backend
RUN npx tsc -p tsconfig.prod.json

# ------------------------------------------
# Runner
# ------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app/backend

ENV NODE_ENV=production

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./

RUN npm install --omit=dev

EXPOSE 4000
CMD ["node", "dist/server.js"]
