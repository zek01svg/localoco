import { z } from "zod/v4";

// Opening hours are per Business, one entry per day (0 = Monday .. 6 =
// Sunday). Times are "HH:MM" strings on the wire, converted to minutes since
// midnight at the server boundary and stored timezone-free in PostgreSQL.
// Storage stays UTC / timezone-free; Singapore time is applied only when
// evaluating or presenting.

// A 24-hour day is explicit: `is24h: true` and no times. The 00:00-23:59
// interval would be subtly wrong (uncovered last minute) and indistinguishable
// from an ordinary interval.
export const hourMinuteField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, {
  message: "Time must be in HH:MM format",
});

export const businessHoursEntrySchema = z.discriminatedUnion("is24h", [
  z.object({
    day: z.number().int().min(0).max(6),
    is24h: z.literal(true),
  }),
  z
    .object({
      day: z.number().int().min(0).max(6),
      is24h: z.literal(false),
      openTime: hourMinuteField,
      closeTime: hourMinuteField,
    })
    .refine(entry => entry.openTime !== entry.closeTime, {
      message: "Opening and closing times must differ",
    }),
]);
export type BusinessHoursEntry = z.infer<typeof businessHoursEntrySchema>;

// "HH:MM" -> minutes since midnight. Input is pre-validated by the schema.
export function hourMinuteToMinutes(hhmm: string): number {
  const hours = Number(hhmm.slice(0, 2));
  const minutes = Number(hhmm.slice(3, 5));
  return hours * 60 + minutes;
}

// minutes since midnight -> "HH:MM".
export function minutesToHourMinute(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const rest = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${rest}`;
}

// True when the earlier day's interval spills past midnight into the later
// day's coverage. An overnight interval (close < open) covers
// [open, 1440) of its own day plus [0, close) of the next; a 24-hour day
// covers exactly its own calendar day. The later day's own coverage is what
// the spill can collide with: [0, open) of an overnight later day belongs to
// the day AFTER it, so it is not a collision surface here. This predicate is
// the single JS statement of the overlap rule, shared by the schedule schema
// (server boundary) and the owner's editor (client validation); the
// PostgreSQL trigger in migration 0005 enforces the same rule in the
// database.
export function overlappingHours(earlier: BusinessHoursEntry, later: BusinessHoursEntry): boolean {
  if (earlier.is24h) return false;
  const spillClose = hourMinuteToMinutes(earlier.closeTime);
  if (spillClose >= hourMinuteToMinutes(earlier.openTime)) return false;
  if (later.is24h) return true;
  return spillClose > hourMinuteToMinutes(later.openTime);
}

export const businessHoursScheduleSchema = z
  .array(businessHoursEntrySchema)
  .superRefine((entries, ctx) => {
    const days = new Set(entries.map(entry => entry.day));
    if (days.size !== entries.length) {
      ctx.addIssue({ code: "custom", message: "Each day can appear only once" });
      return;
    }
    const sorted = [...entries].toSorted((a, b) => a.day - b.day);
    for (let i = 0; i < sorted.length; i += 1) {
      const earlier = sorted[i];
      const later = sorted[(i + 1) % sorted.length];
      if ((earlier.day + 1) % 7 === later.day && overlappingHours(earlier, later)) {
        ctx.addIssue({
          code: "custom",
          message: "Opening hours overlap across adjacent days",
        });
        return;
      }
    }
  });
export type BusinessHoursSchedule = z.infer<typeof businessHoursScheduleSchema>;
