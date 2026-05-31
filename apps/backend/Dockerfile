FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-api/package.json packages/shared-api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm install

COPY tsconfig.base.json eslint.config.js ./
COPY packages packages
COPY apps/backend apps/backend
RUN npm run build -w @kittywallet/shared-types
RUN npm run build -w @kittywallet/shared-api
RUN npm run build -w @kittywallet/backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/package.json
COPY --from=build /app/packages/shared-api/dist packages/shared-api/dist
COPY --from=build /app/packages/shared-api/package.json packages/shared-api/package.json
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/package.json apps/backend/package.json

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@kittywallet/backend"]
