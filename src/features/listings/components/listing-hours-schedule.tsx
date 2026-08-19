import type { BusinessHoursEntry } from "#shared/contracts/business-hours";

import { ClockIcon } from "lucide-react";

import { Badge } from "#client/components/ui/badge";
import { HOURS_DAY_NAMES, isOpenAt, singaporeClock } from "#shared/contracts/business-hours";

interface ListingHoursScheduleProps {
  hours: BusinessHoursEntry[];
}

export function ListingHoursSchedule({ hours }: ListingHoursScheduleProps) {
  const currentSgTime = singaporeClock();
  const currentDay = currentSgTime.day;
  const isCurrentlyOpen = hours.length > 0 && isOpenAt(hours);

  if (hours.length === 0) {
    return (
      <section aria-labelledby="hours-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="hours-heading" className="flex items-center gap-2 text-lg font-semibold">
            <ClockIcon aria-hidden="true" className="text-muted-foreground size-5" />
            Opening Hours
          </h2>
          <Badge variant="outline" className="text-muted-foreground">
            Hours not provided
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          This business has not provided opening hours yet.
        </p>
      </section>
    );
  }

  const hoursMap = new Map(hours.map(e => [e.day, e]));

  return (
    <section aria-labelledby="hours-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="hours-heading" className="flex items-center gap-2 text-lg font-semibold">
          <ClockIcon aria-hidden="true" className="text-muted-foreground size-5" />
          Opening Hours
        </h2>
        <Badge
          variant={isCurrentlyOpen ? "default" : "secondary"}
          className={
            isCurrentlyOpen
              ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
              : "text-muted-foreground"
          }
        >
          {isCurrentlyOpen ? "Open now" : "Closed"}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-lg border text-sm">
        <table className="w-full text-left">
          <caption className="sr-only">Weekly opening hours schedule in Singapore time</caption>
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
              <th scope="col" className="px-4 py-2.5">
                Day
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Hours (SGT)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {HOURS_DAY_NAMES.map((dayName, dayIndex) => {
              const entry = hoursMap.get(dayIndex);
              const isToday = dayIndex === currentDay;

              let hoursText = "Closed";
              if (entry) {
                if (entry.is24h) {
                  hoursText = "Open 24 hours";
                } else {
                  const isOvernight = entry.closeTime < entry.openTime;
                  hoursText = isOvernight
                    ? `${entry.openTime} – ${entry.closeTime} (next day)`
                    : `${entry.openTime} – ${entry.closeTime}`;
                }
              }

              return (
                <tr
                  key={dayName}
                  className={`transition-colors ${
                    isToday ? "bg-primary/5 text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      {dayName}
                      {isToday && (
                        <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-bold">
                          Today
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs sm:text-sm">
                    {hoursText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
