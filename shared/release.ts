export const DEFAULT_RELEASE = "localoco@2.3.0";

/**
 * Resolves the immutable Sentry release identifier.
 * Uses explicit environment release if present, falling back to canonical project release.
 */
export const resolveRelease = (r?: string): string => {
  const trimmed = r?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_RELEASE;
};
