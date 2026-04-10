import { HTTPException } from "hono/http-exception";
import { describe, it, expect, vi } from "vitest";

import verifyOwnership from "../../utils/verify-ownership";

describe("verifyOwnership", () => {
  it("should not throw if user is the owner", async () => {
    const mockContext = {
      get: vi.fn().mockReturnValue({ user: { id: "user123" } }),
    } as any;

    await expect(
      verifyOwnership(mockContext, "user123")
    ).resolves.toBeUndefined();
  });

  it("should throw 403 HTTPException if user is not the owner", async () => {
    const mockContext = {
      get: vi.fn().mockReturnValue({ user: { id: "user456" } }),
    } as any;

    await expect(verifyOwnership(mockContext, "user123")).rejects.toThrow(
      HTTPException
    );
    try {
      await verifyOwnership(mockContext, "user123");
    } catch (err: any) {
      expect(err.status).toBe(403);
      expect(err.message).toBe("Unauthorized operation");
    }
  });

  it("should throw 403 if session is missing", async () => {
    const mockContext = {
      get: vi.fn().mockReturnValue(null),
    } as any;

    await expect(verifyOwnership(mockContext, "user123")).rejects.toThrow(
      HTTPException
    );
  });
});
