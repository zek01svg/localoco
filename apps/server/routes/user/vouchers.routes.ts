import {
  getUserVouchersSchema,
  updateVoucherStatusSchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import verifyOwnership from "@server/utils/verify-ownership";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import {
  getUserVouchers,
  getVoucherById,
  updateVoucherStatus,
} from "./user.service";

export const vouchersUserRouter = new Hono()
  /**
   * Get user vouchers
   */
  .post(
    "/vouchers",
    describeRoute({
      summary: "Get user vouchers",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  vouchers: z.array(z.any()),
                  total: z.number(),
                  page: z.number(),
                  limit: z.number(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("json", getUserVouchersSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const id = c.get("session")?.user.id ?? "";
      const result = await getUserVouchers({ ...payload, id });
      return c.json(result, 200);
    }
  )

  /**
   * update the status of the user's voucher/s
   */
  .put(
    "/update-voucher",
    describeRoute({
      summary: "Update voucher status",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", updateVoucherStatusSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const voucher = await getVoucherById(payload.voucherId);

      await verifyOwnership(c, voucher.userId);
      await updateVoucherStatus(payload.voucherId);

      return c.json({ message: "Voucher status updated successfully" }, 200);
    }
  );
