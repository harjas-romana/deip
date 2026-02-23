import 'dotenv/config';
import { Redis } from '@upstash/redis';
import { pool, testConnection } from './db.js';
import { generateInsight, getUserDayData, UserDayData } from './analyzer.js';
import logger from './logger.js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const AI_QUEUE = 'ai-queue';
let lastId = '0-0';

// Rate limiting
let requestsThisMinute = 0;
let minuteStart = Date.now();
const MAX_REQUESTS_PER_MINUTE = 25; // Groq free tier is 30, keep buffer

async function checkRateLimit(): Promise<boolean> {
  const now = Date.now();

  // Reset counter every minute
  if (now - minuteStart > 60000) {
    requestsThisMinute = 0;
    minuteStart = now;
  }

  if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = 60000 - (now - minuteStart);
    logger.warn('Rate limit reached, waiting...', { waitTime });
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestsThisMinute = 0;
    minuteStart = Date.now();
  }

  requestsThisMinute++;
  return true;
}

async function processAITask(task: any): Promise<void> {
  const { type, userId } = task;

  switch (type) {
    case 'LOW_PRODUCTIVITY_ALERT': {
      await checkRateLimit();

      const data: UserDayData = {
        userId,
        date: task.date || new Date().toISOString().split('T')[0],
        focusTime: task.focusTime || 0,
        idleTime: task.idleTime || 0,
        tabSwitches: task.tabSwitches || 0,
        appOpens: task.appOpens || 0,
        whatsappMessages: task.whatsappMessages || 0,
        studySessions: task.studySessions || 0,
        eventCount: task.eventCount || 0,
      };

      const insight = await generateInsight(data);
      logger.info('Alert insight generated', { userId, insight });
      break;
    }

    case 'DAILY_SUMMARY': {
      await checkRateLimit();

      const date = task.date || new Date().toISOString().split('T')[0];
      const data = await getUserDayData(userId, date);

      if (!data) {
        logger.warn('No data found for daily summary', { userId, date });
        return;
      }

      const insight = await generateInsight(data);
      logger.info('Daily summary generated', { userId, date, insight });
      break;
    }

    default:
      logger.warn('Unknown AI task type', { type });
  }
}

async function consumeAIQueue(): Promise<void> {
  logger.info('AI service started', { queue: AI_QUEUE });

  while (true) {
    try {
      const result = await redis.xrange(
        AI_QUEUE,
        lastId === '0-0' ? '-' : `(${lastId}`,
        '+',
        5
      ) as any;

      if (!result || Object.keys(result).length === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      for (const [messageId, fields] of Object.entries(result)) {
        try {
          // Upstash auto-parses, so fields.payload is already an object
          const task = typeof (fields as any).payload === 'string'
            ? JSON.parse((fields as any).payload)
            : (fields as any).payload;

          await processAITask(task);
          lastId = messageId;

        } catch (error) {
          logger.error('AI task failed', {
            messageId,
            error: error instanceof Error ? error.message : 'Unknown',
          });
          lastId = messageId; // Skip failed messages
        }
      }

    } catch (error) {
      logger.error('AI consumer error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down...');
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      process.exit(1);
    }

    await consumeAIQueue();

  } catch (error) {
    logger.error('Failed to start AI service', { error });
    process.exit(1);
  }
}

start();