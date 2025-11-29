FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY index-node ./index-node

ENV HUSKY=0

# Install all workspaces so hoisted deps (express, @indexflow/config, etc.) are present and
# workspace lifecycle scripts (like config's build/prepare) can run.
RUN npm install

# Ensure local config package is built for runtime consumption.
RUN npm run build --workspace @indexflow/config

# Build index-node (tsc + tsc-alias) and ensure prisma client is generated.
RUN npm run prisma:generate --workspace index-node
RUN npm run build --workspace index-node

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime deps (hoisted)
COPY --from=builder /app/node_modules ./node_modules
# Also include workspace-local modules in case npm placed any non-hoisted deps there.
COPY --from=builder /app/index-node/node_modules ./node_modules
# Copy local package sources that workspace symlinks may point to
COPY --from=builder /app/packages ./packages
# Copy index-node artifacts
COPY --from=builder /app/index-node/package*.json ./
COPY --from=builder /app/index-node/package-lock.json ./package-lock.json
COPY --from=builder /app/index-node/dist ./dist
COPY --from=builder /app/index-node/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/src/main.js"]
