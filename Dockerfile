# use the official Bun image pinned to the packageManager version
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

# Install Alpine packages needed for native dependencies
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  libwebp-dev \
  libjpeg-turbo-dev \
  libpng-dev \
  tiff-dev \
  giflib-dev \
  libde265-dev \
  libheif-dev \
  expat-dev \
  glib-dev

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
# --omit=peer: bun auto-installs a prod package's optional peers that happen to
# match our devDeps (e.g. better-auth's optional vitest peer pulls the whole
# test toolchain into prod). Peers that matter are explicit root dependencies.
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --production --omit=peer --frozen-lockfile

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS build
ARG SENTRY_RELEASE
ARG VITE_SENTRY_RELEASE
ARG SENTRY_AUTH_TOKEN
ARG VITE_SENTRY_ORG
ARG VITE_SENTRY_PROJECT
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV VITE_SENTRY_ORG=$VITE_SENTRY_ORG
ENV VITE_SENTRY_PROJECT=$VITE_SENTRY_PROJECT
COPY --from=install /temp/dev/node_modules node_modules
COPY . /app
ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
ARG SENTRY_RELEASE
ARG VITE_SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
COPY --from=install --chown=bun:bun /temp/prod/node_modules /app/node_modules
COPY --from=build --chown=bun:bun /app/dist /app/dist
COPY --chown=bun:bun package.json /app/

# run the app
USER bun
EXPOSE 4001/tcp
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-4001}/health || exit 1
ENTRYPOINT [ "bun", "dist/index.js" ]
