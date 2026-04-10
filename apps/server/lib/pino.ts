import { env } from "@server/env";
import pino from "pino";

/**
 * Pino logger instance.
 * Configuration:
 * - Development: pino-pretty transport
 * - Production: JSON logs (standard for Cloud providers like Vercel)
 */
const targets: pino.TransportTargetOptions[] = [];

if (env.NODE_ENV === "development") {
  targets.push({
    target: "pino-pretty",
    options: {
      colorize: true,
    },
    level: "debug",
  });
} else {
  // Standard production output
  targets.push({
    target: "pino/file",
    options: { destination: 1 }, // stdout
    level: "info",
  });
}

const transport = pino.transport({ targets });
const logger = pino(transport);

export default logger;
