import type {
  BrandIdentitySummary,
  BusinessProfile,
  BusinessSearchResult,
  Competitor,
  GoogleLocalRankingSnapshot,
  WebsiteAudit,
} from "./types";

export const MOCK_BUSINESS: BusinessProfile = {
  placeId: "mock-zenpho-plumbing",
  name: "Apex Local Plumbing",
  address: "1248 Main St, Austin, TX 78701",
  phone: "(512) 555-0148",
  website: "https://example.com",
  category: "Plumber",
  types: ["plumber", "home_services", "point_of_interest"],
  rating: 4.1,
  reviewCount: 64,
  reviews: [
    {
      authorName: "Jordan K.",
      rating: 1,
      text: "Terrible experience — rude on the phone, late to the appointment, and the quote was way too expensive.",
      publishTime: null,
      relativePublishTime: "3 weeks ago",
    },
    {
      authorName: "Drew P.",
      rating: 2,
      text: "Hard to reach by phone and nobody followed up on the quote.",
      publishTime: null,
      relativePublishTime: "1 month ago",
    },
    {
      authorName: "Sam L.",
      rating: 3,
      text: "Work was okay but I had to wait almost an hour past the window.",
      publishTime: null,
      relativePublishTime: "6 weeks ago",
    },
    {
      authorName: "Priya N.",
      rating: 4,
      text: "Professional crew but pricing was higher than I expected.",
      publishTime: null,
      relativePublishTime: "2 months ago",
    },
    {
      authorName: "Maria G.",
      rating: 5,
      text: "They arrived fast and fixed the leak the same day.",
      publishTime: null,
      relativePublishTime: "2 weeks ago",
    },
    {
      authorName: "Chris T.",
      rating: 5,
      text: "I highly recommend them!",
      publishTime: null,
      relativePublishTime: "5 months ago",
    },
  ],
  photos: [
    { name: "mock-photo-1", widthPx: 640, heightPx: 420 },
    { name: "mock-photo-2", widthPx: 480, heightPx: 360 },
    { name: "mock-photo-3", widthPx: 300, heightPx: 200 },
  ],
  photoCount: 3,
  coordinates: { lat: 30.2672, lng: -97.7431 },
  hours: ["Monday: 8:00 AM - 5:00 PM", "Tuesday: 8:00 AM - 5:00 PM"],
  googleMapsUri: "https://maps.google.com/?cid=mock",
  businessStatus: "OPERATIONAL",
  identityAttributes: [
    {
      id: "latino_owned",
      label: "Identifies as Latino-owned",
      detected: true,
      source: "mock",
    },
  ],
};

export const MOCK_SEARCH_RESULTS: BusinessSearchResult[] = [
  {
    placeId: MOCK_BUSINESS.placeId,
    name: MOCK_BUSINESS.name,
    address: MOCK_BUSINESS.address,
    category: MOCK_BUSINESS.category,
    rating: MOCK_BUSINESS.rating,
    reviewCount: MOCK_BUSINESS.reviewCount,
    website: MOCK_BUSINESS.website,
    coordinates: MOCK_BUSINESS.coordinates,
    googleMapsUri: MOCK_BUSINESS.googleMapsUri,
  },
  {
    placeId: "mock-apex-services",
    name: "Apex Home Services",
    address: "901 Congress Ave, Austin, TX 78701",
    category: "Contractor",
    rating: 4.6,
    reviewCount: 184,
    website: "https://example.org",
    coordinates: { lat: 30.271, lng: -97.741 },
    googleMapsUri: null,
  },
];

const competitorNames = [
  "RapidFlow Plumbing",
  "Hill Country Rooter",
  "Trusty Pipe Pros",
  "Austin Emergency Plumbing",
  "Blue Star Plumbing",
  "Same Day Drain Co.",
  "Capital City Plumbing",
  "Lone Star Leak Repair",
  "Proline Plumbing Austin",
  "Precision Pipe Works",
  "Neighborhood Plumbing",
  "South Congress Plumbers",
];

export function mockCompetitors(): Competitor[] {
  return competitorNames.map((name, index) => ({
    placeId: `mock-competitor-${index + 1}`,
    name,
    address: `${100 + index * 13} Market Rd, Austin, TX`,
    website: index % 3 === 0 ? null : `https://competitor-${index + 1}.example.com`,
    rating: Math.round((4.8 - index * 0.04) * 10) / 10,
    reviewCount: 244 - index * 11,
    photoCount: 38 - index,
    category: "Plumber",
    coordinates: {
      lat: 30.2672 + (index % 4) * 0.012 - 0.018,
      lng: -97.7431 + Math.floor(index / 4) * 0.014 - 0.014,
    },
    marketStrengthScore: Math.max(45, 94 - index * 4),
    distanceMiles: Math.round((0.7 + index * 0.4) * 10) / 10,
    rank: index + 1,
  }));
}

export function mockRankingSnapshot(): GoogleLocalRankingSnapshot {
  const comps = mockCompetitors();
  return {
    query: "Plumber near Austin",
    location: "Austin",
    topFive: comps.slice(0, 5).map((c) => ({
      position: c.rank ?? 0,
      placeId: c.placeId,
      name: c.name,
      address: c.address,
      rating: c.rating,
      reviewCount: c.reviewCount,
      category: c.category,
      website: c.website,
      isSelectedBusiness: false,
    })),
    selectedBusinessPosition: 12,
    selectedBusinessRankItem: {
      position: 12,
      placeId: MOCK_BUSINESS.placeId,
      name: MOCK_BUSINESS.name,
      address: MOCK_BUSINESS.address,
      rating: MOCK_BUSINESS.rating,
      reviewCount: MOCK_BUSINESS.reviewCount,
      category: MOCK_BUSINESS.category,
      website: MOCK_BUSINESS.website,
      isSelectedBusiness: true,
    },
    totalResultsChecked: 20,
    warnings: ["Mock ranking data is shown because Google Places is not configured."],
  };
}

export const MOCK_BRAND_IDENTITY: BrandIdentitySummary = {
  logoUrl: null,
  palette: ["#2563EB", "#0EA5E9", "#F59E0B", "#111827"],
  primaryColor: "#2563EB",
  accentColor: "#0EA5E9",
  typographyNotes: ["Bold service-business headlines", "Simple sans-serif body copy"],
  sourceUrl: "https://example.com",
  brandPresenceSummary:
    "Brand assets were estimated from mock data. The report will use live colors and logo when the selected business has a crawlable website.",
  warnings: ["Mock brand identity shown for local development."],
};

export const MOCK_WEBSITE_AUDIT: WebsiteAudit = {
  url: "https://example.com",
  normalizedUrl: "https://example.com/",
  available: true,
  status: "Analyzed with mock website signals.",
  screenshotUrl: null,
  https: true,
  mobileFriendly: false,
  pageSpeedMobileScore: 48,
  title: "Apex Local Plumbing",
  metaDescription: "Local plumbing services.",
  h1: "Plumbing Services",
  hasViewport: true,
  hasPhoneLink: false,
  hasPhoneText: true,
  hasPrimaryCta: false,
  hasContactForm: false,
  hasQuoteCta: false,
  hasTestimonials: false,
  hasClientPhotos: false,
  hasProjectPhotos: false,
  hasBeforeAfter: false,
  hasServicePages: true,
  hasLocationPages: false,
  hasLocalBusinessSchema: false,
  hasGoogleAnalytics: false,
  hasGoogleTagManager: false,
  hasGoogleAdsTag: false,
  hasMetaPixel: false,
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    tiktok: null,
    youtube: null,
  },
  contactLinks: {
    phone: "+15125550148",
    email: "hello@example.com",
  },
  identityAttributes: [
    {
      id: "latino_owned",
      label: "Identifies as Latino-owned",
      detected: true,
      source: "mock",
    },
  ],
  imageCount: 4,
  blurryImageSignals: 2,
  warnings: ["Mock website audit shown for local development."],
};
