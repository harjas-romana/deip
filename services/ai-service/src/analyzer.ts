import Groq from 'groq-sdk';
import { pool } from './db.js';
import logger from './logger.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.3-70b-versatile';

export interface UserDayData {
  userId: string;
  date: string;
  focusTime: number;
  idleTime: number;
  tabSwitches: number;
  appOpens: number;
  whatsappMessages: number;
  studySessions: number;
  eventCount: number;
}

export async function generateInsight(data: UserDayData): Promise<string> {
  const startTime = Date.now();

  const prompt = `You are a concise productivity analyst. Analyze this user's daily behavior data:

- Focus Time: ${data.focusTime} minutes
- Idle Time: ${data.idleTime} minutes
- Tab Switches: ${data.tabSwitches}
- App Opens: ${data.appOpens}
- WhatsApp Messages: ${data.whatsappMessages}
- Study Sessions: ${data.studySessions}
- Total Events: ${data.eventCount}

Give exactly 3 bullet points:
1. One observation about their productivity pattern
2. One specific risk or concern
3. One actionable recommendation

Be direct. No fluff. Max 50 words total.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 200,
    });

    const insight = completion.choices[0]?.message?.content || 'No insight generated';
    const tokensUsed = completion.usage?.total_tokens || 0;
    const processingTime = Date.now() - startTime;

    // Store insight in database
    await pool.query(`
      INSERT INTO ai_insights (user_id, date, insight_type, insight, input_data, model, tokens_used, processing_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, date, insight_type)
      DO UPDATE SET
        insight = EXCLUDED.insight,
        input_data = EXCLUDED.input_data,
        tokens_used = EXCLUDED.tokens_used,
        processing_time = EXCLUDED.processing_time,
        created_at = NOW()
    `, [
      data.userId,
      data.date,
      'DAILY_SUMMARY',
      insight,
      JSON.stringify(data),
      MODEL,
      tokensUsed,
      processingTime,
    ]);

    logger.info('Insight generated and stored', {
      userId: data.userId,
      date: data.date,
      tokensUsed,
      processingTime,
    });

    return insight;

  } catch (error) {
    logger.error('Groq API error', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId: data.userId,
    });
    throw error;
  }
}

export async function getUserDayData(userId: string, date: string): Promise<UserDayData | null> {
  const result = await pool.query(`
    SELECT 
      user_id,
      date,
      focus_time,
      idle_time,
      tab_switches,
      app_opens,
      whatsapp_messages,
      study_sessions,
      event_count
    FROM daily_aggregates
    WHERE user_id = $1 AND date = $2
  `, [userId, date]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    userId: row.user_id,
    date: row.date.toISOString().split('T')[0],
    focusTime: row.focus_time,
    idleTime: row.idle_time,
    tabSwitches: row.tab_switches,
    appOpens: row.app_opens,
    whatsappMessages: row.whatsapp_messages,
    studySessions: row.study_sessions,
    eventCount: row.event_count,
  };
}