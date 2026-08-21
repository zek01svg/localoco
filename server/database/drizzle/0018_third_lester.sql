ALTER TABLE "account" ADD COLUMN "issuer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_issuer_account_id_unique" UNIQUE("issuer","account_id");