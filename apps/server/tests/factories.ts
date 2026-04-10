export const defaultUser = (overrides = {}) => ({
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: "http://example.com/avatar.png",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const defaultBusiness = (overrides = {}) => ({
  uen: "UEN123456789",
  businessName: "Test Cafe",
  businessCategory: "F&B",
  ownerId: "u1",
  description: "A cozy place for tests",
  address: "123 Street",
  latitude: "1.35",
  longitude: "103.8",
  priceTier: "low" as any,
  wallpaperUrl: "http://example.com/image.png",
  open247: false,
  offersDelivery: false,
  offersPickup: false,
  email: "contact@testcafe.com",
  phoneNumber: "87654321",
  websiteUrl: "http://testcafe.com",
  socialMediaUrl: "http://fb.com/testcafe",
  paymentOptions: ["cash"] as any,
  openingHours: {
    Monday: { open: "08:00", close: "18:00" },
    Tuesday: { open: "08:00", close: "18:00" },
    Wednesday: { open: "08:00", close: "18:00" },
    Thursday: { open: "08:00", close: "18:00" },
    Friday: { open: "08:00", close: "18:00" },
    Saturday: { open: "09:00", close: "17:00" },
    Sunday: { open: "09:00", close: "17:00" },
  } as any,
  ...overrides,
});

export const defaultReview = (overrides = {}) => ({
  email: "test@example.com",
  uen: "UEN123456789",
  rating: 5,
  body: "Excellent!",
  likeCount: 0,
  ...overrides,
});

export const defaultForumPost = (overrides = {}) => ({
  email: "test@example.com",
  uen: "UEN123456789",
  title: "A Post",
  body: "Some content",
  likeCount: 0,
  ...overrides,
});

export const defaultForumReply = (overrides = {}) => ({
  postId: 1,
  email: "test@example.com",
  body: "A reply",
  likeCount: 0,
  ...overrides,
});

export const defaultAnnouncement = (overrides = {}) => ({
  uen: "UEN123456789",
  title: "Big Sale!",
  content: "Everything is 50% off today only.",
  imageUrl: "http://example.com/sale.png",
  ...overrides,
});

export const defaultBookmark = (overrides = {}) => ({
  userId: "u1",
  uen: "UEN123456789",
  ...overrides,
});
