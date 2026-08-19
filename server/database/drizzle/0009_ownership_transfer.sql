CREATE TABLE "business_ownership_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"previous_owner_id" text NOT NULL,
	"next_owner_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_ownership_audit" ADD CONSTRAINT "business_ownership_audit_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership_audit" ADD CONSTRAINT "business_ownership_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership_audit" ADD CONSTRAINT "business_ownership_audit_previous_owner_id_user_id_fk" FOREIGN KEY ("previous_owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_ownership_audit" ADD CONSTRAINT "business_ownership_audit_next_owner_id_user_id_fk" FOREIGN KEY ("next_owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;