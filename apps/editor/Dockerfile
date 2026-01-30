# Build from repo root: docker build -f apps/editor/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci
WORKDIR /app/apps/editor
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/editor/.next/standalone ./
COPY --from=builder /app/apps/editor/.next/static ./.next/static
COPY --from=builder /app/apps/editor/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
