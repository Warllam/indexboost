/**
 * Queue Manager Service
 * Manages BullMQ queues and workers for async URL indexing
 */
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../db/index.js';
import { submissions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { submitToGoogleIndexing } from './google-indexer.js';
import { submitToIndexNow } from './indexnow.js';
import { config } from '../lib/config.js';

// Redis connection
const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const googleQueue = new Queue('google-indexing', { connection });
export const indexnowQueue = new Queue('indexnow', { connection });

// Job data interfaces
interface GoogleIndexingJob {
  submissionId: string;
  url: string;
  keyId: string;
  userId: string;
}

interface IndexNowJob {
  submissionId: string;
  url: string;
  userId: string;
}

/**
 * Worker for Google Indexing API submissions
 */
const googleWorker = new Worker<GoogleIndexingJob>(
  'google-indexing',
  async (job: Job<GoogleIndexingJob>) => {
    const { submissionId, url, keyId } = job.data;
    
    console.log(`[Google] Processing submission ${submissionId}: ${url}`);
    
    try {
      // Submit to Google Indexing API
      const result = await submitToGoogleIndexing(url, keyId);
      
      if (result.success) {
        // Update submission status to success
        await db
          .update(submissions)
          .set({
            googleStatus: 'success',
            attempts: sql`${submissions.attempts} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(submissions.id, submissionId));
        
        console.log(`[Google] ✅ Success: ${url}`);
        return { success: true };
      } else {
        // Failed - will be retried by BullMQ
        console.log(`[Google] ❌ Failed: ${url} - ${result.error}`);
        
        await db
          .update(submissions)
          .set({
            attempts: sql`${submissions.attempts} + 1`,
            errorMessage: result.error,
            updatedAt: sql`NOW()`,
          })
          .where(eq(submissions.id, submissionId));
        
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(`[Google] Error processing ${url}:`, error.message);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs concurrently
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Exponential backoff: 5s, 25s, 125s
        return Math.pow(5, attemptsMade) * 1000;
      },
    },
  }
);

/**
 * Worker for IndexNow API submissions
 */
const indexnowWorker = new Worker<IndexNowJob>(
  'indexnow',
  async (job: Job<IndexNowJob>) => {
    const { submissionId, url } = job.data;
    
    console.log(`[IndexNow] Processing submission ${submissionId}: ${url}`);
    
    try {
      // Submit to IndexNow API
      const result = await submitToIndexNow(url);
      
      if (result.success) {
        // Update submission status to success
        await db
          .update(submissions)
          .set({
            indexnowStatus: 'success',
            attempts: sql`${submissions.attempts} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(submissions.id, submissionId));
        
        console.log(`[IndexNow] ✅ Success: ${url}`);
        return { success: true };
      } else {
        // Failed - will be retried by BullMQ
        console.log(`[IndexNow] ❌ Failed: ${url} - ${result.error}`);
        
        await db
          .update(submissions)
          .set({
            attempts: sql`${submissions.attempts} + 1`,
            errorMessage: result.error,
            updatedAt: sql`NOW()`,
          })
          .where(eq(submissions.id, submissionId));
        
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(`[IndexNow] Error processing ${url}:`, error.message);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // IndexNow can handle more concurrent requests
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return Math.pow(5, attemptsMade) * 1000;
      },
    },
  }
);

/**
 * Handle worker errors and failed jobs
 */
googleWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 3) {
    // Final failure after 3 attempts
    await db
      .update(submissions)
      .set({
        googleStatus: 'failed',
        errorMessage: err.message,
        updatedAt: sql`NOW()`,
      })
      .where(eq(submissions.id, job.data.submissionId));
    
    console.error(`[Google] Final failure for ${job.data.url} after 3 attempts`);
  }
});

indexnowWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 3) {
    // Final failure after 3 attempts
    await db
      .update(submissions)
      .set({
        indexnowStatus: 'failed',
        errorMessage: err.message,
        updatedAt: sql`NOW()`,
      })
      .where(eq(submissions.id, job.data.submissionId));
    
    console.error(`[IndexNow] Final failure for ${job.data.url} after 3 attempts`);
  }
});

/**
 * Adds a URL submission job to both queues
 */
export async function enqueueSubmission(
  submissionId: string,
  url: string,
  keyId: string,
  userId: string
): Promise<void> {
  // Add to Google Indexing queue
  await googleQueue.add(
    'submit-url',
    {
      submissionId,
      url,
      keyId,
      userId,
    },
    {
      attempts: 3,
      removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
      removeOnFail: { age: 604800 }, // Keep failed jobs for 7 days
    }
  );
  
  // Add to IndexNow queue
  await indexnowQueue.add(
    'submit-url',
    {
      submissionId,
      url,
      userId,
    },
    {
      attempts: 3,
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    }
  );
  
  // Update submission status to queued
  await db
    .update(submissions)
    .set({
      googleStatus: 'queued',
      indexnowStatus: 'queued',
      updatedAt: sql`NOW()`,
    })
    .where(eq(submissions.id, submissionId));
}

/**
 * Gets queue statistics
 */
export async function getQueueStats(): Promise<{
  google: { waiting: number; active: number; completed: number; failed: number };
  indexnow: { waiting: number; active: number; completed: number; failed: number };
}> {
  const [googleWaiting, googleActive, googleCompleted, googleFailed] = await Promise.all([
    googleQueue.getWaitingCount(),
    googleQueue.getActiveCount(),
    googleQueue.getCompletedCount(),
    googleQueue.getFailedCount(),
  ]);
  
  const [indexnowWaiting, indexnowActive, indexnowCompleted, indexnowFailed] = await Promise.all([
    indexnowQueue.getWaitingCount(),
    indexnowQueue.getActiveCount(),
    indexnowQueue.getCompletedCount(),
    indexnowQueue.getFailedCount(),
  ]);
  
  return {
    google: {
      waiting: googleWaiting,
      active: googleActive,
      completed: googleCompleted,
      failed: googleFailed,
    },
    indexnow: {
      waiting: indexnowWaiting,
      active: indexnowActive,
      completed: indexnowCompleted,
      failed: indexnowFailed,
    },
  };
}

/**
 * Graceful shutdown of queues and workers
 */
export async function closeQueueManager(): Promise<void> {
  console.log('Closing queue workers...');
  
  await googleWorker.close();
  await indexnowWorker.close();
  
  await googleQueue.close();
  await indexnowQueue.close();
  
  await connection.quit();
  
  console.log('✅ Queue manager closed');
}
