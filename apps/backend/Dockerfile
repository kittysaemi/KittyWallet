FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-api/package.json packages/shared-api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.base.json eslint.config.js ./
COPY packages packages
COPY apps/backend apps/backend
RUN npm run build -w @kittywallet/shared-types
RUN npm run build -w @kittywallet/shared-api
RUN npm run build -w @kittywallet/backend
RUN npm prune --omit=dev
RUN PRISMA_VERSION=$(node -p 'require("./node_modules/@prisma/client/package.json").version') \
  && npm install --omit=dev --no-save "prisma@$PRISMA_VERSION"

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache openssl

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/package.json
COPY --from=build /app/packages/shared-api/dist packages/shared-api/dist
COPY --from=build /app/packages/shared-api/package.json packages/shared-api/package.json
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/prisma apps/backend/prisma
COPY --from=build /app/apps/backend/package.json apps/backend/package.json

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null || exit 1
CMD ["node", "apps/backend/dist/main.js"]
