/**
 * Submit Route - POST /api/submit
 * Accepts URLs for indexing and creates queue jobs
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { submissions } from '../db/schema.js';
import { selectLeastUsedKey } from '../services/google-indexer.js';
import { enqueueSubmission } from '../services/queue-manager.js';

// Request body schema
const submitSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL required').max(100, 'Maximum 100 URLs per request'),
  userId: z.string().uuid(), // In production, extract from auth token
});

type SubmitBody = z.infer<typeof submitSchema>;

export default async function submitRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/submit
   * Submits URLs for indexing
   */
  fastify.post<{ Body: SubmitBody }>(
    '/submit',
    async (request: FastifyRequest<{ Body: SubmitBody }>, reply: FastifyReply) => {
      try {
        // Validate request body
        const { urls, userId } = submitSchema.parse(request.body);
        
        // Deduplicate URLs
        const uniqueUrls = [...new Set(urls)];
        
        const accepted: string[] = [];
        const rejected: Array<{ url: string; reason: string }> = [];
        
        // Select service key for this user
        const serviceKey = await selectLeastUsedKey(userId);
        
        if (!serviceKey) {
          return reply.code(400).send({
            error: 'No service keys available or quota exceeded',
            accepted: [],
            rejected: uniqueUrls.map(url => ({
              url,
              reason: 'No available service keys with quota',
            })),
            queued: 0,
          });
        }
        
        // Process each URL
        for (const url of uniqueUrls) {
          try {
            // Validate URL format
            const urlObj = new URL(url);
            
            // Only accept http/https
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
              rejected.push({
                url,
                reason: 'Only HTTP/HTTPS URLs are supported',
              });
              continue;
            }
            
            // Create submission record
            const [submission] = await db
              .insert(submissions)
              .values({
                userId,
                url,
                keyUsed: serviceKey.id,
                googleStatus: 'pending',
                indexnowStatus: 'pending',
              })
              .returning();
            
            // Enqueue for processing
            await enqueueSubmission(
              submission.id,
              url,
              serviceKey.id,
              userId
            );
            
            accepted.push(url);
            
          } catch (error: any) {
            rejected.push({
              url,
              reason: error.message || 'Invalid URL format',
            });
          }
        }
        
        return reply.code(200).send({
          accepted,
          rejected,
          queued: accepted.length,
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('Submit error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
}
