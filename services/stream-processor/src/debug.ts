import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function debug() {
  try {
    console.log('🔍 Checking Redis Stream...\n');

    const length = await redis.xlen('events-stream');
    console.log('📨 Total messages in stream:', length);

    if (length === 0) {
      console.log('⚠️  No messages in stream yet.');
      process.exit(0);
    }

    console.log('✅ Stream has messages!\n');

    const messages = await redis.xrange('events-stream', '-', '+', 3);

    console.log('=== RAW RESPONSE TYPE ===');
    console.log('Type:', typeof messages);
    console.log('Is Array:', Array.isArray(messages));
    console.log('');

    console.log('=== FULL RAW RESPONSE ===');
    console.log(JSON.stringify(messages, null, 2));
    console.log('');

    // Try different access patterns
    if (Array.isArray(messages)) {
      console.log('=== ARRAY FORMAT ===');
      for (const entry of messages) {
        console.log('Entry type:', typeof entry);
        console.log('Entry:', JSON.stringify(entry, null, 2));
        console.log('');
      }
    } else if (typeof messages === 'object' && messages !== null) {
      console.log('=== OBJECT FORMAT ===');
      for (const [key, value] of Object.entries(messages)) {
        console.log('Key:', key);
        console.log('Value type:', typeof value);
        console.log('Value:', JSON.stringify(value, null, 2));
        console.log('');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full:', error);
  }

  process.exit(0);
}

debug();