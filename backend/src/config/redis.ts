import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

let redisClient: any;
let isRedisAvailable = false;

// Memory storage fallback
const memoryStorage = new Map<string, string>();

const createRedisClient = () => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1, // Set to 1 so it doesn't hang indefinitely if down
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 100, 2000);
    }
  });

  client.on('connect', () => {
    console.log('✅ Redis connection successful.');
    isRedisAvailable = true;
  });

  client.on('error', (err) => {
    if (!isRedisAvailable) {
      // Only log once if it was never available
      console.warn('⚠️ Redis not available, using in-memory fallback. (Error: ' + (err as any).code + ')');
    }
    isRedisAvailable = false;
  });

  return client;
};

const realRedis = createRedisClient();

// Proxy object to handle fallback
const redisProxy = new Proxy(realRedis, {
  get: (target, prop: string) => {
    if (!isRedisAvailable) {
      // Basic mock implementation for common methods used in the app
      if (prop === 'get') {
        return async (key: string) => memoryStorage.get(key) || null;
      }
      if (prop === 'set') {
        return async (key: string, value: string, ...args: any[]) => {
          memoryStorage.set(key, value);
          // Handle EX (expiry) if provided
          const exIndex = args.indexOf('EX');
          if (exIndex > -1 && args[exIndex + 1]) {
            setTimeout(() => memoryStorage.delete(key), args[exIndex + 1] * 1000);
          }
          return 'OK';
        };
      }
      if (prop === 'del') {
        return async (key: string) => {
          const existed = memoryStorage.has(key);
          memoryStorage.delete(key);
          return existed ? 1 : 0;
        };
      }
      if (prop === 'ping') {
        return async () => 'PONG';
      }
    }
    
    const value = target[prop as keyof typeof target];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});

export default redisProxy;

