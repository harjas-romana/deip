import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { eventSchema, type EnrichedEvent } from './schema';
import logger from './logger.js';
import { z } from 'zod';

// Initialize Express
const app = express();

// Replace the cors line with:
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, chrome extensions)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === '*')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Ping Redis to check connection
    const pong = await redis.ping();
    
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      redis: pong === 'PONG' ? 'connected' : 'disconnected',
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Redis connection failed',
    });
  }
});

// Main event ingestion endpoint
app.post('/events', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // 1. Validate incoming event
    const validatedEvent = eventSchema.parse(req.body);

    // 2. Enrich event with metadata
    const enrichedEvent: EnrichedEvent = {
      ...validatedEvent,
      eventId: uuidv4(),
      receivedAt: Date.now(),
      source: req.headers['user-agent'] || 'unknown',
    };

    // 3. Publish to Redis Stream
    const streamId = await redis.xadd(
      'events-stream',
      '*',
      {
        payload: JSON.stringify(enrichedEvent),
      }
    );

    logger.info('Published to Redis stream', {
  streamId,
  streamName: 'events-stream',
  eventId: enrichedEvent.eventId,
});

    // 4. Log success
    const processingTime = Date.now() - startTime;
    logger.info('Event ingested', {
      eventId: enrichedEvent.eventId,
      eventType: enrichedEvent.eventType,
      userId: enrichedEvent.userId,
      streamId,
      processingTime,
    });

    // 5. Respond with 202 Accepted
    res.status(202).json({
      status: 'accepted',
      eventId: enrichedEvent.eventId,
      streamId,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn('Validation failed', {
        errors: error.issues,
        body: req.body,
        processingTime,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Handle Redis errors
    logger.error('Event ingestion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      processingTime,
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`ingestion API started`, {
    port: PORT,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});