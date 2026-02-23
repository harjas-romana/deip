import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function triggerTestAI() {
  console.log('📤 Sending test AI task...\n');

  await redis.xadd('ai-queue', '*', {
    payload: JSON.stringify({
      type: 'LOW_PRODUCTIVITY_ALERT',
      userId: 'harjas',
      date: '2024-01-15',
      focusTime: 25,
      idleTime: 120,
      tabSwitches: 47,
      appOpens: 15,
      whatsappMessages: 32,
      studySessions: 1,
      eventCount: 95,
    }),
  });

  console.log('✅ Test AI task queued!');
  console.log('Now run: npm run dev');

  process.exit(0);
}

triggerTestAI();