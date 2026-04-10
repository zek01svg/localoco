import * as Sentry from "@sentry/node";
import { HTTPException } from "hono/http-exception";
import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod/v4";

import auth from "../../lib/auth";
import errorHandler from "../../middleware/error-handler";
import protectRoute from "../../middleware/protect-route";

// Mock dependencies
vi.mock("@server/lib/pino", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  default: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

describe("Middleware Tests", () => {
  describe("ErrorHandler Middleware", () => {
    it("should handle HTTPException and return its response", async () => {
      const mockContext = {
        req: { path: "/test", method: "GET" },
      } as any;
      const err = new HTTPException(401, { message: "Unauthorized" });

      const response = await errorHandler(err, mockContext);
      expect(response.status).toBe(401);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it("should handle ZodError and return 400", async () => {
      const mockContext = {
        req: { path: "/test", method: "GET" },
        json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      } as any;
      const err = new ZodError([]);

      const response: any = await errorHandler(err, mockContext);
      expect(response.status).toBe(400);
      expect(response.data.error).toBe("ValidationError");
    });

    it("should handle generic Error and return 500", async () => {
      const mockContext = {
        req: { path: "/test", method: "GET" },
        json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      } as any;
      const err = new Error("Something went wrong");

      const response: any = await errorHandler(err, mockContext);
      expect(response.status).toBe(500);
      expect(response.data.error).toBe("InternalServerError");
    });
  });

  describe("ProtectRoute Middleware", () => {
    it("should call next() if session exists", async () => {
      const mockContext = {
        req: { raw: { headers: {} } },
        set: vi.fn(),
      } as any;
      const next = vi.fn();
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "1" },
      } as any);

      await protectRoute(mockContext, next);
      expect(mockContext.set).toHaveBeenCalledWith(
        "session",
        expect.anything()
      );
      expect(next).toHaveBeenCalled();
    });

    it("should throw 401 if session is missing", async () => {
      const mockContext = {
        req: { raw: { headers: {} } },
      } as any;
      const next = vi.fn();
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(protectRoute(mockContext, next)).rejects.toThrow(
        HTTPException
      );
      await expect(protectRoute(mockContext, next)).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
