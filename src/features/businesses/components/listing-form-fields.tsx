import { Checkbox } from "#client/components/ui/checkbox";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";

// The Listing fields both pages edit, defined once. Bounds mirror the server
// contract so the API never rejects what the form allows.
export const LISTING_FIELD_DEFS = [
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
] as const;

export type ListingFieldName = (typeof LISTING_FIELD_DEFS)[number]["name"];

// The raw form state for the shared Listing fields, as the user edits it.
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
  };
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
