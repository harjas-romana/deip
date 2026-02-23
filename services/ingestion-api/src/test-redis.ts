import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function test() {
  console.log('Testing Redis connection...\n');

  try {
    // Test 1: Ping
    const pong = await redis.ping();
    console.log('✅ Ping:', pong);

    // Test 2: Write to stream
    const id = await redis.xadd('test-stream', '*', { message: 'hello' });
    console.log('✅ XADD result:', id);

    // Test 3: Read from stream
    const messages = await redis.xrange('test-stream', '-', '+');
    console.log('✅ XRANGE result:', messages);

    // Test 4: Length
    const length = await redis.xlen('test-stream');
    console.log('✅ XLEN:', length);

    // Cleanup
    await redis.del('test-stream');
    console.log('✅ Cleanup done');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

test();