# STAGE 1: BUILD
FROM oven/bun:canary-slim AS builder
WORKDIR /app

# copy dependency definitions
COPY package.json pnpm-lock.yaml ./

# install all dependencies including devDependencies 
RUN bun install --frozen-lockfile

# copy all the code
COPY . .

# build the project using the 'build' script in package.json
RUN bun run build
#---------------------------------------------------------------
# STAGE 2: PRODUCTION RUNNER
FROM oven/bun:canary-slim AS runner
WORKDIR /app

# copy dependency definitions
COPY package.json pnpm-lock.yaml ./

# install production dependencies to keep the image small
RUN bun install --frozen-lockfile --production

# copy built artifacts from the builder stage using the 'build' script outputs to the 'build' directory
COPY --from=builder /app/build ./build

# expose the port the app runs on
EXPOSE 3000

# start the server
CMD ["bun", "run", "build/index.js"]