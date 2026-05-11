# Stage 1: Install dependencies
FROM node:20-alpine AS deps
# Install libc6-compat for Alpine compatibility with some Node.js native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package management files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies using npm ci for deterministic builds (falls back to install if no lockfile)
RUN npm ci || npm install

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Create a non-root user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy essential files and folders from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set ownership of the .next directory so the non-root user can read/write to it
RUN chown -R nextjs:nodejs /app/.next

# Switch to the non-root user
USER nextjs

# Expose the application port
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js application
CMD ["npm", "start"]
