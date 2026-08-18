import type { BusinessHoursEntry } from "#shared/contracts/business-hours";

import { Checkbox } from "#client/components/ui/checkbox";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { overlappingHours } from "#shared/contracts/business-hours";

// The Listing fields both pages edit, defined once. Bounds mirror the server
// contract so the API never rejects what the form allows. The explicit
// element type keeps property access over the entries type-safe.
type ListingFieldName =
  | "name"
  | "category"
  | "address"
  | "postalCode"
  | "phone"
  | "email"
  | "website"
  | "priceRange";

interface ListingFieldDef {
  name: ListingFieldName;
  label: string;
  type: "text" | "email" | "url" | "tel";
  maxLength: number;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
}

export const LISTING_FIELD_DEFS: ListingFieldDef[] = [
  { name: "name", label: "Business name", type: "text", maxLength: 200, required: true },
  {
    name: "category",
    label: "Category",
    type: "text",
    maxLength: 100,
    required: true,
    placeholder: "e.g. Food & Beverage",
  },
  { name: "address", label: "Address", type: "text", maxLength: 500, required: true },
  { name: "postalCode", label: "Postal code", type: "text", maxLength: 12, required: true },
  { name: "phone", label: "Phone", type: "tel", maxLength: 32, optional: true },
  { name: "email", label: "Email", type: "email", maxLength: 254, optional: true },
  { name: "website", label: "Website", type: "url", maxLength: 500, optional: true },
  {
    name: "priceRange",
    label: "Price range",
    type: "text",
    maxLength: 32,
    optional: true,
    placeholder: "e.g. $10–$30",
  },
];

// Opening hours are edited as a fixed grid of seven day rows (day 0 = Monday).
// A 24-hour day carries no times; a closed day carries no times either and is
// omitted from the payload. Times are "HH:MM" strings, as on the wire.
export interface HoursRow {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  is24h: boolean;
  openTime: string;
  closeTime: string;
}

export const HOURS_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const ALL_DAYS: readonly HoursRow["day"][] = [0, 1, 2, 3, 4, 5, 6];

export function emptyHoursRows(): HoursRow[] {
  return ALL_DAYS.map(day => ({ day, is24h: false, openTime: "", closeTime: "" }));
}

// The raw form state for the shared Listing fields, as the user edits it.
// `hours` is the fixed seven-day grid: closed days have empty times.
export interface ListingFormValues {
  name: string;
  category: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  priceRange: string;
  paymentOptions: string[];
  hours: HoursRow[];
}

export const emptyListingValues: ListingFormValues = {
  name: "",
  category: "",
  address: "",
  postalCode: "",
  phone: "",
  email: "",
  website: "",
  priceRange: "",
  paymentOptions: [],
  hours: emptyHoursRows(),
};

// Converts form values into the API payload. Empty optional fields become
// null, which the server stores as SQL NULL (and an edit then clears them).
export function listingPayload(values: ListingFormValues): {
  name: string;
  category: string;
  address: string;
  postalCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  paymentOptions: string[] | null;
  priceRange: string | null;
  hours: BusinessHoursEntry[];
} {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    address: values.address.trim(),
    postalCode: values.postalCode.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    website: values.website.trim() || null,
    paymentOptions: values.paymentOptions.length > 0 ? values.paymentOptions : null,
    priceRange: values.priceRange.trim() || null,
    hours: hoursPayload(values.hours),
  };
}

// Opening hours grid helpers -------------------------------------------------

// Maps a stored schedule onto the grid; days without an entry stay closed.
export function hoursRowsFromEntries(entries: BusinessHoursEntry[]): HoursRow[] {
  return ALL_DAYS.map(day => {
    const entry = entries.find(e => e.day === day);
    if (entry === undefined) {
      return { day, is24h: false, openTime: "", closeTime: "" };
    }
    return entry.is24h
      ? { day, is24h: true, openTime: "", closeTime: "" }
      : { day, is24h: false, openTime: entry.openTime, closeTime: entry.closeTime };
  });
}

// Grid -> wire schedule: closed days (no times) are dropped.
export function hoursPayload(rows: HoursRow[]): BusinessHoursEntry[] {
  const entries: BusinessHoursEntry[] = [];
  for (const row of rows) {
    if (row.is24h) {
      entries.push({ day: row.day, is24h: true });
    } else if (row.openTime !== "" && row.closeTime !== "") {
      entries.push({
        day: row.day,
        is24h: false,
        openTime: row.openTime,
        closeTime: row.closeTime,
      });
    }
  }
  return entries;
}

// The first problem in the grid, as a message for the section; the server
// re-checks the same rules at the boundary and in the database.
export function hoursError(rows: HoursRow[]): string | undefined {
  for (const row of rows) {
    if (row.is24h) {
      continue;
    }
    const hasOpen = row.openTime !== "";
    const hasClose = row.closeTime !== "";
    if (hasOpen !== hasClose) {
      return `${HOURS_DAY_NAMES[row.day]}: enter both an opening and closing time`;
    }
    if (hasOpen && row.openTime === row.closeTime) {
      return `${HOURS_DAY_NAMES[row.day]}: opening and closing times must differ`;
    }
  }
  const entries = hoursPayload(rows);
  for (let i = 0; i < entries.length; i += 1) {
    const earlier = entries[i];
    const later = entries[(i + 1) % entries.length];
    if ((earlier.day + 1) % 7 === later.day && overlappingHours(earlier, later)) {
      return `${HOURS_DAY_NAMES[later.day]}: opening hours overlap the previous day`;
    }
  }
  return undefined;
}

export function HoursSection({
  value,
  onChange,
  disabled,
}: {
  value: HoursRow[];
  onChange: (rows: HoursRow[]) => void;
  disabled?: boolean;
}) {
  const error = hoursError(value);
  const updateRow = (day: HoursRow["day"], patch: Partial<Omit<HoursRow, "day">>) => {
    onChange(value.map(row => (row.day === day ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Opening hours</span>
        <span className="text-muted-foreground text-xs">Singapore time</span>
      </div>
      <div className="space-y-1">
        {value.map(row => (
          <div
            key={row.day}
            className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2"
          >
            <span className="w-24 text-sm">{HOURS_DAY_NAMES[row.day]}</span>
            <label
              htmlFor={`hours-${row.day}`}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <Checkbox
                id={`hours-${row.day}`}
                checked={row.is24h}
                disabled={disabled}
                onCheckedChange={checked => {
                  updateRow(row.day, {
                    is24h: checked === true,
                    openTime: checked === true ? "" : row.openTime,
                    closeTime: checked === true ? "" : row.closeTime,
                  });
                }}
              />
              24 hours
            </label>
            {row.is24h ? null : (
              <span className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`${HOURS_DAY_NAMES[row.day]} opening time`}
                  className="w-32"
                  value={row.openTime}
                  disabled={disabled}
                  onChange={e => {
                    updateRow(row.day, { openTime: e.target.value });
                  }}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="time"
                  aria-label={`${HOURS_DAY_NAMES[row.day]} closing time`}
                  className="w-32"
                  value={row.closeTime}
                  disabled={disabled}
                  onChange={e => {
                    updateRow(row.day, { closeTime: e.target.value });
                  }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

interface ListingFieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "url" | "tel";
  placeholder?: string;
  optional?: boolean;
  maxLength: number;
  disabled?: boolean;
  error?: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export function ListingField({
  id,
  label,
  type,
  placeholder,
  optional,
  maxLength,
  disabled,
  error,
  value,
  onBlur,
  onChange,
}: ListingFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {optional ? <span className="text-muted-foreground text-xs">Optional</span> : null}
      </div>
      <Input
        id={id}
        name={id}
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onChange={e => {
          onChange(e.target.value);
        }}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

const PAYMENT_OPTIONS = [
  "Cash",
  "PayNow",
  "NETS",
  "Visa",
  "Mastercard",
  "Amex",
  "GrabPay",
  "ShopeePay",
] as const;

export function PaymentOptionsField({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Payment options</span>
        <span className="text-muted-foreground text-xs">Optional</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_OPTIONS.map(option => {
          const checked = value.includes(option);
          return (
            <label
              key={option}
              className="border-border hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => {
                  onChange(checked ? value.filter(o => o !== option) : [...value, option]);
                }}
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}
