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
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    };
  }

  const isTlsHost = process.env.REDIS_TLS === "true" || (process.env.REDIS_HOST && process.env.REDIS_HOST.includes("upstash.io"));

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
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
    const isTls = redisUrl.startsWith("rediss://");
    redisInstance = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });
  } else {
    redisInstance = new IORedis(getRedisOptions());
  }

  redisInstance.on("error", (err) => {
    // Avoid unhandled crash on connection refused when Redis isn't running yet
    console.warn("⚠️ [Redis Connection Warning]:", err.message);
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
