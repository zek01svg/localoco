import { configureSync, getConsoleSink, getLogger, withFilter } from "@logtape/logtape";
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
  const consoleSink =
    !isDevelopment && enableSentrySink ? withFilter(getConsoleSink(), "warning") : getConsoleSink();
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
