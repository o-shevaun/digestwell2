import Redis from "ioredis";

let _client: Redis | null = null;

export function getRedis() {
  if (_client) return _client;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  _client = new Redis(url);
  return _client;
}

export async function redisSetJSON(key: string, value: any, ttlSeconds?: number) {
  const r = getRedis();
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await r.set(key, payload, "EX", ttlSeconds);
  } else {
    await r.set(key, payload);
  }
}

export async function redisGetJSON<T = any>(key: string): Promise<T | null> {
  const r = getRedis();
  const v = await r.get(key);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function redisDel(key: string) {
  const r = getRedis();
  await r.del(key);
}
