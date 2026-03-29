/**
 * Database Seed Script
 * 
 * Crée un utilisateur de test avec quelques submissions d'exemple
 * Usage: tsx scripts/seed.ts
 */

import { db, closeDatabase } from '../src/db/index.js';
import { users, serviceKeys, submissions } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '../src/lib/crypto.js';

const TEST_USER = {
  email: 'demo@indexboost.app',
  name: 'Demo User',
  plan: 'pro' as const,
};

const TEST_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'indexboost-demo-123456',
  private_key_id: 'demo-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\n(FAKE KEY - Replace with real one)\n-----END PRIVATE KEY-----',
  client_email: 'indexboost-demo@indexboost-demo-123456.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/demo',
};

const TEST_URLS = [
  'https://example.com/',
  'https://example.com/about',
  'https://example.com/contact',
  'https://example.com/blog',
  'https://example.com/products',
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_USER.email))
      .limit(1);

    let userId: number;

    if (existingUser.length > 0) {
      console.log(`✓ User already exists: ${TEST_USER.email}`);
      userId = existingUser[0].id;
    } else {
      // Create test user
      const [user] = await db
        .insert(users)
        .values(TEST_USER)
        .returning();

      userId = user.id;
      console.log(`✓ Created user: ${TEST_USER.email} (ID: ${userId})`);
    }

    // Create test service account key
    const existingKeys = await db
      .select()
      .from(serviceKeys)
      .where(eq(serviceKeys.userId, userId));

    if (existingKeys.length === 0) {
      const encryptedCredentials = encrypt(TEST_SERVICE_ACCOUNT);

      const [key] = await db
        .insert(serviceKeys)
        .values({
          userId,
          name: 'Demo Service Account',
          encryptedCredentials,
          dailyLimit: 200,
          dailyUsed: 0,
        })
        .returning();

      console.log(`✓ Created service account key (ID: ${key.id})`);
    } else {
      console.log(`✓ Service account key already exists`);
    }

    // Create test submissions
    const existingSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId));

    if (existingSubmissions.length === 0) {
      for (const url of TEST_URLS) {
        await db.insert(submissions).values({
          userId,
          url,
          googleStatus: 'pending',
          indexnowStatus: 'pending',
          attempts: 0,
        });
      }

      console.log(`✓ Created ${TEST_URLS.length} test submissions`);
    } else {
      console.log(`✓ Test submissions already exist`);
    }

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Test User Credentials:');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Plan: ${TEST_USER.plan}`);
    console.log('\n⚠️  Note: The service account credentials are FAKE.');
    console.log('   Replace them with real Google service account JSON via POST /api/keys\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

seed();
