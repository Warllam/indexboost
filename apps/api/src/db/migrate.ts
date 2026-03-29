/**
 * Migration Runner
 * 
 * Execute les migrations Drizzle pour créer/mettre à jour le schéma DB.
 * Usage: npm run db:migrate
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `postgresql://${process.env.DB_USER || 'indexboost'}:${process.env.DB_PASSWORD || 'indexboost'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'indexboost'}`;

async function main() {
  console.log('🚀 Running migrations...');
  
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();
