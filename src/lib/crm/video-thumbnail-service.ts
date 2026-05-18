import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentOrganizationId } from "@/lib/organization";
import { isInternalStaffRole } from "@/lib/crm/roles";
import type { MetaAdCreative } from "@/lib/crm/meta-ad-intel-types";
import { generateVideoHookCopy } from "@/lib/crm/prospect-video-hook-llm";
import { generateHiggsfieldThumbnail } from "@/lib/crm/higgsfield-image-gen";

type ThumbnailPitchMode = "meta-ads" | "creatives-generation";

type ThumbnailInput = {
  prospectId?: string;
  prospectAdIntelId?: string;
  businessName?: string;
  googleCategory?: string;
  city?: string;
  websiteScreenshot?: string;
  logoUrl?: string;
  sampleAdCreatives?: unknown[];
  locale?: "en" | "es";
  pitchMode?: ThumbnailPitchMode;
};

type AdIntelRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  prospect_id: string | null;
  sample_creatives: unknown;
};

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string | null;
};

async function requireStaff(): Promise<
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [{ data: profile }, organizationId] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    fetchCurrentOrganizationId(supabase),
  ]);

  if (!isInternalStaffRole(profile?.role, user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, auth: { supabase, userId: user.id, organizationId } };
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseInput(raw: unknown): ThumbnailInput {
  const body =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const locale = body.locale === "es" ? "es" : "en";
  const pitchMode =
    body.pitchMode === "creatives-generation" ? "creatives-generation" : "meta-ads";
  return {
    prospectId: cleanString(body.prospectId),
    prospectAdIntelId: cleanString(body.prospectAdIntelId),
    businessName: cleanString(body.businessName),
    googleCategory: cleanString(body.googleCategory),
    city: cleanString(body.city),
    websiteScreenshot: cleanString(body.websiteScreenshot),
    logoUrl: cleanString(body.logoUrl),
    sampleAdCreatives: Array.isArray(body.sampleAdCreatives)
      ? body.sampleAdCreatives
      : undefined,
    locale,
    pitchMode,
  };
}

function dailyLimit(): number {
  const raw = Number.parseInt(process.env.VIDEO_THUMBNAIL_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 50;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadAdIntel(
  supabase: SupabaseClient,
  id: string | undefined,
): Promise<AdIntelRow | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("prospect_ad_intel")
    .select("id, organization_id, user_id, prospect_id, sample_creatives")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdIntelRow;
}

function normalizeCreatives(raw: unknown): MetaAdCreative[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;
      const platforms = Array.isArray(value.platforms)
        ? value.platforms.filter((p): p is string => typeof p === "string")
        : [];
      return {
        id: String(value.id ?? ""),
        body: cleanString(value.body) ?? null,
        linkTitle: cleanString(value.linkTitle) ?? null,
        snapshotUrl: cleanString(value.snapshotUrl) ?? null,
        startTime: cleanString(value.startTime) ?? null,
        platforms,
      };
    })
    .filter((creative): creative is MetaAdCreative => creative !== null);
}

async function currentDailyCount(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("prospect_video_thumbnail_usage")
    .select("count")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("usage_date", todayIso())
    .maybeSingle();
  return typeof data?.count === "number" ? data.count : 0;
}

async function countExistingGenerations(input: {
  supabase: SupabaseClient;
  prospectId: string | null;
  prospectAdIntelId: string | null;
  userId: string;
  businessName: string;
}): Promise<number> {
  let query = input.supabase
    .from("prospect_video_thumbnails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId);

  if (input.prospectId) {
    query = query.eq("prospect_id", input.prospectId);
  } else if (input.prospectAdIntelId) {
    query = query.eq("prospect_ad_intel_id", input.prospectAdIntelId);
  } else {
    query = query.eq("business_name", input.businessName);
  }

  const { count } = await query;
  return count ?? 0;
}

async function incrementDailyUsage(input: {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
  nextCount: number;
}): Promise<void> {
  const { error } = await input.supabase
    .from("prospect_video_thumbnail_usage")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        usage_date: todayIso(),
        count: input.nextCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id,usage_date" },
    );
  if (error) console.warn("[videoThumbnail] usage update failed:", error.message);
}

function buildThumbnailPrompt(input: {
  businessName: string;
  googleCategory?: string;
  city?: string;
  hookText: string;
  ctaText: string;
  logoUrl?: string;
  websiteScreenshot?: string;
  sampleAdCreatives: MetaAdCreative[];
  pitchMode: ThumbnailPitchMode;
}): string {
  const creativeTone = input.sampleAdCreatives
    .map((creative) => creative.body || creative.linkTitle)
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");

  const industryLine =
    input.pitchMode === "creatives-generation"
      ? `Industry: ${input.googleCategory || "local service business"}. Show authentic ${input.googleCategory || "local business"} visual cues (tools, storefront, team, results) without stock-photo clichés.`
      : `Category: ${input.googleCategory || "local business"}.`;

  const adVoiceLine =
    input.pitchMode === "creatives-generation"
      ? ""
      : `\nExisting ad voice: ${creativeTone || "(none)"}`;

  return `Create a static vertical 9:16 video ad thumbnail for ${input.businessName}.
${industryLine}
Location: ${input.city || "their local market"}.
Overlay copy as clean readable type:
Hook: "${input.hookText}"
CTA: "${input.ctaText}"
Visual style: premium Instagram Reel / TikTok ad frame, subtle motion blur streaks, cinematic depth, clear play button overlay in the center, mobile-first safe margins, high contrast, looks like a paused video reel.
Use the business website/logo reference only for visual inspiration when provided.
Logo URL: ${input.logoUrl || "(none)"}
Website screenshot URL: ${input.websiteScreenshot || "(none)"}${adVoiceLine}
Do not include fake pricing, fake awards, watermarks, extra UI chrome, or misspelled text.`;
}

export async function handleVideoThumbnailRequest(req: Request): Promise<NextResponse> {
  const staff = await requireStaff();
  if (!staff.ok) return staff.response;

  let input: ThumbnailInput;
  try {
    input = parseInput(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessName = input.businessName?.trim();
  if (!businessName) {
    return NextResponse.json({ error: "businessName is required." }, { status: 400 });
  }

  const adIntel = await loadAdIntel(staff.auth.supabase, input.prospectAdIntelId);
  const organizationId = adIntel?.organization_id ?? staff.auth.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization is available for this user." }, { status: 400 });
  }

  const prospectId = input.prospectId ?? adIntel?.prospect_id ?? null;
  const sampleAdCreatives =
    normalizeCreatives(input.sampleAdCreatives).length > 0
      ? normalizeCreatives(input.sampleAdCreatives)
      : normalizeCreatives(adIntel?.sample_creatives);

  const dailyUsed = await currentDailyCount(
    staff.auth.supabase,
    organizationId,
    staff.auth.userId,
  );
  const limit = dailyLimit();
  if (dailyUsed >= limit) {
    return NextResponse.json(
      {
        capped: true,
        error: `Daily video thumbnail limit reached (${limit}).`,
        dailyLimit: limit,
        dailyUsed,
      },
      { status: 429 },
    );
  }

  const existingCount = await countExistingGenerations({
    supabase: staff.auth.supabase,
    prospectId,
    prospectAdIntelId: adIntel?.id ?? input.prospectAdIntelId ?? null,
    userId: staff.auth.userId,
    businessName,
  });
  if (existingCount >= 3) {
    return NextResponse.json(
      {
        capped: true,
        error: "Per-prospect video thumbnail generation limit reached (3).",
        prospectUsed: existingCount,
      },
      { status: 429 },
    );
  }

  const pitchMode = input.pitchMode ?? "meta-ads";

  const copy = await generateVideoHookCopy({
    businessName,
    googleCategory: input.googleCategory,
    city: input.city,
    sampleAdCreatives: pitchMode === "meta-ads" ? sampleAdCreatives : [],
    locale: input.locale,
    pitchMode,
  });
  const prompt = buildThumbnailPrompt({
    businessName,
    googleCategory: input.googleCategory,
    city: input.city,
    hookText: copy.hookText,
    ctaText: copy.ctaText,
    logoUrl: input.logoUrl,
    websiteScreenshot: input.websiteScreenshot,
    sampleAdCreatives: pitchMode === "meta-ads" ? sampleAdCreatives : [],
    pitchMode,
  });

  const image = await generateHiggsfieldThumbnail({ prompt });
  if (!image.ok) {
    return NextResponse.json(
      {
        error: image.error,
        missingKey: image.missingKey ?? false,
        hookText: copy.hookText,
        ctaText: copy.ctaText,
        prompt,
      },
      { status: image.missingKey ? 200 : 502 },
    );
  }

  const generationIndex = existingCount + 1;
  const { data, error } = await staff.auth.supabase
    .from("prospect_video_thumbnails")
    .insert({
      organization_id: organizationId,
      user_id: staff.auth.userId,
      prospect_id: prospectId,
      prospect_ad_intel_id: adIntel?.id ?? input.prospectAdIntelId ?? null,
      business_name: businessName,
      thumbnail_url: image.thumbnailUrl,
      prompt,
      hook_text: copy.hookText,
      cta_text: copy.ctaText,
      hook_lang: input.locale ?? "en",
      generation_index: generationIndex,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[videoThumbnail] thumbnail persistence failed:", error.message);
  }

  await incrementDailyUsage({
    supabase: staff.auth.supabase,
    organizationId,
    userId: staff.auth.userId,
    nextCount: dailyUsed + 1,
  });

  return NextResponse.json({
    thumbnailUrl: image.thumbnailUrl,
    prompt,
    hookText: copy.hookText,
    ctaText: copy.ctaText,
    generationIndex,
    dailyLimit: limit,
    dailyUsed: dailyUsed + 1,
    prospectVideoThumbnailId: typeof data?.id === "string" ? data.id : null,
  });
}
