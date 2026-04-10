import type { AppVariables } from "@server/lib/types";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Verifies if the currently authenticated user matches the provided owner ID.
 * This security helper retrieves the user session from the Hono context (populated by protectRoute)
 * and compares the current user's ID against the target business owner's ID to
 * ensure authorized access.
 * @param c - The Hono context object containing the request headers.
 * @param ownerId - The unique identifier of the legitimate business owner to verify against.
 * @throws {HTTPException} Throws a 403 error if the current user is not the owner of the business.
 */
export default async function verifyOwnership(
  c: Context<{ Variables: AppVariables }>,
  ownerId: string
) {
  const session = c.get("session");
  const currentUserId = session?.user.id;
  const isOwner = currentUserId === ownerId;

  if (!isOwner) {
    throw new HTTPException(403, {
      message: "Unauthorized operation",
    });
  }
}
