# SSR frontend: build client + server bundles, then run server.js on the built dist/.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL (browser -> API) is baked in here, from .env
RUN npm run build-only

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
USER node
EXPOSE 5173
CMD ["node", "server.js"]
