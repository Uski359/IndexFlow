FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# monorepo packages
COPY packages ./packages
COPY backend ./backend

# install deps (root + workspaces)
RUN pnpm install --recursive --frozen-lockfile

# build config package
WORKDIR /app/packages/config
RUN pnpm build

# build backend
WORKDIR /app/backend
RUN pnpm build

# runtime
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/backend/dist ./dist
COPY --from=base /app/backend/node_modules ./node_modules
COPY --from=base /app/backend/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
