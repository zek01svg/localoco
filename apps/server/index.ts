import app from "@server/app";
import { env } from "@server/env";
import { initQueue } from "@server/lib/email-queue";
import logger from "@server/lib/pino";

const port = env.PORT;
const url = env.VITE_APP_URL;
const start = Date.now();
const server = {
  port: port,
  fetch: app.fetch,
};

logger.info(`🚀 Server is running on ${url}`);
logger.info(`✅ Ready in ${Date.now() - start} ms`);
logger.info(`🧠 Bun v${Bun.version}`);

// initialize qstash email queue
initQueue().catch((err) => {
  logger.error(`failed to initialize qstash client: ${err}`);
});

export default server;
