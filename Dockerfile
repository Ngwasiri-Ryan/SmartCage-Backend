FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Provide a dummy DATABASE_URL so prisma generate can load prisma.config.ts
# (prisma generate only creates TypeScript types — it never connects to the DB)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN npx prisma generate
RUN npm run build

# ─── Production stage ────────────────────────────────────────────────────────

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# At runtime, DATABASE_URL is injected by Railway's PostgreSQL plugin
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
