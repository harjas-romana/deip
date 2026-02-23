import { pool } from './db.js';
import logger from './logger.js';
import { EnrichedEvent } from './types.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function processEvent(event: EnrichedEvent): Promise<void> {
  const startTime = Date.now();

  try {
    await storeRawEvent(event);
    await updateDailyAggregates(event);
    await checkPatterns(event);

    logger.info('Event processed', {
      eventId: event.eventId,
      eventType: event.eventType,
      userId: event.userId,
      processingTime: Date.now() - startTime,
    });

  } catch (error) {
    logger.error('Event processing failed', {
      eventId: event.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
    throw error;
  }
}

async function storeRawEvent(event: EnrichedEvent): Promise<void> {
  const query = `
    INSERT INTO events (event_id, user_id, event_type, payload, created_at)
    VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
    ON CONFLICT (event_id) DO NOTHING
  `;

  await pool.query(query, [
    event.eventId,
    event.userId,
    event.eventType,
    JSON.stringify(event),
    event.timestamp,
  ]);
}

async function updateDailyAggregates(event: EnrichedEvent): Promise<void> {
  const date = new Date(event.timestamp).toISOString().split('T')[0];
  const duration = event.duration || 0;

  const columns: Record<string, string> = {
    FOCUS_SESSION: 'focus_time',
    IDLE_TIME: 'idle_time',
    TAB_SWITCH: 'tab_switches',
    APP_OPEN: 'app_opens',
    WHATSAPP_MESSAGE: 'whatsapp_messages',
    STUDY_SESSION: 'study_sessions',
  };

  const columnToUpdate = columns[event.eventType];

  const value = ['FOCUS_SESSION', 'IDLE_TIME', 'STUDY_SESSION'].includes(event.eventType)
    ? duration
    : 1;

  const query = `
    INSERT INTO daily_aggregates (user_id, date, ${columnToUpdate}, event_count)
    VALUES ($1, $2, $3, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      ${columnToUpdate} = daily_aggregates.${columnToUpdate} + EXCLUDED.${columnToUpdate},
      event_count = daily_aggregates.event_count + 1,
      updated_at = NOW()
  `;

  await pool.query(query, [event.userId, date, value]);
}

async function checkPatterns(event: EnrichedEvent): Promise<void> {
  const date = new Date(event.timestamp).toISOString().split('T')[0];

  const result = await pool.query(`
    SELECT focus_time, idle_time, tab_switches, app_opens, whatsapp_messages, study_sessions, event_count
    FROM daily_aggregates
    WHERE user_id = $1 AND date = $2
  `, [event.userId, date]);

  if (result.rows.length === 0) return;

  const agg = result.rows[0];

  // Pattern 1: Low productivity (focus < 60 min AND event count > 10)
  if (agg.focus_time < 60 && agg.event_count > 10) {
    await triggerAI({
      type: 'LOW_PRODUCTIVITY_ALERT',
      userId: event.userId,
      date,
      focusTime: agg.focus_time,
      idleTime: agg.idle_time,
      tabSwitches: agg.tab_switches,
      appOpens: agg.app_opens,
      whatsappMessages: agg.whatsapp_messages,
      studySessions: agg.study_sessions,
      eventCount: agg.event_count,
    });
  }

  // Pattern 2: High distraction (tab switches > 20)
  if (agg.tab_switches > 20) {
    await triggerAI({
      type: 'LOW_PRODUCTIVITY_ALERT',
      userId: event.userId,
      date,
      focusTime: agg.focus_time,
      idleTime: agg.idle_time,
      tabSwitches: agg.tab_switches,
      appOpens: agg.app_opens,
      whatsappMessages: agg.whatsapp_messages,
      studySessions: agg.study_sessions,
      eventCount: agg.event_count,
    });
  }
}

async function triggerAI(task: any): Promise<void> {
  try {
    await redis.xadd('ai-queue', '*', {
      payload: JSON.stringify(task),
    });

    logger.info('AI task queued', {
      type: task.type,
      userId: task.userId,
    });
  } catch (error) {
    logger.error('Failed to queue AI task', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}