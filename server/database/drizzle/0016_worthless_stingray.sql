CREATE TABLE "forum_moderation_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"reason" text NOT NULL,
	"original_title" varchar(200),
	"original_body" text NOT NULL,
	"original_author_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_post" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "forum_moderation_audit" ADD CONSTRAINT "forum_moderation_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_moderation_audit" ADD CONSTRAINT "forum_moderation_audit_original_author_id_user_id_fk" FOREIGN KEY ("original_author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_moderation_audit_target_idx" ON "forum_moderation_audit" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "forum_moderation_audit_actor_idx" ON "forum_moderation_audit" USING btree ("actor_id");