import type { PublicListingDetail } from "#shared/contracts/listings";

import {
  CreditCardIcon,
  DollarSignIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { Badge } from "#client/components/ui/badge";

interface ListingContactInfoProps {
  listing: PublicListingDetail;
}

function formatExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (/^(?:javascript|data|vbscript):/iu.test(trimmed)) {
    return null;
  }
  return /^https?:\/\//iu.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ListingContactInfo({ listing }: ListingContactInfoProps) {
  const hasContacts = Boolean(listing.phone ?? listing.email ?? listing.website);
  const safeWebsiteUrl = listing.website ? formatExternalUrl(listing.website) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Location & Address Section */}
      <section aria-labelledby="location-heading" className="flex flex-col gap-3">
        <h2 id="location-heading" className="flex items-center gap-2 text-lg font-semibold">
          <MapPinIcon aria-hidden="true" className="text-muted-foreground size-5" />
          Location & Address
        </h2>
        <address className="text-muted-foreground text-sm not-italic">
          <p className="text-foreground font-medium">{listing.address}</p>
          <p>Singapore {listing.postalCode}</p>
        </address>
      </section>

      {/* Contact Options Section */}
      <section aria-labelledby="contact-heading" className="flex flex-col gap-3">
        <h2 id="contact-heading" className="flex items-center gap-2 text-lg font-semibold">
          <PhoneIcon aria-hidden="true" className="text-muted-foreground size-5" />
          Contact & Online
        </h2>
        {hasContacts ? (
          <ul className="flex flex-col gap-2.5 text-sm">
            {listing.phone && (
              <li className="flex items-center gap-2.5">
                <PhoneIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                <a
                  href={`tel:${listing.phone.replaceAll(/\s+/gu, "")}`}
                  className="text-primary font-medium hover:underline"
                  aria-label={`Call ${listing.name} at ${listing.phone}`}
                >
                  {listing.phone}
                </a>
              </li>
            )}
            {listing.email && (
              <li className="flex items-center gap-2.5">
                <MailIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                <a
                  href={`mailto:${listing.email}`}
                  className="text-primary font-medium break-all hover:underline"
                  aria-label={`Email ${listing.name} at ${listing.email}`}
                >
                  {listing.email}
                </a>
              </li>
            )}
            {safeWebsiteUrl && (
              <li className="flex items-center gap-2.5">
                <GlobeIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                <a
                  href={safeWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium break-all hover:underline"
                  aria-label={`Visit official website for ${listing.name} (opens in new tab)`}
                >
                  {listing.website}
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No contact information provided yet.</p>
        )}
      </section>

      {/* Payment Options Section */}
      {listing.paymentOptions && listing.paymentOptions.length > 0 && (
        <section aria-labelledby="payment-heading" className="flex flex-col gap-3">
          <h2 id="payment-heading" className="flex items-center gap-2 text-lg font-semibold">
            <CreditCardIcon aria-hidden="true" className="text-muted-foreground size-5" />
            Accepted Payments
          </h2>
          <div className="flex flex-wrap gap-2">
            {listing.paymentOptions.map(option => (
              <Badge key={option} variant="secondary" className="px-2.5 py-1 text-xs">
                {option}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Price Range Section */}
      {listing.priceRange && (
        <section aria-labelledby="price-heading" className="flex flex-col gap-2">
          <h2 id="price-heading" className="flex items-center gap-2 text-lg font-semibold">
            <DollarSignIcon aria-hidden="true" className="text-muted-foreground size-5" />
            Price Range
          </h2>
          <p className="text-foreground text-sm font-medium">{listing.priceRange}</p>
        </section>
      )}
    </div>
  );
}
