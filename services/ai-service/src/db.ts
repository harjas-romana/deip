import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  logger.info('Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Database error', { error: err.message });
});

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}