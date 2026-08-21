CREATE TYPE "public"."event_status" AS ENUM('active', 'moderated');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"image_url" varchar(1000),
	"link_url" varchar(1000),
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" "event_status" DEFAULT 'active' NOT NULL,
	"moderation_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "event_time_bounds_check" CHECK ("event"."ends_at" >= "event"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "event_moderation_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"previous_status" "event_status" NOT NULL,
	"next_status" "event_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_moderation_audit" ADD CONSTRAINT "event_moderation_audit_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_moderation_audit" ADD CONSTRAINT "event_moderation_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_business_id_starts_at_idx" ON "event" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "event_user_id_created_at_idx" ON "event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_ends_at_idx" ON "event" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "event_moderation_audit_event_id_idx" ON "event_moderation_audit" USING btree ("event_id");