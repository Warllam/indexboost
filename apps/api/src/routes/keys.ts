/**
 * Service Keys Routes - POST/GET/DELETE /api/keys
 * Manages Google Service Account credentials
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { serviceKeys } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt, validateServiceAccountJSON } from '../lib/crypto.js';

// POST /api/keys - Add service account
const addKeySchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  serviceAccountJson: z.string().min(1),
  dailyLimit: z.number().min(1).max(1000).default(200),
});

type AddKeyBody = z.infer<typeof addKeySchema>;

// GET /api/keys - List keys
const listKeysQuerySchema = z.object({
  userId: z.string().uuid(),
});

type ListKeysQuery = z.infer<typeof listKeysQuerySchema>;

// DELETE /api/keys/:id - Delete key
const deleteKeyParamsSchema = z.object({
  id: z.string().uuid(),
});

const deleteKeyQuerySchema = z.object({
  userId: z.string().uuid(),
});

type DeleteKeyParams = z.infer<typeof deleteKeyParamsSchema>;
type DeleteKeyQuery = z.infer<typeof deleteKeyQuerySchema>;

export default async function keysRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/keys
   * Adds a new service account key (encrypts credentials)
   */
  fastify.post<{ Body: AddKeyBody }>(
    '/keys',
    async (request: FastifyRequest<{ Body: AddKeyBody }>, reply: FastifyReply) => {
      try {
        const { userId, name, serviceAccountJson, dailyLimit } = addKeySchema.parse(request.body);
        
        // Validate service account JSON format
        if (!validateServiceAccountJSON(serviceAccountJson)) {
          return reply.code(400).send({
            error: 'Invalid service account JSON',
            message: 'The provided JSON is not a valid Google Service Account',
          });
        }
        
        // Encrypt credentials
        const encryptedCredentials = encrypt(serviceAccountJson);
        
        // Insert into database
        const [newKey] = await db
          .insert(serviceKeys)
          .values({
            userId,
            name,
            encryptedCredentials,
            dailyLimit,
            dailyUsed: 0,
          })
          .returning();
        
        return reply.code(201).send({
          id: newKey.id,
          name: newKey.name,
          dailyLimit: newKey.dailyLimit,
          createdAt: newKey.createdAt,
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('Add key error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
  
  /**
   * GET /api/keys
   * Lists all service keys for a user (credentials not exposed)
   */
  fastify.get<{ Querystring: ListKeysQuery }>(
    '/keys',
    async (request: FastifyRequest<{ Querystring: ListKeysQuery }>, reply: FastifyReply) => {
      try {
        const { userId } = listKeysQuerySchema.parse(request.query);
        
        // Fetch keys
        const keys = await db
          .select({
            id: serviceKeys.id,
            name: serviceKeys.name,
            dailyLimit: serviceKeys.dailyLimit,
            dailyUsed: serviceKeys.dailyUsed,
            lastReset: serviceKeys.lastReset,
            createdAt: serviceKeys.createdAt,
          })
          .from(serviceKeys)
          .where(eq(serviceKeys.userId, userId));
        
        return reply.code(200).send({
          keys: keys.map(key => ({
            ...key,
            available: key.dailyLimit - key.dailyUsed,
          })),
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('List keys error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
  
  /**
   * DELETE /api/keys/:id
   * Deletes a service key
   */
  fastify.delete<{ Params: DeleteKeyParams; Querystring: DeleteKeyQuery }>(
    '/keys/:id',
    async (
      request: FastifyRequest<{ Params: DeleteKeyParams; Querystring: DeleteKeyQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = deleteKeyParamsSchema.parse(request.params);
        const { userId } = deleteKeyQuerySchema.parse(request.query);
        
        // Delete key (only if it belongs to the user)
        const result = await db
          .delete(serviceKeys)
          .where(and(eq(serviceKeys.id, id), eq(serviceKeys.userId, userId)))
          .returning();
        
        if (result.length === 0) {
          return reply.code(404).send({
            error: 'Service key not found',
          });
        }
        
        return reply.code(200).send({
          message: 'Service key deleted successfully',
          id,
        });
        
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.errors,
          });
        }
        
        console.error('Delete key error:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );
}
