import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_IDEAS_BY_INDUSTRY,
  defaultNicheForIndustry,
  isIndustryId,
  isNicheId,
  nicheAllowedForIndustry,
  type IndustryId,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";
import { generateLeadMagnetIdeas } from "@/lib/crm/lead-magnets-generate";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", ideas: [], fallback: false },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json(
      { error: "Forbidden", ideas: [], fallback: false },
      { status: 403 }
    );
  }

  let body: { industryId?: string; nicheId?: string; useFallback?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", ideas: [], fallback: false },
      { status: 400 }
    );
  }

  const industryIdRaw = String(body.industryId ?? "").trim();
  if (!industryIdRaw || industryIdRaw.length > 64 || !isIndustryId(industryIdRaw)) {
    return NextResponse.json(
      { error: "Invalid or missing industryId.", ideas: [], fallback: false },
      { status: 400 }
    );
  }

  const industryId = industryIdRaw as IndustryId;

  const nicheRaw = String(
    body.nicheId ?? defaultNicheForIndustry(industryId)
  ).trim();
  if (!nicheRaw || nicheRaw.length > 64 || !isNicheId(nicheRaw)) {
    return NextResponse.json(
      { error: "Invalid nicheId.", ideas: [], fallback: false },
      { status: 400 }
    );
  }
  const nicheId = nicheRaw as NicheId;
  if (!nicheAllowedForIndustry(nicheId, industryId)) {
    return NextResponse.json(
      { error: "This niche does not apply to the selected industry.", ideas: [], fallback: false },
      { status: 400 }
    );
  }

  const forceFallback = body.useFallback === true;

  if (forceFallback) {
    return NextResponse.json({
      ideas: FALLBACK_IDEAS_BY_INDUSTRY[industryId],
      fallback: true,
      warning: null as string | null,
    });
  }

  const result = await generateLeadMagnetIdeas(industryId, nicheId);

  if (result.ok) {
    return NextResponse.json({
      ideas: result.ideas,
      fallback: false,
      warning: null as string | null,
    });
  }

  if (result.code === "missing_serper" || result.code === "missing_openai") {
    return NextResponse.json(
      {
        error: result.message,
        ideas: FALLBACK_IDEAS_BY_INDUSTRY[industryId],
        fallback: true,
        warning: result.message,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: result.message,
      ideas: FALLBACK_IDEAS_BY_INDUSTRY[industryId],
      fallback: true,
      warning: result.message,
    },
    { status: 502 }
  );
}
