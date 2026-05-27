# ── CampusHub Frontend Dockerfile ─────────────────────────────────────────────
# Multi-stage build: Node builds React app, Nginx serves static files

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Build-time env vars (Vite bakes VITE_* into the bundle at build time)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies first (layer cache optimization)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source files needed for build
COPY index.html vite.config.js tailwind.config.cjs postcss.config.cjs ./
COPY src/ ./src/
COPY public/ ./public/

# Build production bundle
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
