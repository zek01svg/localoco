import {
  configureSync,
  getConsoleSink,
  getLogger,
  jsonLinesFormatter,
  withFilter,
} from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";
import { getSentrySink } from "@logtape/sentry";

export type AppRuntime = "browser" | "server";

export type ConfigureAppLoggingOptions = {
  runtime: AppRuntime;
  isDevelopment: boolean;
  enableSentrySink: boolean;
  sentryBreadcrumbs?: boolean;
};

export const configureAppLogging = ({
  runtime,
  isDevelopment,
  enableSentrySink,
  sentryBreadcrumbs = true,
}: ConfigureAppLoggingOptions): void => {
  // Development reads best as the pretty, signale-style output; production
  // emits one JSON object per line so logs stay machine-parseable.
  const formatter = isDevelopment ? prettyFormatter : jsonLinesFormatter;
  const consoleSink =
    !isDevelopment && enableSentrySink
      ? withFilter(getConsoleSink({ formatter }), "warning")
      : getConsoleSink({ formatter });
  const sinks = {
    console: consoleSink,
    ...(enableSentrySink
      ? { sentry: getSentrySink({ enableBreadcrumbs: sentryBreadcrumbs }) }
      : {}),
  };

  configureSync({
    reset: true,
    sinks,
    loggers: [
      {
        category: [],
        sinks: Object.keys(sinks),
        lowestLevel: isDevelopment ? "debug" : "info",
      },
      {
        category: ["app", runtime],
        lowestLevel: isDevelopment ? "debug" : "info",
      },
      {
        category: ["logtape"],
        sinks: ["console"],
        lowestLevel: isDevelopment ? "debug" : "error",
      },
    ],
  });
};

export const getAppLogger = (runtime: AppRuntime, ...category: string[]) =>
  getLogger(["app", runtime, ...category]);
