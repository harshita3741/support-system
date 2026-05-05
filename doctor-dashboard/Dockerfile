# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cache node_modules separately from source
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Replace hardcoded URL with a placeholder ────────────────────────
FROM build AS patched
RUN find dist/mediqueue-frontend/browser -name "*.js" -exec \
      sed -i 's|http://192.168.1.76:8080|__API_URL__|g' {} \;

# ── Stage 3: Serve via Nginx ─────────────────────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=patched /app/dist/mediqueue-frontend/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
