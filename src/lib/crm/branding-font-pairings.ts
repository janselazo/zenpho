/**
 * Font pairings used by the Brand Guidelines PDF generator.
 *
 * Each pairing references two TTF files that live in `public/fonts/brand-book/`.
 * The LLM picks one of these pairing IDs as part of the `BrandingSpec`, so
 * keep this list stable — renaming an ID is a schema break.
 */

export const BRANDING_FONT_PAIRING_IDS = [
  "modern-sans",
  "editorial-serif",
  "classic-serif",
  "playful-geo",
  "luxury-elegant",
  "tech-mono",
] as const;

export type BrandingFontPairingId = (typeof BRANDING_FONT_PAIRING_IDS)[number];

export type BrandingFontPairing = {
  id: BrandingFontPairingId;
  label: string;
  vibe: string;
  displayFamily: string;
  displayFile: string;
  bodyFamily: string;
  bodyFile: string;
};

export const BRANDING_FONT_PAIRINGS: Record<
  BrandingFontPairingId,
  BrandingFontPairing
> = {
  "modern-sans": {
    id: "modern-sans",
    label: "Modern Sans",
    vibe: "Clean, confident, tech / SaaS / D2C.",
    displayFamily: "Inter",
    displayFile: "Inter-Bold.ttf",
    bodyFamily: "Inter",
    bodyFile: "Inter-Regular.ttf",
  },
  "editorial-serif": {
    id: "editorial-serif",
    label: "Editorial Serif",
    vibe: "Magazine, lifestyle, hospitality, approachable premium.",
    displayFamily: "Fraunces",
    displayFile: "Fraunces-Bold.ttf",
    bodyFamily: "Inter",
    bodyFile: "Inter-Regular.ttf",
  },
  "classic-serif": {
    id: "classic-serif",
    label: "Classic Serif",
    vibe: "Traditional, trustworthy, heritage, legal, wellness.",
    displayFamily: "Playfair Display",
    displayFile: "PlayfairDisplay-Bold.ttf",
    bodyFamily: "Source Serif 4",
    bodyFile: "SourceSerif4-Regular.ttf",
  },
  "playful-geo": {
    id: "playful-geo",
    label: "Playful Geometric",
    vibe: "Youthful, creative, gaming, F&B, indie retail.",
    displayFamily: "Space Grotesk",
    displayFile: "SpaceGrotesk-Bold.ttf",
    bodyFamily: "Space Mono",
    bodyFile: "SpaceMono-Regular.ttf",
  },
  "luxury-elegant": {
    id: "luxury-elegant",
    label: "Luxury Elegant",
    vibe: "High-end hospitality, beauty, fashion, fine dining.",
    displayFamily: "Cormorant Garamond",
    displayFile: "CormorantGaramond-Bold.ttf",
    bodyFamily: "Lato",
    bodyFile: "Lato-Regular.ttf",
  },
  "tech-mono": {
    id: "tech-mono",
    label: "Tech Mono",
    vibe: "Dev tools, fintech, infrastructure, engineering brands.",
    displayFamily: "JetBrains Mono",
    displayFile: "JetBrainsMono-Bold.ttf",
    bodyFamily: "Inter",
    bodyFile: "Inter-Regular.ttf",
  },
};

export function getBrandingFontPairing(
  id: string | null | undefined,
): BrandingFontPairing {
  const trimmed = (id ?? "").trim();
  if ((BRANDING_FONT_PAIRING_IDS as readonly string[]).includes(trimmed)) {
    return BRANDING_FONT_PAIRINGS[trimmed as BrandingFontPairingId];
  }
  return BRANDING_FONT_PAIRINGS["modern-sans"];
}
