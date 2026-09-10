import IORedis, { RedisOptions } from "ioredis";

/**
 * Global Redis connection configuration for BullMQ
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`.
 */

export function getRedisOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const isTls = redisUrl.startsWith("rediss://");
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 20000,
      family: 4, // Force IPv4 to prevent Windows getaddrinfo IPv6 lookup failures
      keepAlive: 30000,
      retryStrategy: (times: number) => {
        // Backoff retry: 500ms, 1000ms, ... max 4000ms
        const delay = Math.min(times * 500, 4000);
        return delay;
      },
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    };
  }

  const isTlsHost = process.env.REDIS_TLS === "true" || (process.env.REDIS_HOST && process.env.REDIS_HOST.includes("upstash.io"));

  const dbIndex = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined;

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: dbIndex,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 20000,
    family: 4,
    keepAlive: 30000,
    retryStrategy: (times: number) => Math.min(times * 500, 4000),
    ...(isTlsHost ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

let redisInstance: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisInstance = new IORedis(redisUrl, getRedisOptions());
  } else {
    redisInstance = new IORedis(getRedisOptions());
  }

  redisInstance.on("error", (err) => {
    // Avoid unhandled crash on transient network disconnects
    console.warn("⚠️ [Redis Connection Interruption]:", err.message);
  });

  return redisInstance;
}

/**
 * Quick ping test to check if Redis is alive and accessible
 */
export async function isRedisConnected(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const pong = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timeout")), 2000)
      ),
    ]);
    return pong === "PONG";
  } catch (err) {
    return false;
  }
}
