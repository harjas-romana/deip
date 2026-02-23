import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

// Parse the connection string and add explicit SSL mode
const connectionString = process.env.DATABASE_URL!.includes('sslmode=')
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}sslmode=verify-full`;

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  logger.info('connection was successful to neon PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection test was successful.');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}