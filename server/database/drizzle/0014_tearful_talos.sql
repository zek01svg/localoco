CREATE TABLE "forum_post_like" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "forum_post_like_user_post_unique" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "forum_reply_like" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reply_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "forum_reply_like_user_reply_unique" UNIQUE("user_id","reply_id")
);
--> statement-breakpoint
CREATE TABLE "review_like" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"review_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "review_like_user_review_unique" UNIQUE("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "forum_post_like" ADD CONSTRAINT "forum_post_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_like" ADD CONSTRAINT "forum_post_like_post_id_forum_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_like" ADD CONSTRAINT "forum_reply_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_like" ADD CONSTRAINT "forum_reply_like_reply_id_forum_reply_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_reply"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_post_like_post_id_idx" ON "forum_post_like" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "forum_post_like_user_id_idx" ON "forum_post_like" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_reply_like_reply_id_idx" ON "forum_reply_like" USING btree ("reply_id");--> statement-breakpoint
CREATE INDEX "forum_reply_like_user_id_idx" ON "forum_reply_like" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_like_review_id_idx" ON "review_like" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_like_user_id_idx" ON "review_like" USING btree ("user_id");