import type {
  AccountDeletionResponse,
  DeletionPreview,
  EmailChangeResponse,
} from "#shared/contracts/profiles";

import { and, eq, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { announcement } from "#server/database/announcement";
import { session, user } from "#server/database/auth";
import { bookmark } from "#server/database/bookmark";
import { business } from "#server/database/business";
import { event } from "#server/database/event";
import { forumPost, forumReply } from "#server/database/forum";
import { forumPostLike, forumReplyLike, reviewLike } from "#server/database/likes";
import { listing } from "#server/database/listing";
import { mediaObject } from "#server/database/media";
import { review } from "#server/database/reviews";
import { auth } from "#server/lib/auth";
import { requireAuth, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { deleteObject } from "#server/lib/media-storage";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  accountDeletionResponseSchema,
  accountDeletionSchema,
  deletionPreviewSchema,
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

async function getDeletionPreviewCounts(userId: string): Promise<DeletionPreview> {
  const [
    ownedListingsResult,
    forumPostsResult,
    thirdPartyRepliesResult,
    reviewsResult,
    forumRepliesResult,
    eventsResult,
    announcementsResult,
    bookmarksResult,
    reviewLikesResult,
    forumPostLikesResult,
    forumReplyLikesResult,
  ] = await Promise.all([
    // 1. Owned listings
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(listing)
      .innerJoin(business, eq(listing.businessId, business.id))
      .where(eq(business.ownerId, userId)),
    // 2. Affected forum posts (authored by user)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumPost)
      .where(eq(forumPost.userId, userId)),
    // 3. Third-party replies on user-started forum posts
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumReply)
      .innerJoin(forumPost, eq(forumReply.postId, forumPost.id))
      .where(and(eq(forumPost.userId, userId), ne(forumReply.userId, userId))),
    // 4. Reviews authored by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(review)
      .where(eq(review.userId, userId)),
    // 5. Forum replies authored by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumReply)
      .where(eq(forumReply.userId, userId)),
    // 6. Events authored by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(event)
      .where(eq(event.userId, userId)),
    // 7. Announcements authored by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(announcement)
      .where(eq(announcement.userId, userId)),
    // 8. Bookmarks saved by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookmark)
      .where(eq(bookmark.userId, userId)),
    // 9. Review likes by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewLike)
      .where(eq(reviewLike.userId, userId)),
    // 10. Forum post likes by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumPostLike)
      .where(eq(forumPostLike.userId, userId)),
    // 11. Forum reply likes by user
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumReplyLike)
      .where(eq(forumReplyLike.userId, userId)),
  ]);

  const ownedListings = ownedListingsResult[0]?.count ?? 0;
  const affectedForumPosts = forumPostsResult[0]?.count ?? 0;
  const thirdPartyReplies = thirdPartyRepliesResult[0]?.count ?? 0;

  const reviewsCount = reviewsResult[0]?.count ?? 0;
  const forumRepliesCount = forumRepliesResult[0]?.count ?? 0;
  const eventsCount = eventsResult[0]?.count ?? 0;
  const announcementsCount = announcementsResult[0]?.count ?? 0;
  const bookmarksCount = bookmarksResult[0]?.count ?? 0;
  const reviewLikesCount = reviewLikesResult[0]?.count ?? 0;
  const forumPostLikesCount = forumPostLikesResult[0]?.count ?? 0;
  const forumReplyLikesCount = forumReplyLikesResult[0]?.count ?? 0;

  const authoredContributions =
    reviewsCount +
    affectedForumPosts +
    forumRepliesCount +
    eventsCount +
    announcementsCount +
    bookmarksCount +
    reviewLikesCount +
    forumPostLikesCount +
    forumReplyLikesCount;

  return {
    ownedListings,
    authoredContributions,
    affectedForumPosts,
    thirdPartyReplies,
  };
}

async function executeAccountDeletion(
  userId: string,
  password: string,
  headers: Headers
): Promise<AccountDeletionResponse> {
  // Step 1: Reauthentication via password check
  let verified = false;
  try {
    const result = await auth.api.verifyPassword({
      headers,
      body: { password },
    });
    if (result.status) {
      verified = true;
    }
  } catch (cause) {
    if (isRequestFailure(cause) && cause.statusCode < 500) {
      throw new HttpError(401, "unauthorized", "Invalid password", undefined, { cause });
    }
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
  }

  if (!verified) {
    throw new HttpError(401, "unauthorized", "Invalid password");
  }

  // Step 2: Revoke all active sessions before destructive work begins
  try {
    await auth.api.revokeSessions({ headers }).catch(() => {});
    await db.delete(session).where(eq(session.userId, userId));
  } catch (cause) {
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
  }

  // Step 3: Delete R2 objects owned by the User and their Businesses
  try {
    const userMediaRows = await db
      .select({ key: mediaObject.key })
      .from(mediaObject)
      .leftJoin(business, eq(mediaObject.businessId, business.id))
      .where(or(eq(mediaObject.ownerId, userId), eq(business.ownerId, userId)));

    await Promise.allSettled(
      userMediaRows.map(async row => {
        try {
          await deleteObject(row.key);
        } catch {
          // Storage deletions are idempotent
        }
      })
    );
  } catch (cause) {
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
  }

  // Step 4: Single-transaction PostgreSQL cascade hard-delete
  const now = new Date();
  try {
    await db.transaction(async tx => {
      await tx.delete(user).where(eq(user.id, userId));
    });
  } catch (cause) {
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
  }

  return {
    status: "account_deleted",
    deletedAt: now,
  };
}

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
  )
  .get(
    "/profile/deletion-preview",
    requireAuth,
    describeRoute({
      operationId: "getAccountDeletionPreview",
      tags: ["users"],
      summary: "Get deletion preview counts for the session user",
      description:
        "Returns the exact counts of resources and authored content that will be destroyed if the User's account is permanently deleted: owned Listings, authored contributions, affected Forum posts, and third-party Replies destroyed when user-started Forum posts are removed.",
      responses: {
        200: {
          description: "Accurate deletion preview counts",
          content: {
            "application/json": { schema: resolver(deletionPreviewSchema) },
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

      let counts: DeletionPreview;
      try {
        counts = await getDeletionPreviewCounts(actor.userId);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause,
        });
      }

      c.header("Cache-Control", "private, no-store");
      return c.json(counts);
    }
  )
  .delete(
    "/profile",
    requireAuth,
    validator("json", accountDeletionSchema, onValidationError),
    describeRoute({
      operationId: "deletePersonalAccount",
      tags: ["users"],
      summary: "Permanently delete the session user's account",
      description:
        "Irrevocably destroys the User's account, personal data, owned Businesses, Listings, Listing photos, and all authored content. Requires reauthentication via password and explicit destructive confirmation ('DELETE'). Revokes all active sessions before deleting R2 media and executing single-transaction PostgreSQL cascade hard-delete.",
      responses: {
        200: {
          description: "Account permanently deleted",
          content: {
            "application/json": { schema: resolver(accountDeletionResponseSchema) },
          },
        },
        400: {
          description: "Invalid request payload or confirmation string",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
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

      const { password } = c.req.valid("json");
      const result = await executeAccountDeletion(actor.userId, password, c.req.raw.headers);

      c.header("Cache-Control", "private, no-store");
      return c.json(result);
    }
  )
  .post(
    "/profile/delete",
    requireAuth,
    validator("json", accountDeletionSchema, onValidationError),
    describeRoute({
      operationId: "deletePersonalAccountPost",
      tags: ["users"],
      summary: "Permanently delete the session user's account (POST alternative)",
      description:
        "Irrevocably destroys the User's account, personal data, owned Businesses, Listings, Listing photos, and all authored content.",
      responses: {
        200: {
          description: "Account permanently deleted",
          content: {
            "application/json": { schema: resolver(accountDeletionResponseSchema) },
          },
        },
        400: {
          description: "Invalid request payload or confirmation string",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
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

      const { password } = c.req.valid("json");
      const result = await executeAccountDeletion(actor.userId, password, c.req.raw.headers);

      c.header("Cache-Control", "private, no-store");
      return c.json(result);
    }
  );
