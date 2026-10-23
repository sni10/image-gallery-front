# SSR frontend: build client + server bundles, then run server.js on the built dist/.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL (browser -> API) is baked in here, from the build arg: compose.yaml (local) or CI
# (https://api.artai.win). .env is not copied into the image (.dockerignore).
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# public Turnstile site key for the complaint form; empty -> Cloudflare's test key
ARG VITE_TURNSTILE_SITEKEY
ENV VITE_TURNSTILE_SITEKEY=${VITE_TURNSTILE_SITEKEY}
# Google Analytics measurement id (G-XXXXXXX); empty -> no analytics
ARG VITE_GA_ID
ENV VITE_GA_ID=${VITE_GA_ID}
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
