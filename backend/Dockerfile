FROM node:20-alpine

WORKDIR /app

# Copy only package files
COPY package.json package-lock.json ./

# Install deps
RUN npm install --production

# Copy source
COPY . .

# Build TypeScript → dist/ üretilecek
RUN npm run build

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "dist/server.js"]
