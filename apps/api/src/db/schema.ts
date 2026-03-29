/**
 * Database Schema - Drizzle ORM
 * Defines all tables: users, service_keys, submissions
 */
import { pgTable, uuid, text, varchar, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enums for status tracking
export const planEnum = pgEnum('plan', ['free', 'pro', 'business']);
export const statusEnum = pgEnum('status', ['pending', 'queued', 'success', 'failed']);

// Users table - stores user accounts and their plan tier
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: planEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Service Keys table - stores encrypted Google Service Account credentials
export const serviceKeys = pgTable('service_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  encryptedCredentials: text('encrypted_credentials').notNull(),
  dailyLimit: integer('daily_limit').notNull().default(200),
  dailyUsed: integer('daily_used').notNull().default(0),
  lastReset: timestamp('last_reset').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Submissions table - tracks all URL submission requests
export const submissions = pgTable('submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  googleStatus: statusEnum('google_status').notNull().default('pending'),
  indexnowStatus: statusEnum('indexnow_status').notNull().default('pending'),
  keyUsed: uuid('key_used').references(() => serviceKeys.id, { onDelete: 'set null' }),
  errorMessage: text('error_message'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ServiceKey = typeof serviceKeys.$inferSelect;
export type NewServiceKey = typeof serviceKeys.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
