# ============================================================================
# Frontend Dockerfile (Production-Ready)
# ============================================================================
# Multi-stage build: Build stage + Nginx production stage

# Stage 1: Build the React application
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build application for production
# This creates an optimized production build in /app/build
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine as production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
