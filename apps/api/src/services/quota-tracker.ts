/**
 * Quota Tracker Service
 * Manages daily quota limits and resets for service keys
 * 
 * ⚠️ IMPORTANT: Google Indexing API quota is 200 requests/day per GCP PROJECT.
 * If multiple service accounts come from the same project, they share the same 200/day quota.
 * For effective multi-key rotation, each service account must come from a DIFFERENT GCP project.
 */
import { Queue } from 'bullmq';
import { db } from '../db/index.js';
import { serviceKeys } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { config } from '../lib/config.js';
import IORedis from 'ioredis';

const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Queue for scheduled quota resets
const quotaQueue = new Queue('quota-reset', { connection });

/**
 * Initializes the daily quota reset job (runs at midnight UTC)
 */
export async function initializeQuotaReset(): Promise<void> {
  // Remove existing repeatable jobs
  const repeatableJobs = await quotaQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await quotaQueue.removeRepeatableByKey(job.key);
  }
  
  // Add new repeatable job - runs every day at 00:00 UTC
  await quotaQueue.add(
    'reset-daily-quotas',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Cron: midnight UTC every day
        tz: 'UTC',
      },
    }
  );
  
  console.log('✅ Quota reset job scheduled (midnight UTC)');
}

/**
 * Resets all service keys' daily_used counters to 0
 */
export async function resetAllDailyQuotas(): Promise<void> {
  try {
    await db
      .update(serviceKeys)
      .set({ 
        dailyUsed: 0,
        lastReset: sql`NOW()`,
      });
    
    console.log(`✅ Reset daily quotas for all service keys at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error('❌ Failed to reset daily quotas:', error.message);
    throw error;
  }
}

/**
 * Checks if a specific key has available quota
 */
export async function hasQuotaAvailable(keyId: string): Promise<boolean> {
  const [key] = await db
    .select()
    .from(serviceKeys)
    .where(eq(serviceKeys.id, keyId))
    .limit(1);
  
  if (!key) {
    return false;
  }
  
  return key.dailyUsed < key.dailyLimit;
}

/**
 * Gets quota usage statistics for a user
 */
export async function getUserQuotaStats(userId: string): Promise<{
  totalCapacity: number;
  totalUsed: number;
  keys: Array<{
    id: string;
    name: string;
    used: number;
    limit: number;
    available: number;
  }>;
}> {
  const keys = await db
    .select()
    .from(serviceKeys)
    .where(eq(serviceKeys.userId, userId));
  
  const totalCapacity = keys.reduce((sum, key) => sum + key.dailyLimit, 0);
  const totalUsed = keys.reduce((sum, key) => sum + key.dailyUsed, 0);
  
  return {
    totalCapacity,
    totalUsed,
    keys: keys.map(key => ({
      id: key.id,
      name: key.name,
      used: key.dailyUsed,
      limit: key.dailyLimit,
      available: key.dailyLimit - key.dailyUsed,
    })),
  };
}

/**
 * Closes the Redis connection for graceful shutdown
 */
export async function closeQuotaTracker(): Promise<void> {
  await quotaQueue.close();
  await connection.quit();
}
