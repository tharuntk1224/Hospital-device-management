import Redis from 'ioredis';
import { config } from './env';

const redisOptions = config.redis.url
  ? { lazyConnect: true }
  : {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      lazyConnect: true,
    };

export const redis = config.redis.url
  ? new Redis(config.redis.url, redisOptions)
  : new Redis(redisOptions);

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

export async function testRedisConnection(): Promise<void> {
  await redis.connect();
  await redis.ping();
}

// Cache helper utilities
export const CACHE_TTL = {
  DASHBOARD: 300,       // 5 minutes
  DEVICE_LIST: 120,     // 2 minutes
  COMPLIANCE: 600,      // 10 minutes
  REPORTS: 300,         // 5 minutes
} as const;

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    return null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('Redis setCache error:', err);
  }
}

export async function deleteCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('Redis deleteCache error:', err);
  }
}

export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard:stats',
  DEVICE_LIST: 'devices:list:*',
  COMPLIANCE: 'compliance:stats',
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
};
