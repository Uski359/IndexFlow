FROM node:20-alpine AS deps
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/frontend/node_modules ./node_modules
# Bring in shared tsconfig base from repo root (build context is monorepo root)
COPY tsconfig.base.json ../tsconfig.base.json
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/frontend/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/next.config.mjs ./

EXPOSE 3000
CMD ["npm", "run", "start"]
