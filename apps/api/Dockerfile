# Build from repo root: docker build -f apps/api/Dockerfile .
# API has no workspace deps; install only in apps/api for smaller image.
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/api/package.json ./
RUN npm install
COPY apps/api ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY apps/api/package.json ./
RUN npm install --omit=dev
COPY apps/api ./
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
