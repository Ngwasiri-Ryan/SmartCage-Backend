import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Fallback to a dummy URL during Docker build (prisma generate doesn't connect to DB)
    // At runtime on Railway, DATABASE_URL is injected by the PostgreSQL plugin
    url: process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build',
  },
});
