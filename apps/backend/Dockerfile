FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy package files (lock file may not exist in standalone repo, use wildcard)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]
