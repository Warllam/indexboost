/**
 * IndexBoost API Server
 * Main entry point - Fastify server with CORS, rate limiting, and graceful shutdown
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './lib/config.js';
import { closeDatabase } from './db/index.js';
import { closeQueueManager } from './services/queue-manager.js';
import { closeQuotaTracker, initializeQuotaReset, resetAllDailyQuotas } from './services/quota-tracker.js';

// Import routes
import submitRoutes from './routes/submit.js';
import statusRoutes from './routes/status.js';
import historyRoutes from './routes/history.js';
import keysRoutes from './routes/keys.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development' 
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

/**
 * Register plugins and routes
 */
async function buildServer() {
  // CORS - Allow frontend to access API
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });
  
  // Rate limiting - 100 requests per minute per IP
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: context.after,
    }),
  });
  
  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // Register API routes
  await fastify.register(submitRoutes, { prefix: '/api' });
  await fastify.register(statusRoutes, { prefix: '/api' });
  await fastify.register(historyRoutes, { prefix: '/api' });
  await fastify.register(keysRoutes, { prefix: '/api' });
  
  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
  
  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    
    reply.code(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'Something went wrong',
    });
  });
  
  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    const server = await buildServer();
    
    // Initialize quota reset scheduler
    await initializeQuotaReset();
    
    // Start listening
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🚀 IndexBoost API Server Running             ║
║                                                       ║
║  Port:        ${config.PORT}                                  ║
║  Environment: ${config.NODE_ENV}                         ║
║  CORS Origin: ${config.CORS_ORIGIN}       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  try {
    // Close Fastify (stops accepting new connections)
    await fastify.close();
    console.log('✅ Fastify server closed');
    
    // Close queue manager and workers
    await closeQueueManager();
    
    // Close quota tracker
    await closeQuotaTracker();
    
    // Close database connection
    await closeDatabase();
    console.log('✅ Database connection closed');
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
start();
