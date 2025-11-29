# -----------------------------
# 1) Install ALL deps (dev+prod)
# -----------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# -----------------------------
# 2) Builder (tsc burada var!)
# -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# devDependencies burada GELİYOR
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# ❗ Burada artık "tsc" kesin mevcut
RUN npx tsc -p tsconfig.prod.json

# -----------------------------
# 3) Runner (production only)
# -----------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
