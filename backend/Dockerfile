# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json to install dependencies
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Stage 2: Build TypeScript application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .

# Build the TypeScript code (assuming a tsconfig.json is present)
# Using npx tsc to compile TypeScript to JavaScript in the /dist folder
RUN npx tsc || echo "TypeScript compilation skipped or failed; ensure tsconfig.json is configured correctly."

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy package.json to install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backenduser
RUN chown -R backenduser:nodejs /app
USER backenduser

# Expose the application port (Updated to 5001 as requested)
EXPOSE 5001
ENV PORT 5001

# Start the application
CMD ["node", "dist/index.js"]
