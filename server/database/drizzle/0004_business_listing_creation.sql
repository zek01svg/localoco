-- PRS-178 (user-confirmed): existing listing rows predate the business_id
-- requirement and belong to no Business; they are deleted rather than orphaned.
DELETE FROM "listing";--> statement-breakpoint
UPDATE "business" SET "uen" = upper(btrim("uen"));--> statement-breakpoint
ALTER TABLE "business" ALTER COLUMN "uen" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "name" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "category" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "address" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "postal_code" SET DATA TYPE varchar(12);--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "business_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "email" varchar(254);--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "payment_options" text[];--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "price_range" varchar(32);--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_uen_unique" UNIQUE("uen");--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_business_id_unique" UNIQUE("business_id");--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_status_check" CHECK ("listing"."status" in ('draft', 'published'));--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_payment_options_cardinality_check" CHECK (array_length("listing"."payment_options", 1) is null or array_length("listing"."payment_options", 1) <= 8);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "listing_payment_options_element_length_check"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW."payment_options") AS p WHERE length(p) > 32) THEN
    RAISE EXCEPTION 'listing_payment_options_element_length_check: payment option exceeds 32 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "listing_payment_options_element_length_check" BEFORE INSERT OR UPDATE OF "payment_options" ON "listing" FOR EACH ROW EXECUTE FUNCTION "listing_payment_options_element_length_check"();
