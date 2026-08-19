CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "listing_moderation_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"previous_status" "listing_status" NOT NULL,
	"next_status" "listing_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" DROP CONSTRAINT "listing_status_check";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."listing_status";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "status" SET DATA TYPE "public"."listing_status" USING "status"::"public"."listing_status";--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "listing_moderation_audit" ADD CONSTRAINT "listing_moderation_audit_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_moderation_audit" ADD CONSTRAINT "listing_moderation_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_moderation_audit_listing_id_idx" ON "listing_moderation_audit" USING btree ("listing_id");