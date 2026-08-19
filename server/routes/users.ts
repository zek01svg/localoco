import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";

import { user } from "#server/database/auth";
import { db } from "#server/lib/db";
import { HttpError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { publicProfileSchema } from "#shared/contracts/profiles";

const dependencyMessage = "User profiles are temporarily unavailable. Try again shortly.";

export const usersRoutes = new Hono().get(
  "/users/:id",
  describeRoute({
    operationId: "getPublicProfile",
    tags: ["users"],
    summary: "Get a User's public profile",
    description:
      "The public profile of a User: display name and avatar only. Private account fields are structurally absent from the response, which is identical for anonymous visitors, signed-in Users, and the profile's owner. Public Review and Forum contribution streams are added by the Reviews and Forum slices.",
    responses: {
      200: {
        description: "The public profile",
        content: { "application/json": { schema: resolver(publicProfileSchema) } },
      },
      404: {
        description: "The User does not exist",
        content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
      },
      429: {
        description: "Too many requests",
        content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
      },
      503: {
        description: "The user data source is temporarily unavailable",
        content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
      },
    },
  }),
  async c => {
    const { id } = c.req.param();

    // Only public columns leave the database layer; the contract enforces the
    // same shape at the response boundary.
    let rows;
    try {
      rows = await db
        .select({ id: user.id, displayName: user.name, avatarUrl: user.image })
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
    } catch (cause) {
      throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
        cause,
      });
    }

    if (rows.length === 0) {
      throw new HttpError(404, "not_found", "User not found");
    }

    const parsed = publicProfileSchema.safeParse(rows[0]);
    if (!parsed.success) {
      throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
        cause: new Error("data seam returned a row that violates the public profile contract"),
      });
    }

    return c.json(parsed.data);
  }
);
