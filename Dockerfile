# Founder OS — production image.
# Multi-stage: build TypeScript + the web SPA, then ship a slim runtime image
# containing only what's needed to run the server or the `founder` CLI.
#
# Build:  docker build -t founder-os .
# Run (server):  docker run --rm -p 4173:4173 --env-file .env founder-os
# Run (CLI):     docker run --rm -it --env-file .env founder-os node dist/cli/founder.js doctor
# See docs/INSTALL.md and docker-compose.yml for the full workflow (including
# an optional bundled Ollama service).

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/.claude ./.claude
COPY --from=build /app/registry ./registry
COPY --from=build /app/blueprints ./blueprints

# Non-root runtime user — the workspace/registry files above are copied in
# as root during build, so re-own them before dropping privileges.
RUN useradd --create-home --shell /usr/sbin/nologin founder \
    && chown -R founder:founder /app
USER founder

EXPOSE 4173
CMD ["node", "dist/server/index.js"]
