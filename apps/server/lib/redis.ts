import { Redis } from "@upstash/redis";

import logger from "./pino";
/**
 * Redis client instance using Upstash Redis (REST-based).
 * Configured automatically from environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
const redis = Redis.fromEnv();
logger.info({
  msg: "Upstash Redis client ready",
  time: new Date().toISOString(),
});

export default redis;
