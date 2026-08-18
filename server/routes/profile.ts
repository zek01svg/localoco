import type { EmailChangeResponse } from "#shared/contracts/profiles";

import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { user } from "#server/database/auth";
import { auth } from "#server/lib/auth";
import { requireAuth, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  emailChangeResponseSchema,
  emailChangeSchema,
  privateProfileSchema,
  profileUpdateSchema,
} from "#shared/contracts/profiles";

const dependencyMessage = "User profiles are temporarily unavailable. Try again shortly.";

// better-auth's own isAPIError duck-types on statusCode because instanceof
// can fail across duplicated @better-auth/core copies (one nested under
// better-auth, one hoisted) — reproduce that shape check here.
function isRequestFailure(cause: unknown): cause is { statusCode: number; message: string } {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "statusCode" in cause &&
    typeof cause.statusCode === "number"
  );
}

const authErrorResponses = {
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const mutationErrorResponses = {
  400: {
    description: "Request parameters failed validation",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description: "Email verification required to update the profile",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const privateProfile = {
  id: user.id,
  displayName: user.name,
  avatarUrl: user.image,
  email: user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
} as const;

export const profileRoutes = new Hono()
  .get(
    "/profile",
    requireAuth,
    describeRoute({
      operationId: "getPersonalProfile",
      tags: ["users"],
      summary: "Get the session user's personal profile",
      description:
        "Private account information of the authenticated User: email, verification state, and timestamps that the public profile structurally omits. The subject is derived from the session; any submitted identifier is ignored. The response is personalized, so it never enters a shared cache.",
      responses: {
        200: {
          description: "The session user's private profile",
          content: {
            "application/json": { schema: resolver(privateProfileSchema) },
          },
        },
        ...authErrorResponses,
        503: {
          description: "The user data source is temporarily unavailable",
          content: {
            "application/json": { schema: resolver(errorEnvelopeSchema) },
          },
        },
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      let rows;
      try {
        rows = await db.select(privateProfile).from(user).where(eq(user.id, actor.userId)).limit(1);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause,
        });
      }

      if (rows.length === 0) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("session user vanished from the user table"),
        });
      }

      const parsed = privateProfileSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the private profile contract"),
        });
      }

      // Personalized response: never enters a shared cache.
      c.header("Cache-Control", "private, no-store");
      return c.json(parsed.data);
    }
  )
  .patch(
    "/profile",
    requireVerified,
    validator("json", profileUpdateSchema, onValidationError),
    describeRoute({
      operationId: "updatePersonalProfile",
      tags: ["users"],
      summary: "Update the session user's profile",
      description:
        "Updates the authenticated User's own displayName and avatarUrl. The target is derived from the session and enforced in the database write predicate; identifiers in the request body are stripped by validation and can never redirect the update.",
      responses: {
        200: {
          description: "The updated private profile",
          content: {
            "application/json": { schema: resolver(privateProfileSchema) },
          },
        },
        ...mutationErrorResponses,
        ...authErrorResponses,
        503: {
          description: "The user data source is temporarily unavailable",
          content: {
            "application/json": { schema: resolver(errorEnvelopeSchema) },
          },
        },
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { displayName, avatarUrl } = c.req.valid("json");

      let rows;
      try {
        // The write predicate runs at the mutation boundary on the
        // session-derived id; the schema has already stripped any identifier
        // the client submitted.
        rows = await db
          .update(user)
          .set({
            ...(displayName === undefined ? {} : { name: displayName }),
            ...(avatarUrl === undefined ? {} : { image: avatarUrl }),
            updatedAt: new Date(),
          })
          .where(eq(user.id, actor.userId))
          .returning(privateProfile);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause,
        });
      }

      if (rows.length === 0) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("session user vanished from the user table"),
        });
      }

      const parsed = privateProfileSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the private profile contract"),
        });
      }

      c.header("Cache-Control", "private, no-store");
      return c.json(parsed.data);
    }
  )
  .post(
    "/profile/email-change",
    requireVerified,
    validator("json", emailChangeSchema, onValidationError),
    describeRoute({
      operationId: "changePersonalEmail",
      tags: ["users"],
      summary: "Request a verified email change for the session user",
      description:
        "Starts the double opt-in email change: the actor confirms at the current address, then verifies the new one. The target is the session user — identifiers in the body are stripped. A request for an email already in use answers identically without sending anything, so email existence never leaks.",
      responses: {
        200: {
          description:
            "The confirmation email was sent (or would have been, had the address been taken)",
          content: {
            "application/json": { schema: resolver(emailChangeResponseSchema) },
          },
        },
        ...mutationErrorResponses,
        ...authErrorResponses,
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { email } = c.req.valid("json");

      try {
        // Session-derived subject: better-auth resolves the User from the
        // request cookie, and the identifier in the body was already
        // stripped by validation.
        await auth.api.changeEmail({
          headers: c.req.raw.headers,
          body: { newEmail: email, callbackURL: "/profile" },
        });
      } catch (cause) {
        if (isRequestFailure(cause) && cause.statusCode < 500) {
          throw new HttpError(400, "invalid_request", cause.message, undefined, { cause });
        }
        // A failing dependency (queue, mailer, or user store) answers 503 like
        // every other data-source failure in this app.
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause,
        });
      }

      // Identical whether the confirmation email was sent or the address is
      // already taken: better-auth's anti-enumeration behavior must not be
      // observable through this endpoint either.
      c.header("Cache-Control", "private, no-store");
      return c.json({
        status: "confirmation_sent",
      } satisfies EmailChangeResponse);
    }
  );
