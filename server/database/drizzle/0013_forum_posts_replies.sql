CREATE TABLE "forum_post" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD CONSTRAINT "forum_reply_post_id_forum_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD CONSTRAINT "forum_reply_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_post_business_id_created_at_idx" ON "forum_post" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_post_user_id_created_at_idx" ON "forum_post" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_reply_post_id_created_at_idx" ON "forum_reply" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_reply_user_id_created_at_idx" ON "forum_reply" USING btree ("user_id","created_at");