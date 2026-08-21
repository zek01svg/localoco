import type { PublicListingDetail } from "#shared/contracts/listings";

import { HOURS_DAY_NAMES } from "#shared/contracts/business-hours";

interface ListingStructuredDataProps {
  listing: PublicListingDetail;
}

interface SchemaOrgOpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
}

export interface SchemaOrgLocalBusiness {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  identifier: string;
  taxID: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    postalCode: string;
    addressCountry: "SG";
    addressLocality: "Singapore";
  };
  description?: string;
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  email?: string;
  url?: string;
  priceRange?: string;
  paymentAccepted?: string;
  openingHoursSpecification?: SchemaOrgOpeningHoursSpecification[];
  image?: string[];
}

export function buildSchemaOrgJsonLd(listing: PublicListingDetail): SchemaOrgLocalBusiness {
  const openingHoursSpecification: SchemaOrgOpeningHoursSpecification[] = listing.hours.map(
    entry => {
      const dayOfWeek = `https://schema.org/${HOURS_DAY_NAMES[entry.day]}`;
      if (entry.is24h) {
        return {
          "@type": "OpeningHoursSpecification",
          dayOfWeek,
          opens: "00:00",
          closes: "23:59",
        };
      }
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: entry.openTime,
        closes: entry.closeTime,
      };
    }
  );

  const schema: SchemaOrgLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.name,
    identifier: listing.uen,
    taxID: listing.uen,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      postalCode: listing.postalCode,
      addressCountry: "SG",
      addressLocality: "Singapore",
    },
  };

  if (listing.description) {
    schema.description = listing.description;
  }

  if (
    Number.isFinite(listing.latitude) &&
    Number.isFinite(listing.longitude) &&
    listing.latitude !== null &&
    listing.longitude !== null
  ) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  if (listing.phone) {
    schema.telephone = listing.phone;
  }

  if (listing.email) {
    schema.email = listing.email;
  }

  if (listing.website) {
    schema.url = listing.website;
  }

  if (listing.priceRange) {
    schema.priceRange = listing.priceRange;
  }

  if (listing.paymentOptions && listing.paymentOptions.length > 0) {
    schema.paymentAccepted = listing.paymentOptions.join(", ");
  }

  if (openingHoursSpecification.length > 0) {
    schema.openingHoursSpecification = openingHoursSpecification;
  }

  if (listing.photos.length > 0) {
    schema.image = listing.photos.map(p => p.url);
  }

  return schema;
}

export function ListingStructuredData({ listing }: ListingStructuredDataProps) {
  const jsonLd = buildSchemaOrgJsonLd(listing);
  const sanitizedJson = JSON.stringify(jsonLd).replaceAll("<", "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: sanitizedJson }} />;
}
