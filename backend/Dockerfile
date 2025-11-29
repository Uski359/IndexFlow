# -------------------------------
# 1) BASE IMAGE
# -------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# -------------------------------
# 2) INSTALL ROOT DEPS (packages/config dahil)
# -------------------------------
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm install --legacy-peer-deps

# -------------------------------
# 3) BACKEND DEPS
# -------------------------------
FROM base AS deps-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps

# -------------------------------
# 4) COPY BACKEND SOURCE
# -------------------------------
FROM deps-backend AS builder
WORKDIR /app/backend
COPY backend ./       
COPY packages ./packages   

# MULTI-PROJECT TS CONFIG DESTEĞİ
COPY tsconfig.base.json /app/tsconfig.base.json

# -------------------------------
# 5) BUILD
# -------------------------------
RUN npx tsc -p tsconfig.prod.json

# -------------------------------
# 6) RUNNER
# -------------------------------
FROM node:22-alpine AS runner
WORKDIR /app/backend

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
COPY --from=deps-backend /app/backend/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/server.js"]
