# ── Stage 1: dependency install ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install production dependencies only (layer-cached unless package*.json changes)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install OpenSSH client utilities (ssh-keyscan) for host key inspection
RUN apk add --no-cache openssh-client

# Non-root user for security
RUN addgroup -S connector && adduser -S connector -G connector

WORKDIR /app

# Copy installed modules and application source from build stage
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# Create directory for SSH key mounts (read-only secrets)
# Keys are mounted here by Docker secrets or a bind mount – never baked in.
RUN mkdir -p /run/secrets && chown connector:connector /run/secrets

RUN chown -R connector:connector /app

USER connector

# Default connector port
EXPOSE 3000

# Health check – confirms the Express server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
