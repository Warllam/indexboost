/**
 * Database Connection
 * PostgreSQL connection using postgres + drizzle-orm
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from '../lib/config.js';
import * as schema from './schema.js';

// Create postgres connection
const queryClient = postgres(config.DATABASE_URL);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Graceful shutdown helper
export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
