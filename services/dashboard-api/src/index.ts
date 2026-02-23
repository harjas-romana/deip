import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { Redis } from '@upstash/redis';
import logger from './logger.js';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === '*')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET /api/metrics?userId=harjas&days=30
app.get('/api/metrics', async (req, res) => {
  const { userId, days = '30' } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    // Daily history
    const history = await pool.query(`
      SELECT 
        date,
        focus_time,
        idle_time,
        tab_switches,
        app_opens,
        whatsapp_messages,
        study_sessions,
        event_count
      FROM daily_aggregates
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2
    `, [userId, parseInt(days as string)]);

    // Today's data
    const today = await pool.query(`
      SELECT 
        focus_time,
        idle_time,
        tab_switches,
        app_opens,
        whatsapp_messages,
        study_sessions,
        event_count
      FROM daily_aggregates
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);

    // Total events ever
    const totalEvents = await pool.query(`
      SELECT COUNT(*) as total FROM events WHERE user_id = $1
    `, [userId]);

    // Event type breakdown
    const breakdown = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM events
      WHERE user_id = $1
      GROUP BY event_type
      ORDER BY count DESC
    `, [userId]);

    res.json({
      today: today.rows[0] || {
        focus_time: 0,
        idle_time: 0,
        tab_switches: 0,
        app_opens: 0,
        whatsapp_messages: 0,
        study_sessions: 0,
        event_count: 0,
      },
      history: history.rows.reverse(),
      totalEvents: parseInt(totalEvents.rows[0]?.total || '0'),
      breakdown: breakdown.rows,
    });
  } catch (error) {
    logger.error('Metrics query failed', { error });
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/insights/:userId
app.get('/api/insights/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const insights = await pool.query(`
      SELECT 
        date,
        insight_type,
        insight,
        tokens_used,
        processing_time,
        created_at
      FROM ai_insights
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      insights: insights.rows,
    });
  } catch (error) {
    logger.error('Insights query failed', { error });
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/events/:userId/recent
app.get('/api/events/:userId/recent', async (req, res) => {
  const { userId } = req.params;

  try {
    const events = await pool.query(`
      SELECT event_id, event_type, created_at
      FROM events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    res.json({ events: events.rows });
  } catch (error) {
    logger.error('Events query failed', { error });
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/stream/info
app.get('/api/stream/info', async (req, res) => {
  try {
    const streamLength = await redis.xlen('events-stream');
    const aiQueueLength = await redis.xlen('ai-queue');

    res.json({
      eventsStream: streamLength,
      aiQueue: aiQueueLength,
    });
  } catch (error) {
    logger.error('Stream info failed', { error });
    res.status(500).json({ error: 'Internal error' });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Dashboard API running on port ${PORT}`);
});