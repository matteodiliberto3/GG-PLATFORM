# Build from repo root: docker build -f apps/soc/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci
WORKDIR /app/apps/soc
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/soc/.next/standalone ./
COPY --from=builder /app/apps/soc/.next/static ./.next/static
COPY --from=builder /app/apps/soc/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
