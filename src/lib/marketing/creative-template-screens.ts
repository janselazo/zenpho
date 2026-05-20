/**
 * Screen images for Creatives Generation phone mockups.
 * Drop assets in public/marketing/creatives/ and map them here.
 */
export const CREATIVE_TEMPLATE_SCREENS = {
  ugc: "/marketing/creatives/ugc-realmaya.png",
  claymotion: "/marketing/creatives/claymotion-founder-alex.png",
  productDemo: "/marketing/creatives/product-demo-flux.png",
  motion: "/marketing/creatives/motion-northbloom.png",
  pixar: "/marketing/creatives/pixar-studiokyo.png",
  founderLed: "/marketing/creatives/founder-led-haus-coffee.png",
} as const;

export type CreativeTemplateScreenKey = keyof typeof CREATIVE_TEMPLATE_SCREENS;
