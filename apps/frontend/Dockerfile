FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-api/package.json packages/shared-api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm install

COPY tsconfig.base.json eslint.config.js ./
COPY packages packages
COPY apps/frontend apps/frontend
RUN npm run build -w @kittywallet/shared-types
RUN npm run build -w @kittywallet/shared-api
RUN npm run build -w @kittywallet/frontend

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
