CREATE TABLE "email_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"from_address" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"error_classification" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"delivered_at" timestamp,
	"failed_at" timestamp
);
