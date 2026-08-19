import { redis } from "#server/lib/redis";
import { getAppLogger } from "#shared/logger";

const logger = getAppLogger("server", "cache");

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!redis) {
    return fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    logger.warning("cache.get_failed", { key, error: String(err) });
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, fresh, { ex: ttlSeconds });
  } catch (err) {
    logger.warning("cache.set_failed", { key, error: String(err) });
  }

  return fresh;
}
