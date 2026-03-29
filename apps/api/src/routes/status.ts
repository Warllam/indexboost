/**
 * Status Route - GET /api/status
 * Returns quota usage and queue statistics
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getUserQuotaStats } from '../services/quota-tracker.js';
import { getQueueStats } from '../services/queue-manager.js';

// Query parameters schema
const statusQuerySchema = z.object({
  userId: z.string().uuid(), // In production, extract from auth token
});

type StatusQuery = z.infer<typeof statusQuerySchema>;

export default async function statusRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/status
   * Returns quota usage and queue size
   */
  fastify.get<{ Querystring: StatusQuery }>(
    '/status',
    async (request: FastifyRequest<{ Querystring: StatusQuery }>, reply: FastifyReply) => {
      try {
        const { userId } = statusQuerySchema.parse(request.query);
        
        // Get quota statistics
        const quotaStats = await getUserQuotaStats(userId);
        
        // Get queue statistics
        const queueStats = await getQueueStats();
        
        return reply.code(200).send({
          quota: {
            totalCapacity: quotaStats.totalCapacity,
            totalUsed: quotaStats.totalUsed,
            available: quotaStats.totalCapacity - quotaStats.totalUsed,
            keys: quotaStats.keys,
          },
          queues: {
            google: {
              pending: queueStats.google.waiting + queueStats.google.active,
              completed: queueStats.google.completed,
              failed: queueStats.google.failed,
            },
            indexnow: {
              pending: queueStats.indexnow.waiting + queueStats.indexnow.active,
              completed: queueStats.indexnow.completed,
              failed: queueStats.indexnow.failed,
            },
          },
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('Status error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
}
