# syntax=docker/dockerfile:1
#
# Build context is the REPOSITORY ROOT, not backend/ — the API serves the
# Angular bundle, so the image has to be able to build it. The bundle is
# git-ignored, so an image built only from backend/ would ship no UI at all.

# ---- Stage 1: build the Angular bundle -------------------------------------
FROM node:22-slim AS frontend

WORKDIR /src/front-end

COPY front-end/package.json front-end/package-lock.json ./

# `npm ci` alone is not enough here. package-lock.json was generated on Windows,
# and npm records optional platform binaries only for the platform it ran on —
# so the lock lists lightningcss-win32-x64-msvc and @rollup/rollup-win32-* but
# no Linux equivalents, and the Angular build dies on a missing .node binary.
# The versions are read back from what the lock actually installed, so these can
# never drift out of step with it.
# Read the manifests by path, not by module specifier: lightningcss does not
# expose ./package.json through its "exports" map.
RUN npm ci \
 && LIGHTNINGCSS=$(node -p "require('./node_modules/lightningcss/package.json').version") \
 && ROLLUP=$(node -p "require('./node_modules/rollup/package.json').version") \
 && npm install --no-save --no-package-lock \
      "lightningcss-linux-x64-gnu@${LIGHTNINGCSS}" \
      "@rollup/rollup-linux-x64-gnu@${ROLLUP}"

COPY front-end/ ./
# angular.json writes to ../backend/public, i.e. /src/backend/public
RUN npx ng build --configuration production


# ---- Stage 2: the API runtime ----------------------------------------------
FROM node:22-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    TZ=America/Toronto

RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

# Dependencies first so the layer is reused when only source changes.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# The freshly built UI, never a local one (see .dockerignore).
COPY --from=frontend /src/backend/public ./public

# Drop privileges. The node image already provides a `node` user.
USER node

EXPOSE 5000

# ICMP probing moved to the Python service, so this image no longer needs
# iputils-ping or a process manager to supervise blocking work.
CMD ["node", "app.js"]
