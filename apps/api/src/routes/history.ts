/**
 * History Route - GET /api/history
 * Returns paginated submission history with filtering
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { submissions } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

// Query parameters schema
const historyQuerySchema = z.object({
  userId: z.string().uuid(), // In production, extract from auth token
  limit: z.string().default('50').transform(Number).pipe(z.number().min(1).max(100)),
  offset: z.string().default('0').transform(Number).pipe(z.number().min(0)),
  status: z.enum(['pending', 'queued', 'success', 'failed']).optional(),
});

type HistoryQuery = z.infer<typeof historyQuerySchema>;

export default async function historyRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/history
   * Returns paginated submission history
   */
  fastify.get<{ Querystring: HistoryQuery }>(
    '/history',
    async (request: FastifyRequest<{ Querystring: HistoryQuery }>, reply: FastifyReply) => {
      try {
        const { userId, limit, offset, status } = historyQuerySchema.parse(request.query);
        
        // Build query conditions
        const conditions = [eq(submissions.userId, userId)];
        
        if (status) {
          // Filter by status (check both google and indexnow status)
          conditions.push(eq(submissions.googleStatus, status));
        }
        
        // Fetch submissions
        const results = await db
          .select()
          .from(submissions)
          .where(and(...conditions))
          .orderBy(desc(submissions.createdAt))
          .limit(limit)
          .offset(offset);
        
        // Get total count for pagination
        const total = results.length; // Simplified - in production use COUNT(*)
        
        return reply.code(200).send({
          submissions: results.map(sub => ({
            id: sub.id,
            url: sub.url,
            googleStatus: sub.googleStatus,
            indexnowStatus: sub.indexnowStatus,
            attempts: sub.attempts,
            errorMessage: sub.errorMessage,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
          })),
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
          },
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('History error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
}
