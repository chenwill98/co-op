import { createClient, RedisClientType } from 'redis';

declare global {
  // This allows us to re-use the same Redis client across Hot Module Reloads in dev
  // and avoid creating multiple connections.
  var __redis: RedisClientType | undefined;
}

// You can store your connection URL in an environment variable
// For AWS ElastiCache or other managed Redis, you'll typically have a URL like:
// REDIS_URL=redis://:password@your-elasticache-host:6379
const url = process.env.REDIS_URL || 'redis://localhost:6379';

let client: RedisClientType;

if (!global.__redis) {
  // Create a new client
  client = createClient({ url });

  // Attempt to connect right away (in dev, might auto-reconnect on HMR)
  client.connect().catch((err) => {
    console.error('Redis connection error:', err);
  });

  // Set global so we reuse the client
  global.__redis = client;
} else {
  // Reuse existing client
  client = global.__redis;
}

export const redis = client;