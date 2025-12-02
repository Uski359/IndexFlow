FROM node:20-alpine

WORKDIR /app

# Copy only package files
COPY package.json package-lock.json ./

# Install ALL dependencies (include devDeps)
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Delete devDeps to make image smaller (optional)
RUN npm prune --production

EXPOSE 4000
CMD ["sh", "-c", "npm run indexer:listener:sepolia & node dist/server.js"]
