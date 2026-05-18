export type MetaAdIntelTemplateInput = {
  videoThumbnailUrl?: string | null;
  adCount?: number | null;
  hookText?: string | null;
  ctaText?: string | null;
  businessName?: string | null;
  yourName?: string | null;
};

export type MetaAdIntelTemplate = {
  id: string;
  label: string;
  locale: "en" | "es";
  channel: "email" | "sms" | "whatsapp" | "instagram" | "facebook";
  subject?: string;
  body: string;
};

export const META_AD_INTEL_TEMPLATES: MetaAdIntelTemplate[] = [
  {
    id: "video-ads-email-en",
    label: "Video ads email",
    locale: "en",
    channel: "email",
    subject: "Video ad idea for {{businessName}}",
    body:
      "Hi {{businessName}}, I noticed your Meta ads signal and drafted a quick video ad angle: {{hookText}}.\n\nThe CTA would be: {{ctaText}}.\n\n{{videoThumbnailUrl}}\n\nIf useful, I can turn this into a few short-form ad concepts for testing.\n\n{{yourName}}",
  },
  {
    id: "video-ads-sms-en",
    label: "Video ads SMS",
    locale: "en",
    channel: "sms",
    body:
      "Quick idea for {{businessName}}: a short video ad around \"{{hookText}}\" with CTA \"{{ctaText}}\". {{videoThumbnailUrl}}",
  },
  {
    id: "video-ads-email-es",
    label: "Email de video ads",
    locale: "es",
    channel: "email",
    subject: "Idea de video ad para {{businessName}}",
    body:
      "Hola {{businessName}}, vi una oportunidad en Meta Ads y prepare una idea rapida de video: {{hookText}}.\n\nCTA sugerido: {{ctaText}}.\n\n{{videoThumbnailUrl}}\n\nSi te interesa, puedo convertir esto en varios conceptos cortos para probar.\n\n{{yourName}}",
  },
  {
    id: "video-ads-whatsapp-es",
    label: "WhatsApp video ads",
    locale: "es",
    channel: "whatsapp",
    body:
      "Idea rapida para {{businessName}}: un video ad con el hook \"{{hookText}}\" y CTA \"{{ctaText}}\". {{videoThumbnailUrl}}",
  },
  {
    id: "video-ads-instagram-en",
    label: "Instagram DM",
    locale: "en",
    channel: "instagram",
    body:
      "I mocked up a short video ad angle for {{businessName}}: \"{{hookText}}\". CTA: {{ctaText}}. {{videoThumbnailUrl}}",
  },
  {
    id: "video-ads-facebook-en",
    label: "Facebook DM",
    locale: "en",
    channel: "facebook",
    body:
      "Saw a paid media opportunity for {{businessName}} and drafted a video hook: \"{{hookText}}\". {{videoThumbnailUrl}}",
  },
];

export function mergeMetaAdIntelTemplate(
  template: string,
  input: MetaAdIntelTemplateInput,
): string {
  const values: Record<string, string> = {
    videoThumbnailUrl: input.videoThumbnailUrl?.trim() || "",
    adCount: typeof input.adCount === "number" ? String(input.adCount) : "0",
    hookText: input.hookText?.trim() || "a stronger video hook",
    ctaText: input.ctaText?.trim() || "Book now",
    businessName: input.businessName?.trim() || "your business",
    yourName: input.yourName?.trim() || "",
  };

  return template
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
