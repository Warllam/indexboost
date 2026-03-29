/**
 * Drizzle Kit Configuration
 * Manages database migrations and schema generation
 */
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://indexboost:indexboost@localhost:5432/indexboost',
  },
  verbose: true,
  strict: true,
});
