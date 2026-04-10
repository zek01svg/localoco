import type auth from "./auth";

/**
 * Custom Hono Context Variables.
 * This extends Hono's base context to include the user session.
 */
export type AppVariables = {
  session: typeof auth.$Infer.Session | null;
};
