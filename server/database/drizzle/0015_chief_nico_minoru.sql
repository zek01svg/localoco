CREATE TYPE "public"."announcement_status" AS ENUM('active', 'moderated');--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"image_url" varchar(1000),
	"link_url" varchar(1000),
	"starts_at" timestamp,
	"ends_at" timestamp,
	"status" "announcement_status" DEFAULT 'active' NOT NULL,
	"moderation_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "announcement_visibility_dates_check" CHECK ("announcement"."ends_at" is null or "announcement"."starts_at" is null or "announcement"."ends_at" >= "announcement"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "announcement_moderation_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"announcement_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"previous_status" "announcement_status" NOT NULL,
	"next_status" "announcement_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_moderation_audit" ADD CONSTRAINT "announcement_moderation_audit_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_moderation_audit" ADD CONSTRAINT "announcement_moderation_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_business_id_created_at_idx" ON "announcement" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "announcement_user_id_created_at_idx" ON "announcement" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "announcement_status_idx" ON "announcement" USING btree ("status");--> statement-breakpoint
CREATE INDEX "announcement_moderation_audit_announcement_id_idx" ON "announcement_moderation_audit" USING btree ("announcement_id");