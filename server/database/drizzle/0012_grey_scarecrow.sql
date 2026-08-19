CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "review_user_business_unique" UNIQUE("user_id","business_id"),
	CONSTRAINT "review_rating_range_check" CHECK ("review"."rating" >= 1 and "review"."rating" <= 5)
);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_business_id_created_at_idx" ON "review" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "review_user_id_created_at_idx" ON "review" USING btree ("user_id","created_at");