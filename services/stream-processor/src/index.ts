import 'dotenv/config';
import { Redis } from '@upstash/redis';
import { pool, testConnection } from './db.js';
import { processEvent } from './processor.js';
import logger from './logger.js';
import { EnrichedEvent } from './types.js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const STREAM_NAME = 'events-stream';
let lastId = '0-0';

function extractEvent(fields: any): EnrichedEvent | null {
  try {
    // Case 1: fields.payload is already an object (Upstash auto-parsed it)
    if (typeof fields === 'object' && fields.payload) {
      if (typeof fields.payload === 'object') {
        return fields.payload as EnrichedEvent;
      }
      if (typeof fields.payload === 'string') {
        return JSON.parse(fields.payload) as EnrichedEvent;
      }
    }

    // Case 2: fields itself is the event
    if (typeof fields === 'object' && fields.eventId) {
      return fields as EnrichedEvent;
    }

    // Case 3: fields is a string
    if (typeof fields === 'string') {
      return JSON.parse(fields) as EnrichedEvent;
    }

    logger.warn('Unknown fields format', {
      type: typeof fields,
      value: JSON.stringify(fields),
    });
    return null;

  } catch (error) {
    logger.error('Failed to extract event', {
      error: error instanceof Error ? error.message : 'Unknown',
      fieldsType: typeof fields,
      fieldsValue: JSON.stringify(fields),
    });
    return null;
  }
}

async function consumeStream(): Promise<void> {
  logger.info('Stream processor started', { stream: STREAM_NAME });

  while (true) {
    try {
      const result = await redis.xrange(
        STREAM_NAME,
        lastId === '0-0' ? '-' : `(${lastId}`,
        '+',
        10
      ) as any;

      // Handle empty results
      if (!result) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Handle array format: [[id, fields], ...]
      if (Array.isArray(result)) {
        if (result.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        for (const entry of result) {
          let messageId: string;
          let fields: any;

          if (Array.isArray(entry)) {
            [messageId, fields] = entry;
          } else {
            logger.warn('Unexpected array entry format', {
              type: typeof entry,
              value: JSON.stringify(entry),
            });
            continue;
          }

          const event = extractEvent(fields);
          if (event) {
            await processEvent(event);
            logger.info('Message processed', {
              messageId,
              eventId: event.eventId,
              eventType: event.eventType,
              userId: event.userId,
            });
          }

          lastId = messageId;
        }
        continue;
      }

      // Handle object format: { 'id': { payload: ... }, ... }
      if (typeof result === 'object') {
        const entries = Object.entries(result);
        if (entries.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        for (const [messageId, fields] of entries) {
          const event = extractEvent(fields);
          if (event) {
            await processEvent(event);
            logger.info('Message processed', {
              messageId,
              eventId: event.eventId,
              eventType: event.eventType,
              userId: event.userId,
            });
          }

          lastId = messageId;
        }
        continue;
      }

      // Unknown format
      logger.warn('Unknown result format', {
        type: typeof result,
        value: JSON.stringify(result),
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logger.error('Consumer loop error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    await consumeStream();
  } catch (error) {
    logger.error('Failed to start processor', { error });
    process.exit(1);
  }
}

start();