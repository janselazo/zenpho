import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

export type StitchWebsiteProfileId =
  | "dental"
  | "medical"
  | "wedding-venue"
  | "restaurant"
  | "salon-spa"
  | "home-trades"
  | "legal-professional"
  | "fitness-wellness"
  | "automotive"
  | "pet-vet"
  | "retail"
  | "lodging-travel"
  | "default";

type SectionLabels = {
  services: string;
  about: string;
  stories: string;
  visit: string;
};

export type StitchWebsiteProfile = {
  id: StitchWebsiteProfileId;
  label: string;
  nav: SectionLabels;
  primaryCta: string;
  secondaryCta: string;
  sectionBlueprints: {
    home: string;
    services: string;
    about: string;
    stories: string;
    visit: string;
  };
  serviceExamples: string[];
  proofSignals: string[];
  processSteps: string[];
  imageryDirection: string;
  colorDirection: string;
  faqExamples: string[];
  avoid: string[];
};

function includesAny(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

function payloadHaystack(payload: StitchProspectDesignPayload): string {
  const parts: string[] = [];

  if (payload.kind === "place") {
    parts.push(payload.place.name);
    parts.push(primaryPlaceTypeLabel(payload.place.types));
    parts.push(...(payload.place.types ?? []));
    if (payload.place.formattedAddress) parts.push(payload.place.formattedAddress);
    if (payload.place.websiteUri) parts.push(payload.place.websiteUri);
  } else {
    parts.push(payload.url);
    if (payload.pageTitle) parts.push(payload.pageTitle);
    if (payload.metaDescription) parts.push(payload.metaDescription);
  }

  const facts = payload.sourceWebsiteFacts;
  if (facts) {
    if (facts.title) parts.push(facts.title);
    parts.push(...facts.navLabels, ...facts.headings, ...facts.keyPhrases);
  }

  return parts.join(" ").toLowerCase();
}

const PROFILES: Record<StitchWebsiteProfileId, StitchWebsiteProfile> = {
  dental: {
    id: "dental",
    label: "Dental clinic / oral health practice",
    nav: {
      services: "Treatments",
      about: "Our Practice",
      stories: "Patient Stories",
      visit: "Book a Visit",
    },
    primaryCta: "Book Appointment",
    secondaryCta: "Explore Treatments",
    sectionBlueprints: {
      home:
        "Lead with calm confidence: comfort-first care, modern treatment rooms, insurance/financing cues, emergency availability when appropriate, and a patient trust bar.",
      services:
        "Use treatment cards such as cleanings, cosmetic dentistry, implants, whitening, Invisalign/orthodontics, emergency care, and family dentistry. Include duration/financing/insurance cues instead of generic prices.",
      about:
        "Show dentist/team credibility, technology, comfort amenities, hygiene standards, and a friendly practice story. Include a facility or operatory visual block.",
      stories:
        "Use patient testimonials, smile transformation gallery placeholders, before/after-safe captions, and aggregate rating proof. Keep the tone reassuring and health-aware.",
      visit:
        "Build a booking flow for appointment type, preferred day, insurance question, new/existing patient choice, location/hours, phone, emergency CTA, and dental FAQs.",
    },
    serviceExamples: [
      "Preventive cleanings",
      "Cosmetic smile design",
      "Dental implants",
      "Invisalign consultation",
      "Emergency tooth pain visit",
      "Family dentistry",
    ],
    proofSignals: [
      "Google rating and review count",
      "Insurance-friendly care",
      "Modern imaging or same-day technology",
      "Comfort amenities",
      "Emergency appointment availability",
    ],
    processSteps: ["Choose a treatment", "Confirm insurance or financing", "Meet the care team", "Leave with a clear care plan"],
    imageryDirection:
      "clean clinical luxury, bright treatment rooms, confident smiles, soft blue/green or brand-led accents, polished but never cold",
    colorDirection:
      "calm clinical trust: brand colors first, otherwise clean blues, seafoam, warm white, soft slate, and restrained wellness accents",
    faqExamples: [
      "Do you accept new patients?",
      "Can I book an emergency appointment?",
      "Do you work with insurance?",
      "What cosmetic options are available?",
    ],
    avoid: [
      "Do not make the site feel like a spa, wedding venue, or generic wellness retreat.",
      "Do not invent medical certifications, insurance participation, or clinical claims not present in context.",
      "Do not use scary dental imagery or overly sterile hospital styling.",
    ],
  },
  medical: {
    id: "medical",
    label: "Medical / healthcare clinic",
    nav: {
      services: "Care",
      about: "Providers",
      stories: "Patient Trust",
      visit: "Schedule",
    },
    primaryCta: "Schedule a Visit",
    secondaryCta: "View Care Options",
    sectionBlueprints: {
      home:
        "Lead with access, trust, clinical clarity, and warm reassurance. Surface rating, location, phone, accepted-care cues when present, and urgent/standard visit pathways.",
      services:
        "Use care-option cards tied to the category: primary care, specialty visits, diagnostics, wellness checks, follow-ups, pharmacy/optical/chiropractic/therapy when relevant.",
      about:
        "Highlight provider expertise, care philosophy, modern equipment, patient experience, and accessible communication.",
      stories:
        "Use patient trust cards, outcome-oriented quotes without unsupported medical claims, and a facility/care environment gallery.",
      visit:
        "Build appointment request, patient type, visit reason, hours, phone, location, forms checklist, and healthcare-specific FAQs.",
    },
    serviceExamples: ["New patient visits", "Follow-up care", "Preventive exams", "Diagnostics", "Specialty consultation", "Care coordination"],
    proofSignals: ["Provider credentials when present", "Google rating", "Accessible location", "Clear appointment pathway", "Patient-centered care"],
    processSteps: ["Request a visit", "Share visit reason", "Meet the care team", "Get next steps"],
    imageryDirection: "warm clinical editorial, calm people-first healthcare moments, soft light, clean forms and trust badges",
    colorDirection: "healthcare trust: brand colors first, otherwise soft blue, teal, white, sage, and gentle neutral depth",
    faqExamples: ["Are new patients accepted?", "What should I bring?", "How do I request records?", "Can I call for urgent needs?"],
    avoid: [
      "Do not promise outcomes or cures.",
      "Do not invent specialties, board certifications, insurance networks, or emergency services.",
      "Do not use generic spa copy for clinical care.",
    ],
  },
  "wedding-venue": {
    id: "wedding-venue",
    label: "Wedding / event venue",
    nav: {
      services: "Weddings",
      about: "The Venue",
      stories: "Celebrations",
      visit: "Tour Dates",
    },
    primaryCta: "Book a Tour",
    secondaryCta: "Explore Packages",
    sectionBlueprints: {
      home:
        "Lead with atmosphere, ceremony-to-reception flow, guest experience, seasonal beauty, and a tour/availability CTA. The hero should feel editorial and cinematic.",
      services:
        "Use package cards for ceremony, reception, full-day rental, micro-weddings, corporate/private events, catering/vendor amenities, and planning support.",
      about:
        "Tell the venue story through spaces, capacity, indoor/outdoor options, architecture, owner hospitality, and what makes the setting memorable.",
      stories:
        "Use celebration stories, couple/event testimonials, a 9-image editorial gallery, detail shots, table settings, dance floor, ceremony lawn, and golden-hour captions.",
      visit:
        "Build tour request, date/guest-count fields, availability calendar styling, amenities checklist, location/map, vendor/parking FAQs, and a warm event inquiry form.",
    },
    serviceExamples: ["Ceremony space", "Reception packages", "Micro-weddings", "Private events", "Vendor coordination", "Venue tours"],
    proofSignals: ["Guest capacity", "Indoor/outdoor spaces", "Photo-ready settings", "Reviews from couples or hosts", "Availability/tour CTA"],
    processSteps: ["Tour the venue", "Hold your date", "Plan the details", "Celebrate with guests"],
    imageryDirection:
      "romantic editorial venue photography, golden-hour grounds, tablescapes, florals, architecture, warm candlelight, cinematic full-bleed gallery moments",
    colorDirection:
      "romantic editorial: brand colors first, otherwise ivory, champagne, deep green, dusty rose, warm taupe, and elegant metallic accents",
    faqExamples: ["How many guests can the venue host?", "Are tours available?", "Can we bring vendors?", "Is there indoor and outdoor space?"],
    avoid: [
      "Do not structure the page like a medical clinic or appointment service.",
      "Do not call packages treatments or services.",
      "Do not use generic three-card service rows without venue imagery, capacity, tours, or event storytelling.",
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant / cafe / food business",
    nav: {
      services: "Menu",
      about: "Kitchen",
      stories: "Reviews",
      visit: "Reserve",
    },
    primaryCta: "Reserve a Table",
    secondaryCta: "View Menu",
    sectionBlueprints: {
      home:
        "Lead with appetite appeal, signature dishes, neighborhood warmth, hours/location, rating, and a reservation/order CTA.",
      services:
        "Use menu/category cards with dish names, tasting notes, price cues, specials, catering or takeout when relevant.",
      about:
        "Tell the kitchen story: ingredients, chef/family, neighborhood, atmosphere, dining room, and service style.",
      stories:
        "Use diner reviews, press-style pull quotes, food and ambiance gallery placeholders, and social proof around favorite dishes.",
      visit:
        "Build reservation/order block, hours, address, map, phone, dietary/catering FAQs, and a contact or private-event inquiry.",
    },
    serviceExamples: ["Signature plates", "Lunch specials", "Dinner menu", "Catering", "Takeout", "Private events"],
    proofSignals: ["Rating/reviews", "Popular dishes", "Hours", "Neighborhood location", "Reservation or order pathway"],
    processSteps: ["Choose your table or order", "Pick favorites", "Arrive or pick up", "Share the experience"],
    imageryDirection: "warm food editorial, plated dishes, bar/cafe ambiance, textured backgrounds, inviting human moments",
    colorDirection: "appetite-led: brand colors first, otherwise warm neutrals, charcoal, tomato, olive, amber, espresso, or cream",
    faqExamples: ["Do you take reservations?", "Do you offer takeout?", "Can you host private events?", "Are dietary options available?"],
    avoid: [
      "Do not make it look like a SaaS dashboard or clinic.",
      "Do not invent a cuisine that conflicts with the category or source site.",
      "Do not bury hours, address, menu, or reservation actions.",
    ],
  },
  "salon-spa": {
    id: "salon-spa",
    label: "Salon / spa / beauty studio",
    nav: {
      services: "Services",
      about: "Artists",
      stories: "Transformations",
      visit: "Book",
    },
    primaryCta: "Book Now",
    secondaryCta: "View Services",
    sectionBlueprints: {
      home:
        "Lead with transformation, confidence, stylist/provider artistry, premium booking, rating, and beautiful service cards.",
      services:
        "Use service menu cards with duration/starting-at cues for hair, nails, skincare, massage, lashes, brows, color, or spa packages as relevant.",
      about:
        "Show artists/providers, technique, consultation process, atmosphere, and client-care standards.",
      stories:
        "Use transformation gallery placeholders, before/after-style captions, reviews, and social proof around specific services.",
      visit:
        "Build booking flow, service chips, stylist/provider preference, time slots, policies, location/hours, and beauty-specific FAQs.",
    },
    serviceExamples: ["Cut and style", "Color consultation", "Facials", "Massage", "Nails", "Bridal or event styling"],
    proofSignals: ["Stylist expertise", "Transformation gallery", "Rating/reviews", "Booking availability", "Premium care experience"],
    processSteps: ["Choose your service", "Match with a provider", "Relax in studio", "Leave refreshed"],
    imageryDirection: "soft luxury beauty editorial, skin/hair texture, warm mirrors, product details, calm spa surfaces",
    colorDirection: "beauty premium: brand colors first, otherwise blush, cream, champagne, sage, cocoa, soft black, or lavender",
    faqExamples: ["How do I book?", "Can I choose a stylist?", "What is the cancellation policy?", "Do you offer packages?"],
    avoid: [
      "Do not make all cards feel like medical treatments.",
      "Do not use generic office copy.",
      "Do not invent regulated claims for skincare or wellness services.",
    ],
  },
  "home-trades": {
    id: "home-trades",
    label: "Home service / trade contractor",
    nav: {
      services: "Services",
      about: "Why Us",
      stories: "Projects",
      visit: "Get a Quote",
    },
    primaryCta: "Request a Quote",
    secondaryCta: "View Services",
    sectionBlueprints: {
      home:
        "Lead with fast response, service area, licensed/professional trust cues when present, phone-first CTA, rating, and emergency/same-day availability when appropriate.",
      services:
        "Use service cards for repair, installation, maintenance, inspection, emergency work, upgrades, and estimates. Include urgency and service-area cues.",
      about:
        "Show crew reliability, workmanship, process, equipment/trucks, guarantees if present, and neighborhood service story.",
      stories:
        "Use project cards, before/after placeholders, homeowner reviews, and problem-solution captions.",
      visit:
        "Build quote request form, job type, urgency, service address field, phone CTA, map/service area, hours, and trade-specific FAQs.",
    },
    serviceExamples: ["Emergency repair", "Installation", "Maintenance", "Inspection", "Replacement", "Free estimate"],
    proofSignals: ["Fast response", "Service area", "Rating/reviews", "Licensed/insured only if in source", "Before/after projects"],
    processSteps: ["Describe the issue", "Schedule a visit", "Get a clear quote", "Approve the work"],
    imageryDirection: "clean work trucks, tools, homes, before/after project cards, sturdy high-contrast service design",
    colorDirection: "service-trust: brand colors first, otherwise navy, safety orange, steel, white, charcoal, and practical high-contrast accents",
    faqExamples: ["Do you offer emergency service?", "What areas do you serve?", "Can I get an estimate?", "Do you handle repairs and installs?"],
    avoid: [
      "Do not make it feel like a boutique salon or wedding site.",
      "Do not invent licenses, guarantees, or emergency availability if not supported.",
      "Do not hide the phone number or quote CTA.",
    ],
  },
  "legal-professional": {
    id: "legal-professional",
    label: "Legal / professional services",
    nav: {
      services: "Practice Areas",
      about: "Firm",
      stories: "Client Trust",
      visit: "Consultation",
    },
    primaryCta: "Request Consultation",
    secondaryCta: "View Practice Areas",
    sectionBlueprints: {
      home:
        "Lead with authority, discretion, clear next step, practice/category specificity, and trust without making unsupported outcome claims.",
      services:
        "Use practice-area or advisory cards, consultation paths, document/help categories, case-type descriptions, and professional service tiers.",
      about:
        "Show firm values, expertise, process, team, local presence, and client communication style.",
      stories:
        "Use anonymized client-trust quotes, case-process cards without invented verdicts, and credibility signals.",
      visit:
        "Build consultation request, matter type, preferred contact method, office/location, hours, confidentiality note, and professional FAQs.",
    },
    serviceExamples: ["Consultation", "Practice area review", "Document preparation", "Representation", "Advisory services", "Case evaluation"],
    proofSignals: ["Professional authority", "Clear consultation pathway", "Local office", "Client trust", "Responsive communication"],
    processSteps: ["Request consultation", "Share your situation", "Review options", "Move forward with clarity"],
    imageryDirection: "editorial office, refined serif typography, confident whitespace, document details, city/local professional cues",
    colorDirection: "professional authority: brand colors first, otherwise navy, oxblood, ivory, charcoal, brass, and restrained neutrals",
    faqExamples: ["How do consultations work?", "What should I bring?", "Is my inquiry confidential?", "Which matters do you handle?"],
    avoid: [
      "Do not promise legal, financial, tax, or real estate outcomes.",
      "Do not invent verdicts, awards, licenses, or credentials.",
      "Do not use playful consumer copy that undermines authority.",
    ],
  },
  "fitness-wellness": {
    id: "fitness-wellness",
    label: "Fitness / wellness studio",
    nav: {
      services: "Programs",
      about: "Coaches",
      stories: "Results",
      visit: "Join",
    },
    primaryCta: "Start Today",
    secondaryCta: "View Programs",
    sectionBlueprints: {
      home:
        "Lead with energy, progress, community, schedule/membership CTA, rating, and a strong program preview.",
      services:
        "Use programs/classes/memberships, personal training, intro offers, recovery or wellness sessions, and schedule cards.",
      about:
        "Show coaches, philosophy, space, community standards, and beginner-friendly onboarding.",
      stories:
        "Use member stories, progress milestones without unrealistic claims, class/gallery placeholders, and review proof.",
      visit:
        "Build class booking or membership flow, schedule grid, trial CTA, location/hours, what-to-bring FAQs, and contact form.",
    },
    serviceExamples: ["Intro class", "Personal training", "Group programs", "Memberships", "Wellness sessions", "Recovery support"],
    proofSignals: ["Community", "Coach expertise", "Schedule clarity", "Rating/reviews", "Beginner-friendly onboarding"],
    processSteps: ["Pick a program", "Book your first session", "Meet your coach", "Build momentum"],
    imageryDirection: "energetic studio movement, bold type, progress cards, community moments, clean athletic surfaces",
    colorDirection: "active wellness: brand colors first, otherwise deep green, electric blue, black, warm white, lime, or energetic coral",
    faqExamples: ["Is this beginner friendly?", "How do memberships work?", "What should I bring?", "Can I try one class first?"],
    avoid: [
      "Do not promise unrealistic body or health outcomes.",
      "Do not use generic medical clinic structure.",
      "Do not hide schedule, programs, or join CTA.",
    ],
  },
  automotive: {
    id: "automotive",
    label: "Automotive service / dealership",
    nav: {
      services: "Services",
      about: "Shop",
      stories: "Reviews",
      visit: "Schedule",
    },
    primaryCta: "Schedule Service",
    secondaryCta: "View Services",
    sectionBlueprints: {
      home:
        "Lead with trust, speed, vehicle expertise, service scheduling, rating, and a shop/dealership visual identity.",
      services:
        "Use cards for diagnostics, repairs, maintenance, tires, detailing, inspections, financing or inventory when relevant.",
      about:
        "Show shop standards, technicians, equipment, transparency, local reputation, and customer communication.",
      stories:
        "Use driver reviews, service bays/gallery placeholders, before/after detail cards, and trust metrics.",
      visit:
        "Build service appointment, vehicle info fields, issue description, hours/location, phone, map, and automotive FAQs.",
    },
    serviceExamples: ["Diagnostics", "Oil and maintenance", "Brake service", "Tires", "Detailing", "Service appointment"],
    proofSignals: ["Rating/reviews", "Technician expertise", "Transparent estimates", "Fast scheduling", "Shop location"],
    processSteps: ["Tell us the vehicle", "Choose service", "Approve estimate", "Drive away confident"],
    imageryDirection: "polished garage, vehicle details, high-contrast surfaces, tool precision, confident motion lines",
    colorDirection: "automotive premium: brand colors first, otherwise black, silver, red, royal blue, graphite, and crisp white",
    faqExamples: ["Can I schedule online?", "Do you provide estimates?", "What vehicles do you service?", "How long will service take?"],
    avoid: [
      "Do not use restaurant or spa section language.",
      "Do not invent certifications, financing, warranties, or brands.",
      "Do not make the page feel like generic ecommerce unless it is a dealer/inventory site.",
    ],
  },
  "pet-vet": {
    id: "pet-vet",
    label: "Pet care / veterinary business",
    nav: {
      services: "Pet Care",
      about: "Our Team",
      stories: "Happy Pets",
      visit: "Book",
    },
    primaryCta: "Book a Visit",
    secondaryCta: "View Care",
    sectionBlueprints: {
      home:
        "Lead with warmth, animal trust, owner reassurance, rating, easy booking, and category-specific pet care cards.",
      services:
        "Use cards for grooming, vet visits, wellness exams, vaccines, boarding, training, dental, or retail products as relevant.",
      about:
        "Show team compassion, safety standards, facility, handling style, and love for pets.",
      stories:
        "Use pet-owner testimonials, pet gallery placeholders, transformation/grooming cards, and trust proof.",
      visit:
        "Build booking/intake flow for pet type, service, preferred time, notes, location/hours, phone, and pet-care FAQs.",
    },
    serviceExamples: ["Wellness visits", "Grooming", "Vaccines", "Pet dental care", "Boarding", "Training"],
    proofSignals: ["Owner reviews", "Gentle handling", "Clean facility", "Easy booking", "Pet-specific care"],
    processSteps: ["Choose pet care", "Share pet details", "Visit the team", "Go home happy"],
    imageryDirection: "warm pet portraits, playful detail patterns, clean care rooms or grooming tables, friendly owner moments",
    colorDirection: "pet-friendly warmth: brand colors first, otherwise teal, cream, warm brown, sky blue, coral, or leafy green",
    faqExamples: ["What pets do you see?", "How should I prepare?", "Can I book grooming online?", "Do you handle anxious pets?"],
    avoid: [
      "Do not show human salon or dental service language.",
      "Do not invent veterinary services for non-vet pet businesses.",
      "Do not make the design sterile unless it is clearly clinical.",
    ],
  },
  retail: {
    id: "retail",
    label: "Retail / local shop",
    nav: {
      services: "Shop",
      about: "Our Story",
      stories: "Favorites",
      visit: "Visit",
    },
    primaryCta: "Visit the Shop",
    secondaryCta: "Explore Favorites",
    sectionBlueprints: {
      home:
        "Lead with product discovery, storefront personality, featured collections, local charm, rating, and visit/shop CTA.",
      services:
        "Use collection/category cards, featured products, gift ideas, seasonal picks, services like alterations/design/consultations when relevant.",
      about:
        "Tell the shop story through curation, makers, neighborhood, values, and customer experience.",
      stories:
        "Use customer favorites, product/gallery bento, review cards, styled shelves or product still-life placeholders.",
      visit:
        "Build store visit block, hours, address, phone, pickup/order inquiry, gift/returns FAQs, and contact form.",
    },
    serviceExamples: ["Featured collection", "Seasonal picks", "Gift ideas", "Custom orders", "In-store pickup", "Consultation"],
    proofSignals: ["Curated selection", "Local storefront", "Rating/reviews", "Giftable products", "Helpful service"],
    processSteps: ["Explore collections", "Find the right item", "Visit or inquire", "Bring it home"],
    imageryDirection: "editorial product still life, shelves, packaging, tactile details, storefront warmth",
    colorDirection: "retail editorial: brand colors first, otherwise cream, ink, seasonal accent, soft pastels, or high-contrast boutique neutrals",
    faqExamples: ["What are your hours?", "Do you offer pickup?", "Can I place a custom order?", "What is your return policy?"],
    avoid: [
      "Do not turn every shop into a generic ecommerce SaaS page.",
      "Do not invent nationwide shipping, inventory, or return policies.",
      "Do not ignore the storefront visit path when address is present.",
    ],
  },
  "lodging-travel": {
    id: "lodging-travel",
    label: "Lodging / travel / destination business",
    nav: {
      services: "Stay",
      about: "Experience",
      stories: "Guest Stories",
      visit: "Book",
    },
    primaryCta: "Check Availability",
    secondaryCta: "Explore the Stay",
    sectionBlueprints: {
      home:
        "Lead with destination atmosphere, rooms/experiences, guest comfort, rating, location, and availability CTA.",
      services:
        "Use cards for rooms, suites, amenities, packages, nearby attractions, marina/camp/RV/travel services when relevant.",
      about:
        "Tell the setting story: hospitality, landscape, amenities, local access, and what guests feel during the stay.",
      stories:
        "Use guest testimonials, destination/gallery bento, itinerary cards, sunrise/sunset or amenity placeholders.",
      visit:
        "Build booking/availability block, dates/guests fields, location, amenities FAQs, policies, phone, map, and footer.",
    },
    serviceExamples: ["Rooms or sites", "Amenities", "Packages", "Local experiences", "Group stays", "Guest services"],
    proofSignals: ["Guest rating", "Location", "Amenities", "Availability", "Destination imagery"],
    processSteps: ["Pick dates", "Choose stay type", "Confirm details", "Arrive and unwind"],
    imageryDirection: "destination editorial, landscape or room details, soft resort lighting, immersive full-width gallery",
    colorDirection: "destination calm: brand colors first, otherwise sand, navy, sea blue, forest, cream, or sunset amber",
    faqExamples: ["How do I check availability?", "What amenities are included?", "Is parking available?", "What is nearby?"],
    avoid: [
      "Do not make it feel like a clinic appointment site.",
      "Do not invent amenities, star ratings, or policies.",
      "Do not hide date/guest availability CTAs.",
    ],
  },
  default: {
    id: "default",
    label: "Local business",
    nav: {
      services: "Services",
      about: "About",
      stories: "Reviews",
      visit: "Contact",
    },
    primaryCta: "Get Started",
    secondaryCta: "View Services",
    sectionBlueprints: {
      home:
        "Lead with the business category, strongest customer promise, rating/location/phone when present, and a clear conversion CTA.",
      services:
        "Use category-specific service or offer cards inferred from Google types, source navigation, and page copy. Avoid filler.",
      about:
        "Tell a credible local-business story with differentiators, team/facility/process, and trust-building details.",
      stories:
        "Use review cards, gallery placeholders, project/customer story captions, and aggregate rating proof.",
      visit:
        "Build booking/contact/quote flow appropriate to the category, plus location, hours, phone, FAQs, form, and footer.",
    },
    serviceExamples: ["Core service", "Featured offer", "Consultation", "Booking", "Support", "Custom request"],
    proofSignals: ["Google rating", "Local address", "Customer reviews", "Clear next step", "Category expertise"],
    processSteps: ["Choose what you need", "Share details", "Confirm the next step", "Get helped"],
    imageryDirection: "premium local-business editorial, real customer moments, branded abstract details, no generic stock-photo feel",
    colorDirection: "brand-led local premium: use extracted brand colors first, otherwise choose a palette that fits the category emotion",
    faqExamples: ["How do I get started?", "What areas do you serve?", "How quickly can I book?", "What should I expect?"],
    avoid: [
      "Do not use lorem ipsum or interchangeable local-business copy.",
      "Do not invent unsupported claims.",
      "Do not use the same sections and wording for unrelated business categories.",
    ],
  },
};

const MATCHERS: Array<{ id: StitchWebsiteProfileId; patterns: readonly RegExp[] }> = [
  { id: "dental", patterns: [/dent/i, /orthodont/i, /periodont/i, /endodont/i, /oral[_\s-]?surgeon/i, /teeth/i] },
  { id: "wedding-venue", patterns: [/wedding/i, /event[_\s-]?venue/i, /banquet/i, /reception/i, /venue/i, /ceremony/i] },
  { id: "restaurant", patterns: [/restaurant/i, /cafe/i, /coffee/i, /bakery/i, /bar\b/i, /brewery/i, /meal/i, /pizza/i, /taco/i, /sushi/i, /seafood/i, /catering/i, /food/i] },
  { id: "salon-spa", patterns: [/salon/i, /spa/i, /beauty/i, /hair/i, /nail/i, /barber/i, /lash/i, /brow/i, /massage/i, /tattoo/i, /tanning/i] },
  { id: "home-trades", patterns: [/plumb/i, /electric/i, /roof/i, /hvac/i, /contractor/i, /locksmith/i, /paint/i, /window/i, /glazier/i, /moving/i, /storage/i, /home[_\s-]?improvement/i] },
  { id: "legal-professional", patterns: [/lawyer/i, /attorney/i, /\blaw\b/i, /legal/i, /account/i, /insurance/i, /tax/i, /real[_\s-]?estate/i, /consult/i] },
  { id: "fitness-wellness", patterns: [/gym/i, /fitness/i, /yoga/i, /pilates/i, /wellness/i, /chiropract/i, /physio/i, /therapy/i] },
  { id: "automotive", patterns: [/auto/i, /car/i, /vehicle/i, /tire/i, /towing/i, /detailing/i, /mechanic/i, /dealership/i] },
  { id: "pet-vet", patterns: [/pet/i, /veterinar/i, /\bvet\b/i, /dog/i, /cat/i, /animal/i, /groom/i] },
  { id: "lodging-travel", patterns: [/hotel/i, /lodging/i, /travel/i, /resort/i, /rv[_\s-]?park/i, /camp/i, /tourist/i, /marina/i, /guest/i] },
  { id: "medical", patterns: [/doctor/i, /medical/i, /clinic/i, /hospital/i, /pharmacy/i, /dermatolog/i, /optomet/i, /physician/i, /health/i] },
  { id: "retail", patterns: [/store/i, /shop/i, /retail/i, /florist/i, /jewelry/i, /clothing/i, /furniture/i, /bookstore/i, /gift/i, /hardware/i, /grocery/i, /market/i] },
];

export function selectStitchWebsiteProfile(
  payload: StitchProspectDesignPayload
): StitchWebsiteProfile {
  const haystack = payloadHaystack(payload);
  const match = MATCHERS.find(({ patterns }) => includesAny(haystack, patterns));
  return PROFILES[match?.id ?? "default"];
}

export function buildStitchWebsiteProfileDirective(
  profile: StitchWebsiteProfile,
  hasBrandColors: boolean
): string {
  const navLabels = [
    `#services = "${profile.nav.services}"`,
    `#about = "${profile.nav.about}"`,
    `#stories = "${profile.nav.stories}"`,
    `#visit = "${profile.nav.visit}"`,
  ].join(", ");

  const colorRule = hasBrandColors
    ? "Real extracted brand colors are present, so use those exact colors as the visual foundation. The profile color direction below only describes mood, contrast, and neutrals."
    : `No extracted palette is available, so choose a polished palette from this profile direction: ${profile.colorDirection}.`;

  return `
## Business-specific website blueprint (mandatory)

Selected business profile: **${profile.label}**.

This profile controls the content strategy. Do **not** use the same generic sections and copy you would use for unrelated businesses. Keep the required anchor ids for hosted-preview navigation, but make the visible labels, section content, CTAs, imagery, and proof match this profile.

**Navigation labels:** Home, ${navLabels}. Primary CTA label: "${profile.primaryCta}". Secondary CTA label: "${profile.secondaryCta}".

**Color and mood:** ${colorRule}

**Imagery direction:** ${profile.imageryDirection}.

**Section blueprint using the fixed ids:**
- \`#home\`: ${profile.sectionBlueprints.home}
- \`#services\` (${profile.nav.services}): ${profile.sectionBlueprints.services}
- \`#about\` (${profile.nav.about}): ${profile.sectionBlueprints.about}
- \`#stories\` (${profile.nav.stories}): ${profile.sectionBlueprints.stories}
- \`#visit\` (${profile.nav.visit}): ${profile.sectionBlueprints.visit}

**Service/offer examples to adapt:** ${profile.serviceExamples.join(" | ")}.

**Proof signals to prioritize:** ${profile.proofSignals.join(" | ")}.

**Process/journey labels to adapt:** ${profile.processSteps.join(" → ")}.

**FAQ examples to include or adapt:** ${profile.faqExamples.join(" | ")}.

**Avoid these mistakes:**
${profile.avoid.map((item) => `- ${item}`).join("\n")}

If source-site facts appear above, preserve their real topics and names first, then use this profile to improve structure, polish, and conversion. If the source site conflicts with a profile example, the source site wins.
`.trim();
}
