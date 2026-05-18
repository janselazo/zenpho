export type MetaAdSignal =
  | "RUNNING_HIGH"
  | "RUNNING_LOW"
  | "DORMANT_WITH_PIXEL"
  | "COLD"
  | "UNKNOWN";

export type MetaAdCreative = {
  id: string;
  body: string | null;
  linkTitle: string | null;
  snapshotUrl: string | null;
  startTime: string | null;
  platforms: string[];
};

export type MetaPixelResult = {
  detected: boolean;
  pixelIds: string[];
};

export type MetaAdIntelInput = {
  prospectId?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  businessName?: string;
};

export type MetaAdIntelResponse = {
  pageId: string | null;
  signal: MetaAdSignal;
  adCount: number;
  oldestAdDaysActive: number | null;
  platforms: string[];
  sampleCreatives: MetaAdCreative[];
  pixel: MetaPixelResult;
  outreachAngle: string;
  prospectAdIntelId?: string | null;
  warning?: string;
};
