import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const emailDelivery = pgTable("email_delivery", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  fromAddress: text("from_address").notNull(),
  status: text("status")
    .notNull()
    .$type<"pending" | "processing" | "delivered" | "failed" | "retryable">()
    .default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  errorClassification: text("error_classification").$type<"retryable" | "terminal">(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
});

export type EmailDelivery = typeof emailDelivery.$inferSelect;
export type NewEmailDelivery = typeof emailDelivery.$inferInsert;
