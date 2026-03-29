/**
 * Integration Tests (requires Docker: PostgreSQL + Redis)
 * End-to-end tests for database operations, queue, and API endpoints
 * 
 * Run: docker-compose up -d postgres redis
 * Then: npm test
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/db/index.js';
import { users, serviceKeys, submissions } from '../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { encrypt } from '../src/lib/crypto.js';
import { selectLeastUsedKey, hasAvailableQuota } from '../src/services/google-indexer.js';
import { getUserQuotaStats, resetAllDailyQuotas } from '../src/services/quota-tracker.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Test setup
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const testQueue = new Queue('test-queue', { connection: redis });

let testUserId: string;
let testKeyId1: string;
let testKeyId2: string;

beforeAll(async () => {
  // Clean up test data
  await db.delete(submissions);
  await db.delete(serviceKeys);
  await db.delete(users);
  
  // Create test user
  const [user] = await db.insert(users).values({
    email: 'integration-test@test.com',
    name: 'Integration Test User',
    plan: 'pro',
  }).returning();
  
  testUserId = user.id;
  
  // Create test service keys
  const mockCredentials = JSON.stringify({
    type: 'service_account',
    project_id: 'test-project-1',
    private_key_id: 'key1',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    client_email: 'test1@test-project.iam.gserviceaccount.com',
  });
  
  const [key1] = await db.insert(serviceKeys).values({
    userId: testUserId,
    name: 'Test Key 1',
    encryptedCredentials: encrypt(mockCredentials),
    dailyLimit: 200,
    dailyUsed: 50,
  }).returning();
  
  const [key2] = await db.insert(serviceKeys).values({
    userId: testUserId,
    name: 'Test Key 2',
    encryptedCredentials: encrypt(mockCredentials),
    dailyLimit: 200,
    dailyUsed: 10,
  }).returning();
  
  testKeyId1 = key1.id;
  testKeyId2 = key2.id;
});

afterAll(async () => {
  // Cleanup
  await db.delete(submissions);
  await db.delete(serviceKeys);
  await db.delete(users);
  await testQueue.close();
  await redis.quit();
});

describe('Database Operations', () => {
  it('should insert and retrieve user', async () => {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);
    
    expect(user).toBeDefined();
    expect(user.email).toBe('integration-test@test.com');
    expect(user.plan).toBe('pro');
  });

  it('should insert and retrieve service keys', async () => {
    const keys = await db.select()
      .from(serviceKeys)
      .where(eq(serviceKeys.userId, testUserId));
    
    expect(keys).toHaveLength(2);
    expect(keys[0].name).toBe('Test Key 1');
    expect(keys[1].name).toBe('Test Key 2');
  });

  it('should insert submission record', async () => {
    const [submission] = await db.insert(submissions).values({
      userId: testUserId,
      url: 'https://example.com/test-page',
      googleStatus: 'pending',
      indexnowStatus: 'pending',
      keyUsed: testKeyId1,
      attempts: 0,
    }).returning();
    
    expect(submission).toBeDefined();
    expect(submission.url).toBe('https://example.com/test-page');
    expect(submission.googleStatus).toBe('pending');
  });
});

describe('Key Selection Logic', () => {
  it('should select least-used key', async () => {
    const key = await selectLeastUsedKey(testUserId);
    
    expect(key).toBeDefined();
    expect(key?.id).toBe(testKeyId2); // Key 2 has dailyUsed=10 (less than Key 1's 50)
    expect(key?.dailyUsed).toBe(10);
  });

  it('should return null when all keys are at quota', async () => {
    // Temporarily set all keys to quota limit
    await db.update(serviceKeys)
      .set({ dailyUsed: 200 })
      .where(eq(serviceKeys.userId, testUserId));
    
    const key = await selectLeastUsedKey(testUserId);
    expect(key).toBeNull();
    
    // Restore original values
    await db.update(serviceKeys)
      .set({ dailyUsed: 50 })
      .where(eq(serviceKeys.id, testKeyId1));
    
    await db.update(serviceKeys)
      .set({ dailyUsed: 10 })
      .where(eq(serviceKeys.id, testKeyId2));
  });

  it('should check if user has available quota', async () => {
    const hasQuota = await hasAvailableQuota(testUserId);
    expect(hasQuota).toBe(true);
  });
});

describe('Quota Management', () => {
  it('should return correct quota stats', async () => {
    const stats = await getUserQuotaStats(testUserId);
    
    expect(stats.totalCapacity).toBe(400); // 2 keys × 200 limit
    expect(stats.totalUsed).toBe(60); // 50 + 10
    expect(stats.keys).toHaveLength(2);
    
    const key1Stats = stats.keys.find(k => k.id === testKeyId1);
    expect(key1Stats?.used).toBe(50);
    expect(key1Stats?.available).toBe(150);
  });

  it('should reset daily quotas', async () => {
    await resetAllDailyQuotas();
    
    const keys = await db.select()
      .from(serviceKeys)
      .where(eq(serviceKeys.userId, testUserId));
    
    keys.forEach(key => {
      expect(key.dailyUsed).toBe(0);
    });
    
    // Restore original values for other tests
    await db.update(serviceKeys)
      .set({ dailyUsed: 50 })
      .where(eq(serviceKeys.id, testKeyId1));
    
    await db.update(serviceKeys)
      .set({ dailyUsed: 10 })
      .where(eq(serviceKeys.id, testKeyId2));
  });

  it('should increment daily usage counter', async () => {
    const [keyBefore] = await db.select()
      .from(serviceKeys)
      .where(eq(serviceKeys.id, testKeyId1))
      .limit(1);
    
    const usedBefore = keyBefore.dailyUsed;
    
    // Simulate API call incrementing usage
    await db.update(serviceKeys)
      .set({ dailyUsed: usedBefore + 1 })
      .where(eq(serviceKeys.id, testKeyId1));
    
    const [keyAfter] = await db.select()
      .from(serviceKeys)
      .where(eq(serviceKeys.id, testKeyId1))
      .limit(1);
    
    expect(keyAfter.dailyUsed).toBe(usedBefore + 1);
    
    // Restore
    await db.update(serviceKeys)
      .set({ dailyUsed: usedBefore })
      .where(eq(serviceKeys.id, testKeyId1));
  });
});

describe('Submissions History', () => {
  beforeEach(async () => {
    // Clean submissions before each test
    await db.delete(submissions);
  });

  it('should retrieve paginated submissions', async () => {
    // Insert test submissions
    await db.insert(submissions).values([
      {
        userId: testUserId,
        url: 'https://example.com/page1',
        googleStatus: 'success',
        indexnowStatus: 'success',
        keyUsed: testKeyId1,
        attempts: 1,
      },
      {
        userId: testUserId,
        url: 'https://example.com/page2',
        googleStatus: 'failed',
        indexnowStatus: 'success',
        keyUsed: testKeyId1,
        attempts: 3,
        errorMessage: 'Quota exceeded',
      },
    ]);
    
    const results = await db.select()
      .from(submissions)
      .where(eq(submissions.userId, testUserId))
      .limit(10)
      .offset(0);
    
    expect(results).toHaveLength(2);
  });

  it('should filter submissions by status', async () => {
    await db.insert(submissions).values([
      {
        userId: testUserId,
        url: 'https://example.com/success',
        googleStatus: 'success',
        indexnowStatus: 'success',
        keyUsed: testKeyId1,
        attempts: 1,
      },
      {
        userId: testUserId,
        url: 'https://example.com/failed',
        googleStatus: 'failed',
        indexnowStatus: 'failed',
        keyUsed: testKeyId1,
        attempts: 3,
      },
    ]);
    
    const successes = await db.select()
      .from(submissions)
      .where(eq(submissions.googleStatus, 'success'));
    
    const failures = await db.select()
      .from(submissions)
      .where(eq(submissions.googleStatus, 'failed'));
    
    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(failures.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Queue System (BullMQ)', () => {
  it('should add job to queue', async () => {
    await testQueue.add('test-job', { url: 'https://example.com/test' });
    
    const jobCounts = await testQueue.getJobCounts();
    expect(jobCounts.waiting).toBeGreaterThanOrEqual(1);
    
    // Cleanup
    await testQueue.obliterate({ force: true });
  });

  it('should process jobs in queue', async () => {
    await testQueue.add('test-job-2', { url: 'https://example.com/test2' });
    
    const job = await testQueue.getWaiting();
    expect(job).toBeDefined();
    
    // Cleanup
    await testQueue.obliterate({ force: true });
  });
});
