# Builds the client and installs all workspace deps, then prunes dev deps
# so the runtime stage doesn't ship Vite/ESLint/Jest/etc.
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY . .
RUN npm run build --workspace client
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm prune --omit=dev

# Runtime: server source + generated Prisma client + the built client's
# static files, all served by one Express process on one origin.
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=builder /app ./

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/index.js"]
