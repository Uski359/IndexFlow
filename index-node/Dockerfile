FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

ENV HUSKY=0

# Generate prisma client and build the application
RUN pnpm run prisma:generate
RUN pnpm run build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
