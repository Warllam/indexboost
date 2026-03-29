/**
 * JWT Authentication Middleware
 * 
 * Valide les tokens JWT émis par Auth.js et extrait l'identité de l'utilisateur.
 * Compatible avec les tokens Auth.js standard (HS256).
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from './config.js';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/index.js';

/**
 * Verify JWT token and extract payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    
    if (!payload.sub || !payload.email) {
      throw new Error('Invalid token payload: missing sub or email');
    }
    
    return payload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fastify preHandler hook for JWT authentication
 * 
 * Usage:
 * fastify.get('/protected', { preHandler: authenticateJWT }, async (request, reply) => {
 *   const userId = request.userId;
 *   const userEmail = request.userEmail;
 * });
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
      });
    }
    
    const token = parts[1];
    const payload = verifyToken(token);
    
    // Attach user info to request
    request.userId = payload.sub;
    request.userEmail = payload.email;
    request.userName = payload.name;
    
  } catch (error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}

// Extend FastifyRequest type to include user info
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
    userName?: string;
  }
}
