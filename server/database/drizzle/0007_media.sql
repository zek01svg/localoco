CREATE TABLE "media_object" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"owner_id" text NOT NULL,
	"business_id" text NOT NULL,
	"purpose" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "media_object_key_unique" UNIQUE("key"),
	CONSTRAINT "media_object_status_check" CHECK ("media_object"."status" in ('pending', 'active')),
	CONSTRAINT "media_object_purpose_check" CHECK ("media_object"."purpose" in ('listing_photo'))
);
--> statement-breakpoint
ALTER TABLE "media_object" ADD CONSTRAINT "media_object_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_object" ADD CONSTRAINT "media_object_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_object_business_id_idx" ON "media_object" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "media_object_owner_id_idx" ON "media_object" USING btree ("owner_id");