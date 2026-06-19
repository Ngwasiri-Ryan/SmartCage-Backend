FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Provide a dummy URL so prisma.config.ts loads without error
# (prisma generate only generates TypeScript types — never connects to DB)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Generate Prisma client types
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

EXPOSE 3000

# At runtime: real DATABASE_URL is injected by Railway PostgreSQL plugin
# Run migrations first, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
