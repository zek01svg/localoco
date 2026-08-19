CREATE TABLE "business_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"day" smallint NOT NULL,
	"is_24h" boolean DEFAULT false NOT NULL,
	"open_minute" smallint,
	"close_minute" smallint,
	CONSTRAINT "business_hours_day_range_check" CHECK ("business_hours"."day" between 0 and 6),
	CONSTRAINT "business_hours_minute_range_check" CHECK (("business_hours"."open_minute" is null or "business_hours"."open_minute" between 0 and 1439) and ("business_hours"."close_minute" is null or "business_hours"."close_minute" between 0 and 1439)),
	CONSTRAINT "business_hours_shape_check" CHECK (("business_hours"."is_24h" and "business_hours"."open_minute" is null and "business_hours"."close_minute" is null)
        or (not "business_hours"."is_24h" and "business_hours"."open_minute" is not null and "business_hours"."close_minute" is not null and "business_hours"."open_minute" <> "business_hours"."close_minute"))
);
--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_business_day_unique" ON "business_hours" USING btree ("business_id","day");--> statement-breakpoint
-- PRS-180: the overlap rule cannot be a CHECK constraint (it reads the
-- adjacent-day rows of the same Business), so it lives in a trigger like the
-- listing payment-options element-length check. Mirrors overlappingHours in
-- shared/contracts/business-hours.ts: an overnight row (close < open) spills
-- [0, close) into the next calendar day and must not reach into the next
-- day's own coverage (which starts at its open_minute); a 24-hour row covers
-- exactly its own day, so it has no spill but rejects any spill arriving
-- from the previous day. A later overnight row's morning [0, close) belongs
-- to the day after it, so it is not a collision surface here.
CREATE OR REPLACE FUNCTION "business_hours_overlap_check"() RETURNS trigger AS $$
DECLARE
  prev RECORD;
  next RECORD;
BEGIN
  SELECT is_24h, open_minute, close_minute INTO prev
  FROM business_hours WHERE business_id = NEW.business_id AND day = ((NEW.day + 6) % 7);
  IF FOUND AND NOT prev.is_24h AND prev.close_minute IS NOT NULL
     AND prev.close_minute < prev.open_minute AND prev.close_minute > 0 THEN
    IF NEW.is_24h OR prev.close_minute > NEW.open_minute THEN
      RAISE EXCEPTION 'business_hours_overlap_check: opening hours overlap the previous day';
    END IF;
  END IF;

  SELECT is_24h, open_minute, close_minute INTO next
  FROM business_hours WHERE business_id = NEW.business_id AND day = ((NEW.day + 1) % 7);
  IF FOUND AND NOT NEW.is_24h AND NEW.close_minute IS NOT NULL
     AND NEW.close_minute < NEW.open_minute AND NEW.close_minute > 0 THEN
    IF next.is_24h OR NEW.close_minute > next.open_minute THEN
      RAISE EXCEPTION 'business_hours_overlap_check: opening hours overlap the next day';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "business_hours_overlap_check" BEFORE INSERT OR UPDATE OF is_24h, open_minute, close_minute, day, business_id ON "business_hours" FOR EACH ROW EXECUTE FUNCTION "business_hours_overlap_check"();