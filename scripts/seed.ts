import type { Database } from "#server/lib/db";

import {
  announcement,
  bookmark,
  business,
  businessHours,
  event,
  forumPost,
  forumPostLike,
  forumReply,
  forumReplyLike,
  listing,
  review,
  reviewLike,
  user,
} from "#server/database";
import { db as defaultDb } from "#server/lib/db";

/**
 * 6 Synthetic Seed Personas.
 * Fictional identities with public profile data and ZERO Better Auth password,
 * OAuth account, or session rows. All emails use RFC-reserved non-routable domains.
 */
export const SEED_USERS: (typeof user.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    name: "Tan Wei Ming",
    email: "tan.weiming@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-10T08:00:00.000Z"),
    updatedAt: new Date("2026-01-10T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    name: "Aisha binti Rahman",
    email: "aisha.rahman@example.org",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-12T09:30:00.000Z"),
    updatedAt: new Date("2026-01-12T09:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    name: "Priya Sundaram",
    email: "priya.sundaram@example.net",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-15T11:00:00.000Z"),
    updatedAt: new Date("2026-01-15T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    name: "Marcus Lim",
    email: "marcus.lim@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-18T14:15:00.000Z"),
    updatedAt: new Date("2026-01-18T14:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    name: "Nurul Huda",
    email: "nurul.huda@example.org",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-20T16:45:00.000Z"),
    updatedAt: new Date("2026-01-20T16:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a000-000000000006",
    name: "David Chen",
    email: "david.chen@example.net",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-22T10:20:00.000Z"),
    updatedAt: new Date("2026-01-22T10:20:00.000Z"),
  },
];

/**
 * 6 Fictional Distributed Businesses across Singapore.
 */
export const SEED_BUSINESSES: (typeof business.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-b000-000000000001",
    uen: "T20LL1001A",
    ownerId: "00000000-0000-4000-a000-000000000001",
    createdAt: new Date("2026-01-25T08:00:00.000Z"),
    updatedAt: new Date("2026-01-25T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b000-000000000002",
    uen: "201810022B",
    ownerId: "00000000-0000-4000-a000-000000000002",
    createdAt: new Date("2026-01-26T09:00:00.000Z"),
    updatedAt: new Date("2026-01-26T09:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b000-000000000003",
    uen: "53123456C",
    ownerId: "00000000-0000-4000-a000-000000000003",
    createdAt: new Date("2026-01-27T10:00:00.000Z"),
    updatedAt: new Date("2026-01-27T10:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b000-000000000004",
    uen: "202010044D",
    ownerId: "00000000-0000-4000-a000-000000000004",
    createdAt: new Date("2026-01-28T11:00:00.000Z"),
    updatedAt: new Date("2026-01-28T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b000-000000000005",
    uen: "201910055E",
    ownerId: "00000000-0000-4000-a000-000000000005",
    createdAt: new Date("2026-01-29T12:00:00.000Z"),
    updatedAt: new Date("2026-01-29T12:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b000-000000000006",
    uen: "T19LL1006F",
    ownerId: "00000000-0000-4000-a000-000000000006",
    createdAt: new Date("2026-01-30T13:00:00.000Z"),
    updatedAt: new Date("2026-01-30T13:00:00.000Z"),
  },
];

/**
 * 6 Published Listings corresponding to the seeded Businesses.
 */
export const SEED_LISTINGS: (typeof listing.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-c000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000001",
    status: "published",
    rejectionReason: null,
    name: "Kopi & Toast Heritage",
    category: "Food & Beverage",
    address: "100 Orchard Road #02-15",
    postalCode: "238840",
    latitude: 1.3018,
    longitude: 103.8398,
    phone: "+65 6555 0101",
    description:
      "Traditional Nanyang coffee roasted with butter and sugar, serving authentic crispy kaya toast and soft-boiled eggs since 1978.",
    email: "contact@kopiheritage.example.com",
    website: "https://kopiheritage.example.com",
    paymentOptions: ["PayNow", "Cash", "Visa", "Mastercard"],
    priceRange: "$",
    createdAt: new Date("2026-01-25T08:30:00.000Z"),
    updatedAt: new Date("2026-01-25T08:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-c000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000002",
    status: "published",
    rejectionReason: null,
    name: "Boon Tat Bookshop",
    category: "Retail",
    address: "45 Joo Chiat Road",
    postalCode: "427367",
    latitude: 1.3125,
    longitude: 103.9022,
    phone: "+65 6555 0102",
    description:
      "Independent neighbourhood bookstore curated with local Singaporean literature, art monographs, architectural studies, and Southeast Asian history.",
    email: "hello@boontatbooks.example.org",
    website: "https://boontatbooks.example.org",
    paymentOptions: ["PayNow", "Visa", "Mastercard", "Nets"],
    priceRange: "$$",
    createdAt: new Date("2026-01-26T09:30:00.000Z"),
    updatedAt: new Date("2026-01-26T09:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-c000-000000000003",
    businessId: "00000000-0000-4000-b000-000000000003",
    status: "published",
    rejectionReason: null,
    name: "Tampines Cycle Hub",
    category: "Services",
    address: "8 Tampines Central 1",
    postalCode: "529543",
    latitude: 1.3532,
    longitude: 103.9452,
    phone: "+65 6555 0103",
    description:
      "Full-service bicycle workshop, custom wheel builds, gear tuning, and premium commuter accessories serving East-side riders.",
    email: "support@tampinescycle.example.net",
    website: "https://tampinescycle.example.net",
    paymentOptions: ["PayNow", "Cash", "GrabPay"],
    priceRange: "$$",
    createdAt: new Date("2026-01-27T10:30:00.000Z"),
    updatedAt: new Date("2026-01-27T10:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-c000-000000000004",
    businessId: "00000000-0000-4000-b000-000000000004",
    status: "published",
    rejectionReason: null,
    name: "Dragon Pottery Studio",
    category: "Arts & Culture",
    address: "2 Lorong Tembusu",
    postalCode: "439818",
    latitude: 1.3038,
    longitude: 103.8967,
    phone: "+65 6555 0104",
    description:
      "Wheel-throwing workshops, ceramic glaze chemistry courses, and artisanal handmade stoneware pottery in a heritage shophouse setting.",
    email: "workshop@dragonpottery.example.com",
    website: "https://dragonpottery.example.com",
    paymentOptions: ["PayNow", "Visa", "Mastercard"],
    priceRange: "$$$",
    createdAt: new Date("2026-01-28T11:30:00.000Z"),
    updatedAt: new Date("2026-01-28T11:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-c000-000000000005",
    businessId: "00000000-0000-4000-b000-000000000005",
    status: "published",
    rejectionReason: null,
    name: "Zenith Strength & Fitness",
    category: "Fitness & Wellness",
    address: "12 Marina Boulevard #01-08",
    postalCode: "018982",
    latitude: 1.2801,
    longitude: 103.8536,
    phone: "+65 6555 0105",
    description:
      "Boutique functional fitness and strength conditioning facility offering 24/7 access, Olympic lifting platforms, and small-group coaching in the downtown core.",
    email: "info@zenithstrength.example.org",
    website: "https://zenithstrength.example.org",
    paymentOptions: ["PayNow", "Visa", "Mastercard", "Amex"],
    priceRange: "$$$",
    createdAt: new Date("2026-01-29T12:30:00.000Z"),
    updatedAt: new Date("2026-01-29T12:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-c000-000000000006",
    businessId: "00000000-0000-4000-b000-000000000006",
    status: "published",
    rejectionReason: null,
    name: "Little India Spice Traders",
    category: "Food & Beverage",
    address: "68 Serangoon Road",
    postalCode: "217973",
    latitude: 1.3072,
    longitude: 103.8519,
    phone: "+65 6555 0106",
    description:
      "Heritage spice merchant blending freshly roasted masalas, whole spices, heirloom lentils, specialty basmati rice, and traditional pantry staples.",
    email: "orders@indiaspices.example.net",
    website: "https://indiaspices.example.net",
    paymentOptions: ["PayNow", "Cash", "Nets"],
    priceRange: "$",
    createdAt: new Date("2026-01-30T13:30:00.000Z"),
    updatedAt: new Date("2026-01-30T13:30:00.000Z"),
  },
];

/**
 * Opening hours across 7 days for the 6 businesses.
 * Day 0 = Monday .. Day 6 = Sunday.
 */
export const SEED_BUSINESS_HOURS: (typeof businessHours.$inferInsert)[] = [
  // Biz 1: Kopi & Toast Heritage (Mon-Fri 07:00-19:00, Sat-Sun 08:00-18:00)
  {
    id: "00000000-0000-4000-d000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 0,
    is24h: false,
    openMinute: 420,
    closeMinute: 1140,
  },
  {
    id: "00000000-0000-4000-d000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 1,
    is24h: false,
    openMinute: 420,
    closeMinute: 1140,
  },
  {
    id: "00000000-0000-4000-d000-000000000003",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 2,
    is24h: false,
    openMinute: 420,
    closeMinute: 1140,
  },
  {
    id: "00000000-0000-4000-d000-000000000004",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 3,
    is24h: false,
    openMinute: 420,
    closeMinute: 1140,
  },
  {
    id: "00000000-0000-4000-d000-000000000005",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 4,
    is24h: false,
    openMinute: 420,
    closeMinute: 1140,
  },
  {
    id: "00000000-0000-4000-d000-000000000006",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 5,
    is24h: false,
    openMinute: 480,
    closeMinute: 1080,
  },
  {
    id: "00000000-0000-4000-d000-000000000007",
    businessId: "00000000-0000-4000-b000-000000000001",
    day: 6,
    is24h: false,
    openMinute: 480,
    closeMinute: 1080,
  },

  // Biz 2: Boon Tat Bookshop (Tue-Sun 10:00-20:00, Mon closed)
  {
    id: "00000000-0000-4000-d000-000000000008",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 1,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },
  {
    id: "00000000-0000-4000-d000-000000000009",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 2,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },
  {
    id: "00000000-0000-4000-d000-000000000010",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 3,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },
  {
    id: "00000000-0000-4000-d000-000000000011",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 4,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },
  {
    id: "00000000-0000-4000-d000-000000000012",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 5,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },
  {
    id: "00000000-0000-4000-d000-000000000013",
    businessId: "00000000-0000-4000-b000-000000000002",
    day: 6,
    is24h: false,
    openMinute: 600,
    closeMinute: 1200,
  },

  // Biz 3: Tampines Cycle Hub (Mon-Sat 10:30-19:30, Sun 11:00-17:00)
  {
    id: "00000000-0000-4000-d000-000000000014",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 0,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000015",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 1,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000016",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 2,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000017",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 3,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000018",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 4,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000019",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 5,
    is24h: false,
    openMinute: 630,
    closeMinute: 1170,
  },
  {
    id: "00000000-0000-4000-d000-000000000020",
    businessId: "00000000-0000-4000-b000-000000000003",
    day: 6,
    is24h: false,
    openMinute: 660,
    closeMinute: 1020,
  },

  // Biz 4: Dragon Pottery Studio (Wed-Sun 09:30-18:30)
  {
    id: "00000000-0000-4000-d000-000000000021",
    businessId: "00000000-0000-4000-b000-000000000004",
    day: 2,
    is24h: false,
    openMinute: 570,
    closeMinute: 1110,
  },
  {
    id: "00000000-0000-4000-d000-000000000022",
    businessId: "00000000-0000-4000-b000-000000000004",
    day: 3,
    is24h: false,
    openMinute: 570,
    closeMinute: 1110,
  },
  {
    id: "00000000-0000-4000-d000-000000000023",
    businessId: "00000000-0000-4000-b000-000000000004",
    day: 4,
    is24h: false,
    openMinute: 570,
    closeMinute: 1110,
  },
  {
    id: "00000000-0000-4000-d000-000000000024",
    businessId: "00000000-0000-4000-b000-000000000004",
    day: 5,
    is24h: false,
    openMinute: 570,
    closeMinute: 1110,
  },
  {
    id: "00000000-0000-4000-d000-000000000025",
    businessId: "00000000-0000-4000-b000-000000000004",
    day: 6,
    is24h: false,
    openMinute: 570,
    closeMinute: 1110,
  },

  // Biz 5: Zenith Strength & Fitness (24/7 Mon-Sun)
  {
    id: "00000000-0000-4000-d000-000000000026",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 0,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000027",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 1,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000028",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 2,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000029",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 3,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000030",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 4,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000031",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 5,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },
  {
    id: "00000000-0000-4000-d000-000000000032",
    businessId: "00000000-0000-4000-b000-000000000005",
    day: 6,
    is24h: true,
    openMinute: null,
    closeMinute: null,
  },

  // Biz 6: Little India Spice Traders (Mon-Sun 08:30-21:30)
  {
    id: "00000000-0000-4000-d000-000000000033",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 0,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000034",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 1,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000035",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 2,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000036",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 3,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000037",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 4,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000038",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 5,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
  {
    id: "00000000-0000-4000-d000-000000000039",
    businessId: "00000000-0000-4000-b000-000000000006",
    day: 6,
    is24h: false,
    openMinute: 510,
    closeMinute: 1290,
  },
];

/**
 * 12 Distributed Reviews across the businesses.
 * Invariant: No business owner reviews their own business.
 */
export const SEED_REVIEWS: (typeof review.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-e000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000001",
    userId: "00000000-0000-4000-a000-000000000002",
    rating: 5,
    content:
      "Crispiest kaya toast in town! The traditional Hainanese coffee roast has an incredible aroma that pairs perfectly with soft-boiled eggs.",
    createdAt: new Date("2026-02-01T08:30:00.000Z"),
    updatedAt: new Date("2026-02-01T08:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000001",
    userId: "00000000-0000-4000-a000-000000000003",
    rating: 5,
    content:
      "Authentic heritage atmosphere and very prompt service even during the busy morning peak hours.",
    createdAt: new Date("2026-02-02T09:15:00.000Z"),
    updatedAt: new Date("2026-02-02T09:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000003",
    businessId: "00000000-0000-4000-b000-000000000002",
    userId: "00000000-0000-4000-a000-000000000001",
    rating: 5,
    content:
      "Wonderful collection of local literature and Southeast Asian architectural books. A tranquil oasis on Joo Chiat Road.",
    createdAt: new Date("2026-02-03T11:00:00.000Z"),
    updatedAt: new Date("2026-02-03T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000004",
    businessId: "00000000-0000-4000-b000-000000000002",
    userId: "00000000-0000-4000-a000-000000000004",
    rating: 4,
    content:
      "Great recommendations from the staff on historical fiction and local poetry anthologies.",
    createdAt: new Date("2026-02-04T14:30:00.000Z"),
    updatedAt: new Date("2026-02-04T14:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000005",
    businessId: "00000000-0000-4000-b000-000000000003",
    userId: "00000000-0000-4000-a000-000000000001",
    rating: 5,
    content:
      "Saved my morning commute! Fixed a snapped derailleur cable within 20 minutes with fair and transparent pricing.",
    createdAt: new Date("2026-02-05T12:00:00.000Z"),
    updatedAt: new Date("2026-02-05T12:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000006",
    businessId: "00000000-0000-4000-b000-000000000003",
    userId: "00000000-0000-4000-a000-000000000005",
    rating: 5,
    content:
      "Highly skilled mechanics and extensive selection of tubeless tyres and commuter lights.",
    createdAt: new Date("2026-02-06T15:45:00.000Z"),
    updatedAt: new Date("2026-02-06T15:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000007",
    businessId: "00000000-0000-4000-b000-000000000004",
    userId: "00000000-0000-4000-a000-000000000002",
    rating: 5,
    content:
      "Attended the weekend wheel-throwing trial. Patient instructors, high-grade stoneware clay, and peaceful vibes.",
    createdAt: new Date("2026-02-07T16:00:00.000Z"),
    updatedAt: new Date("2026-02-07T16:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000008",
    businessId: "00000000-0000-4000-b000-000000000004",
    userId: "00000000-0000-4000-a000-000000000006",
    rating: 4,
    content: "Beautiful hand-glazed mugs and bowls. Picked up a custom set for home brewing tea.",
    createdAt: new Date("2026-02-08T17:30:00.000Z"),
    updatedAt: new Date("2026-02-08T17:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000009",
    businessId: "00000000-0000-4000-b000-000000000005",
    userId: "00000000-0000-4000-a000-000000000003",
    rating: 5,
    content:
      "Spotless equipment, Eleiko barbells and calibrated plates. Unmatched 24/7 convenience right in Marina Bay.",
    createdAt: new Date("2026-02-09T06:45:00.000Z"),
    updatedAt: new Date("2026-02-09T06:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000010",
    businessId: "00000000-0000-4000-b000-000000000005",
    userId: "00000000-0000-4000-a000-000000000004",
    rating: 5,
    content:
      "Knowledgeable coaches focused on injury prevention and proper powerlifting form. Great community spirit.",
    createdAt: new Date("2026-02-10T18:00:00.000Z"),
    updatedAt: new Date("2026-02-10T18:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000011",
    businessId: "00000000-0000-4000-b000-000000000006",
    userId: "00000000-0000-4000-a000-000000000001",
    rating: 5,
    content:
      "Fragrant freshly ground garam masala and premium Tellicherry black peppercorns. The quality difference is night and day.",
    createdAt: new Date("2026-02-11T13:15:00.000Z"),
    updatedAt: new Date("2026-02-11T13:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e000-000000000012",
    businessId: "00000000-0000-4000-b000-000000000006",
    userId: "00000000-0000-4000-a000-000000000005",
    rating: 5,
    content:
      "The go-to store for biryani spices, whole dried chilies, and authentic ghee. Unbeatable value and friendly guidance.",
    createdAt: new Date("2026-02-12T15:00:00.000Z"),
    updatedAt: new Date("2026-02-12T15:00:00.000Z"),
  },
];

/**
 * 4 Forum Posts attached to Businesses.
 */
export const SEED_FORUM_POSTS: (typeof forumPost.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-f000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000001",
    userId: "00000000-0000-4000-a000-000000000002",
    title: "Guide to ordering traditional Nanyang kopi customizations?",
    body: "Can anyone share the local terminology for less sweet vs no sugar and evaporated milk variations?",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-05T09:00:00.000Z"),
    updatedAt: new Date("2026-02-05T09:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000002",
    userId: "00000000-0000-4000-a000-000000000004",
    title: "Upcoming local author reading group discussions",
    body: "Are there regular reading sessions or book club meetups hosted in the Joo Chiat store?",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-06T10:30:00.000Z"),
    updatedAt: new Date("2026-02-06T10:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f000-000000000003",
    businessId: "00000000-0000-4000-b000-000000000004",
    userId: "00000000-0000-4000-a000-000000000003",
    title: "Recommended beginner pottery tools and apron essentials",
    body: "What should first-timers bring to the wheel-throwing workshops?",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-07T11:45:00.000Z"),
    updatedAt: new Date("2026-02-07T11:45:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f000-000000000004",
    businessId: "00000000-0000-4000-b000-000000000005",
    userId: "00000000-0000-4000-a000-000000000001",
    title: "Platform availability during early morning hours",
    body: "How crowded are the Olympic lifting platforms around 6:00 AM before CBD work hours?",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-08T07:15:00.000Z"),
    updatedAt: new Date("2026-02-08T07:15:00.000Z"),
  },
];

/**
 * 6 Forum Replies corresponding to the forum posts.
 */
export const SEED_FORUM_REPLIES: (typeof forumReply.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-f100-000000000001",
    postId: "00000000-0000-4000-f000-000000000001",
    userId: "00000000-0000-4000-a000-000000000001",
    body: "Kopi-O is black with sugar, Kopi-C is with evaporated milk and sugar, Kopi-Siew-Dai is less sweet, and Kopi-O-Kosong is pure black without sugar!",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-05T09:30:00.000Z"),
    updatedAt: new Date("2026-02-05T09:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f100-000000000002",
    postId: "00000000-0000-4000-f000-000000000001",
    userId: "00000000-0000-4000-a000-000000000003",
    body: "And if you want iced, just add 'Peng' to the end (e.g. Kopi-C-Peng)!",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-05T10:00:00.000Z"),
    updatedAt: new Date("2026-02-05T10:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f100-000000000003",
    postId: "00000000-0000-4000-f000-000000000002",
    userId: "00000000-0000-4000-a000-000000000002",
    body: "Yes! We host an open monthly reading circle on the first Saturday of each month at 4 PM.",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-06T11:15:00.000Z"),
    updatedAt: new Date("2026-02-06T11:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f100-000000000004",
    postId: "00000000-0000-4000-f000-000000000003",
    userId: "00000000-0000-4000-a000-000000000004",
    body: "Just wear comfortable clothes and trim your fingernails! We provide aprons, trimming tools, sponges, and clay.",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-07T12:30:00.000Z"),
    updatedAt: new Date("2026-02-07T12:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f100-000000000005",
    postId: "00000000-0000-4000-f000-000000000004",
    userId: "00000000-0000-4000-a000-000000000005",
    body: "Between 5:30 AM and 7:00 AM there is plenty of open platform space. Peak morning rush typically starts around 7:30 AM.",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-08T08:00:00.000Z"),
    updatedAt: new Date("2026-02-08T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-f100-000000000006",
    postId: "00000000-0000-4000-f000-000000000004",
    userId: "00000000-0000-4000-a000-000000000006",
    body: "Can confirm, 6 AM is super quiet and great for uninterrupted deadlift training.",
    deletedAt: null,
    moderatedAt: null,
    createdAt: new Date("2026-02-08T08:30:00.000Z"),
    updatedAt: new Date("2026-02-08T08:30:00.000Z"),
  },
];

/**
 * Seeded Likes on Reviews, Forum Posts, and Forum Replies.
 */
export const SEED_REVIEW_LIKES: (typeof reviewLike.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-1000-000000000001",
    userId: "00000000-0000-4000-a000-000000000001",
    reviewId: "00000000-0000-4000-e000-000000000001",
    createdAt: new Date("2026-02-01T10:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-1000-000000000002",
    userId: "00000000-0000-4000-a000-000000000004",
    reviewId: "00000000-0000-4000-e000-000000000001",
    createdAt: new Date("2026-02-01T12:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-1000-000000000003",
    userId: "00000000-0000-4000-a000-000000000002",
    reviewId: "00000000-0000-4000-e000-000000000003",
    createdAt: new Date("2026-02-03T13:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-1000-000000000004",
    userId: "00000000-0000-4000-a000-000000000005",
    reviewId: "00000000-0000-4000-e000-000000000005",
    createdAt: new Date("2026-02-05T14:00:00.000Z"),
  },
];

export const SEED_POST_LIKES: (typeof forumPostLike.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-2000-000000000001",
    userId: "00000000-0000-4000-a000-000000000003",
    postId: "00000000-0000-4000-f000-000000000001",
    createdAt: new Date("2026-02-05T10:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-2000-000000000002",
    userId: "00000000-0000-4000-a000-000000000005",
    postId: "00000000-0000-4000-f000-000000000001",
    createdAt: new Date("2026-02-05T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-2000-000000000003",
    userId: "00000000-0000-4000-a000-000000000001",
    postId: "00000000-0000-4000-f000-000000000002",
    createdAt: new Date("2026-02-06T12:00:00.000Z"),
  },
];

export const SEED_REPLY_LIKES: (typeof forumReplyLike.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-3000-000000000001",
    userId: "00000000-0000-4000-a000-000000000002",
    replyId: "00000000-0000-4000-f100-000000000001",
    createdAt: new Date("2026-02-05T10:15:00.000Z"),
  },
  {
    id: "00000000-0000-4000-3000-000000000002",
    userId: "00000000-0000-4000-a000-000000000004",
    replyId: "00000000-0000-4000-f100-000000000003",
    createdAt: new Date("2026-02-06T12:30:00.000Z"),
  },
];

/**
 * 3 Active Announcements authored by Business Owners.
 */
export const SEED_ANNOUNCEMENTS: (typeof announcement.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-a100-000000000001",
    businessId: "00000000-0000-4000-b000-000000000001",
    userId: "00000000-0000-4000-a000-000000000001",
    title: "Heritage Kaya Jar Batch Release",
    content:
      "Our slow-cooked pandan kaya jars are freshly batched every Wednesday morning. Available in-store while stocks last!",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: new Date("2027-01-01T00:00:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-01T08:00:00.000Z"),
    updatedAt: new Date("2026-02-01T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a100-000000000002",
    businessId: "00000000-0000-4000-b000-000000000002",
    userId: "00000000-0000-4000-a000-000000000002",
    title: "Singapore Heritage Literature Month",
    content:
      "Enjoy 15% off all local literary non-fiction and poetry collections throughout the coming month.",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: new Date("2027-01-01T00:00:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-02T09:00:00.000Z"),
    updatedAt: new Date("2026-02-02T09:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-a100-000000000003",
    businessId: "00000000-0000-4000-b000-000000000005",
    userId: "00000000-0000-4000-a000-000000000005",
    title: "New Calibrated Powerlifting Plates Installed",
    content:
      "Four brand new competition-spec Eleiko squat racks and calibrated kilogram plate sets are now live on the main gym floor.",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: new Date("2027-01-01T00:00:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-03T10:00:00.000Z"),
    updatedAt: new Date("2026-02-03T10:00:00.000Z"),
  },
];

/**
 * 3 Future Events authored by Business Owners.
 * Satisfies endsAt >= startsAt and endsAt in the future.
 */
export const SEED_EVENTS: (typeof event.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-e100-000000000001",
    businessId: "00000000-0000-4000-b000-000000000002",
    userId: "00000000-0000-4000-a000-000000000002",
    title: "Local Authors Book Reading & Discussion",
    description:
      "Join us for an intimate evening with local Singaporean essayists and historians discussing urban heritage and community storytelling.",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-09-12T18:30:00.000Z"),
    endsAt: new Date("2026-09-12T20:30:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-01T08:00:00.000Z"),
    updatedAt: new Date("2026-02-01T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e100-000000000002",
    businessId: "00000000-0000-4000-b000-000000000004",
    userId: "00000000-0000-4000-a000-000000000004",
    title: "Weekend Pottery Wheel Masterclass",
    description:
      "An intensive 3-hour masterclass covering centering techniques, pulling uniform cylinder walls, and trimming foot rings.",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-09-19T14:00:00.000Z"),
    endsAt: new Date("2026-09-19T17:00:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-02T09:00:00.000Z"),
    updatedAt: new Date("2026-02-02T09:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-e100-000000000003",
    businessId: "00000000-0000-4000-b000-000000000005",
    userId: "00000000-0000-4000-a000-000000000005",
    title: "Community Kettlebell & Barbell Mobility Clinic",
    description:
      "A hands-on workshop on hip hinging mechanics, overhead shoulder mobility, and kettlebell clean & press fundamentals.",
    imageUrl: null,
    linkUrl: null,
    startsAt: new Date("2026-09-26T10:00:00.000Z"),
    endsAt: new Date("2026-09-26T12:30:00.000Z"),
    status: "active",
    moderationReason: null,
    createdAt: new Date("2026-02-03T10:00:00.000Z"),
    updatedAt: new Date("2026-02-03T10:00:00.000Z"),
  },
];

/**
 * 8 Seeded Bookmarks connecting users to favorite businesses.
 */
export const SEED_BOOKMARKS: (typeof bookmark.$inferInsert)[] = [
  {
    id: "00000000-0000-4000-b100-000000000001",
    userId: "00000000-0000-4000-a000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000002",
    createdAt: new Date("2026-02-01T08:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000002",
    userId: "00000000-0000-4000-a000-000000000001",
    businessId: "00000000-0000-4000-b000-000000000004",
    createdAt: new Date("2026-02-01T08:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000003",
    userId: "00000000-0000-4000-a000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000001",
    createdAt: new Date("2026-02-02T09:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000004",
    userId: "00000000-0000-4000-a000-000000000002",
    businessId: "00000000-0000-4000-b000-000000000005",
    createdAt: new Date("2026-02-02T09:30:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000005",
    userId: "00000000-0000-4000-a000-000000000003",
    businessId: "00000000-0000-4000-b000-000000000001",
    createdAt: new Date("2026-02-03T10:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000006",
    userId: "00000000-0000-4000-a000-000000000004",
    businessId: "00000000-0000-4000-b000-000000000006",
    createdAt: new Date("2026-02-04T11:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000007",
    userId: "00000000-0000-4000-a000-000000000005",
    businessId: "00000000-0000-4000-b000-000000000002",
    createdAt: new Date("2026-02-05T12:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-b100-000000000008",
    userId: "00000000-0000-4000-a000-000000000006",
    businessId: "00000000-0000-4000-b000-000000000001",
    createdAt: new Date("2026-02-06T13:00:00.000Z"),
  },
];

export type SeedStats = {
  users: number;
  businesses: number;
  listings: number;
  businessHours: number;
  reviews: number;
  forumPosts: number;
  forumReplies: number;
  reviewLikes: number;
  postLikes: number;
  replyLikes: number;
  announcements: number;
  events: number;
  bookmarks: number;
};

/**
 * Executes the production seed in a single transaction.
 * Idempotent: safe to run multiple times with zero side-effects or duplicates.
 */
export function runSeed(dbInstance: Database = defaultDb): Promise<SeedStats> {
  return dbInstance.transaction(async tx => {
    // 1. Synthetic Users
    await tx.insert(user).values(SEED_USERS).onConflictDoNothing({ target: user.id });

    // 2. Businesses
    await tx.insert(business).values(SEED_BUSINESSES).onConflictDoNothing({ target: business.id });

    // 3. Listings
    await tx.insert(listing).values(SEED_LISTINGS).onConflictDoNothing({ target: listing.id });

    // 4. Business Hours
    await tx
      .insert(businessHours)
      .values(SEED_BUSINESS_HOURS)
      .onConflictDoNothing({ target: businessHours.id });

    // 5. Reviews
    await tx.insert(review).values(SEED_REVIEWS).onConflictDoNothing({ target: review.id });

    // 6. Forum Posts & Replies
    await tx
      .insert(forumPost)
      .values(SEED_FORUM_POSTS)
      .onConflictDoNothing({ target: forumPost.id });
    await tx
      .insert(forumReply)
      .values(SEED_FORUM_REPLIES)
      .onConflictDoNothing({ target: forumReply.id });

    // 7. Likes
    await tx
      .insert(reviewLike)
      .values(SEED_REVIEW_LIKES)
      .onConflictDoNothing({ target: reviewLike.id });
    await tx
      .insert(forumPostLike)
      .values(SEED_POST_LIKES)
      .onConflictDoNothing({ target: forumPostLike.id });
    await tx
      .insert(forumReplyLike)
      .values(SEED_REPLY_LIKES)
      .onConflictDoNothing({ target: forumReplyLike.id });

    // 8. Announcements
    await tx
      .insert(announcement)
      .values(SEED_ANNOUNCEMENTS)
      .onConflictDoNothing({ target: announcement.id });

    // 9. Events
    await tx.insert(event).values(SEED_EVENTS).onConflictDoNothing({ target: event.id });

    // 10. Bookmarks
    await tx.insert(bookmark).values(SEED_BOOKMARKS).onConflictDoNothing({ target: bookmark.id });

    return {
      users: SEED_USERS.length,
      businesses: SEED_BUSINESSES.length,
      listings: SEED_LISTINGS.length,
      businessHours: SEED_BUSINESS_HOURS.length,
      reviews: SEED_REVIEWS.length,
      forumPosts: SEED_FORUM_POSTS.length,
      forumReplies: SEED_FORUM_REPLIES.length,
      reviewLikes: SEED_REVIEW_LIKES.length,
      postLikes: SEED_POST_LIKES.length,
      replyLikes: SEED_REPLY_LIKES.length,
      announcements: SEED_ANNOUNCEMENTS.length,
      events: SEED_EVENTS.length,
      bookmarks: SEED_BOOKMARKS.length,
    };
  });
}

if (import.meta.main) {
  try {
    console.log("🌱 Running production seed...");
    const stats = await runSeed();
    console.log("✅ Production seed completed successfully:");
    console.table(stats);
    process.exit(0);
  } catch (error) {
    console.error("❌ Production seed failed:", error);
    process.exit(1);
  }
}
