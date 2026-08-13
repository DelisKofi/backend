# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install build essentials for packages like bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Re-install build essentials briefly for production native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Only production dependencies
RUN npm ci --omit=dev

# Copy the compiled JS from builder
COPY --from=builder /app/dist ./dist

# Render's default port
EXPOSE 10000

CMD ["node", "dist/src/index.js"]