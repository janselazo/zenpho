"use server";

import twilio from "twilio";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { generateProspectPreviewDocument } from "@/lib/crm/prospect-preview-generate";
import { captureProspectPreviewScreenshot } from "@/lib/crm/prospect-preview-screenshot";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";

async function requireAgencyStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase: null, user: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (role !== "agency_admin" && role !== "agency_member") {
    return { error: "Forbidden" as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

export type GenerateProspectPreviewPayload =
  | { kind: "place"; place: PlacesSearchPlace }
  | { kind: "url"; url: string; pageTitle: string | null };

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function normalizePlaceForPreview(place: PlacesSearchPlace) {
  const name = safeTrim(place.name) || "Business";
  const types = Array.isArray(place.types)
    ? place.types.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id: safeTrim(place.id) || "unknown",
    name,
    formattedAddress:
      place.formattedAddress == null
        ? null
        : typeof place.formattedAddress === "string"
          ? place.formattedAddress.trim() || null
          : null,
    websiteUri:
      place.websiteUri == null
        ? null
        : typeof place.websiteUri === "string"
          ? place.websiteUri.trim() || null
          : null,
    types,
    nationalPhoneNumber:
      place.nationalPhoneNumber == null
        ? null
        : typeof place.nationalPhoneNumber === "string"
          ? place.nationalPhoneNumber.trim() || null
          : null,
    internationalPhoneNumber:
      place.internationalPhoneNumber == null
        ? null
        : typeof place.internationalPhoneNumber === "string"
          ? place.internationalPhoneNumber.trim() || null
          : null,
    googleMapsUri:
      place.googleMapsUri == null
        ? null
        : typeof place.googleMapsUri === "string"
          ? place.googleMapsUri.trim() || null
          : null,
    businessStatus:
      place.businessStatus == null
        ? null
        : typeof place.businessStatus === "string"
          ? place.businessStatus.trim() || null
          : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : null,
  };
}

export async function generateProspectPreviewAction(
  payload: GenerateProspectPreviewPayload,
): Promise<
  | { ok: true; previewId: string; previewUrl: string; businessName: string; screenshotStatus: string; screenshotUrl: string | null }
  | { ok: false; error: string }
> {
  try {
    return await runGenerateProspectPreview(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview generation failed unexpectedly.";
    console.error("[generateProspectPreviewAction]", e);
    return { ok: false as const, error: msg };
  }
}

async function runGenerateProspectPreview(
  payload: GenerateProspectPreviewPayload,
): Promise<
  | { ok: true; previewId: string; previewUrl: string; businessName: string; screenshotStatus: string; screenshotUrl: string | null }
  | { ok: false; error: string }
> {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  if (payload.kind === "url" && !safeTrim(payload.url)) {
    return { ok: false as const, error: "Missing website URL for preview." };
  }

  const input =
    payload.kind === "place"
      ? (() => {
          const p = normalizePlaceForPreview(payload.place);
          return {
            businessName: p.name.trim() || "Business",
            businessAddress: p.formattedAddress,
            primaryCategory: primaryPlaceTypeLabel(p.types),
            websiteUrl: p.websiteUri,
            listingPhone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
            placeGoogleId: p.id,
          };
        })()
      : (() => {
          const url = safeTrim(payload.url);
          let host = "";
          try {
            host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
              .hostname.replace(/^www\./i, "");
          } catch {
            host = "";
          }
          const title =
            typeof payload.pageTitle === "string"
              ? payload.pageTitle.trim().slice(0, 200)
              : "";
          return {
            businessName: title || host || "Website preview",
            businessAddress: null as string | null,
            primaryCategory: null as string | null,
            websiteUrl: url,
            listingPhone: null as string | null,
            placeGoogleId: null as string | null,
          };
        })();

  const gen = await generateProspectPreviewDocument({
    businessName: input.businessName,
    businessAddress: input.businessAddress,
    primaryCategory: input.primaryCategory,
    websiteUrl: input.websiteUrl,
    listingPhone: input.listingPhone,
  });

  if (!gen.ok) {
    return { ok: false as const, error: gen.error };
  }

  const { data: row, error } = await auth.supabase
    .from("prospect_preview")
    .insert({
      user_id: auth.user.id,
      html: gen.html,
      place_google_id: input.placeGoogleId,
      business_name: input.businessName,
      business_address: input.businessAddress,
      primary_category: input.primaryCategory,
      screenshot_status: "pending",
    })
    .select("id, business_name, screenshot_status, screenshot_url")
    .single();

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        ok: false as const,
        error:
          "Preview storage missing. Apply migration supabase/migrations/20260506120000_prospect_preview_lead_category.sql.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  const id = row?.id as string | undefined;
  if (!id) {
    return {
      ok: false as const,
      error: "Could not save preview (database returned no id).",
    };
  }
  void captureProspectPreviewScreenshot(id).catch(() => {
    /* logged in screenshot helper path */
  });

  return {
    ok: true as const,
    previewId: id,
    previewUrl: prospectPreviewPageUrl(id),
    businessName: (row.business_name as string) || input.businessName,
    screenshotStatus: row.screenshot_status as string,
    screenshotUrl: (row.screenshot_url as string | null) ?? null,
  };
}

export async function getProspectPreviewStatusAction(previewId: string) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  const id = previewId.trim();
  if (!id) return { ok: false as const, error: "Missing preview id." };

  const { data, error } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status, business_name")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Preview not found." };

  return {
    ok: true as const,
    screenshotUrl: data.screenshot_url as string | null,
    screenshotStatus: data.screenshot_status as string,
    businessName: data.business_name as string,
    previewUrl: prospectPreviewPageUrl(id),
  };
}

export async function sendProspectPreviewSmsAction(input: {
  previewId: string;
  to: string;
  bodyTemplate: string;
  businessName: string;
  yourName?: string;
  includeMmsImage?: boolean;
}) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const creds = await getAgencyTwilioCredentials();
  if (!creds) {
    return { ok: false as const, error: "Twilio is not configured (service role + integration)." };
  }
  if (!creds.fromPhone) {
    return { ok: false as const, error: "Set a From phone number in Twilio integration settings." };
  }

  const previewUrl = prospectPreviewPageUrl(input.previewId.trim());
  const body = mergeProspectOutreachTemplate(input.bodyTemplate, {
    previewUrl,
    businessName: input.businessName,
    yourName: input.yourName,
  });

  const client = twilio(creds.accountSid, creds.authToken);

  let mediaUrl: string | undefined;
  if (input.includeMmsImage && auth.supabase) {
    const { data: shot } = await auth.supabase
      .from("prospect_preview")
      .select("screenshot_url, screenshot_status")
      .eq("id", input.previewId.trim())
      .maybeSingle();
    const u = shot?.screenshot_url?.trim();
    if (shot?.screenshot_status === "ready" && u?.startsWith("https://")) {
      mediaUrl = u;
    }
  }

  try {
    await client.messages.create({
      from: creds.fromPhone,
      to: input.to.trim(),
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });
    return { ok: true as const };
  } catch (e) {
    const noMms =
      mediaUrl &&
      e &&
      typeof e === "object" &&
      "message" in e &&
      String((e as { message: string }).message).toLowerCase().includes("media");
    if (noMms) {
      try {
        await client.messages.create({
          from: creds.fromPhone,
          to: input.to.trim(),
          body,
        });
        return { ok: true as const, warning: "MMS failed; sent SMS with link only." };
      } catch (e2) {
        const msg =
          e2 && typeof e2 === "object" && "message" in e2
            ? String((e2 as { message: string }).message)
            : "SMS failed.";
        return { ok: false as const, error: msg };
      }
    }
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "SMS failed.";
    return { ok: false as const, error: msg };
  }
}

export async function sendProspectPreviewEmailAction(input: {
  previewId: string;
  to: string;
  subjectTemplate: string;
  bodyTemplate: string;
  businessName: string;
  yourName?: string;
}) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false as const, error: "RESEND_API_KEY is not configured." };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    return {
      ok: false as const,
      error: "Set RESEND_FROM_EMAIL (e.g. onboarding@resend.dev or your verified domain).",
    };
  }

  const previewUrl = prospectPreviewPageUrl(input.previewId.trim());
  const subj = mergeProspectOutreachTemplate(input.subjectTemplate, {
    previewUrl,
    businessName: input.businessName,
    yourName: input.yourName,
  });
  const textBody = mergeProspectOutreachTemplate(input.bodyTemplate, {
    previewUrl,
    businessName: input.businessName,
    yourName: input.yourName,
  });

  const { data: shot } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status")
    .eq("id", input.previewId.trim())
    .maybeSingle();

  const img = shot?.screenshot_url?.trim();
  const hasImg = shot?.screenshot_status === "ready" && img?.startsWith("https://");

  let previewImageHtml = "";
  let attachments:
    | { filename: string; content: Buffer; contentType?: string; contentId?: string }[]
    | undefined;

  if (hasImg && img) {
    try {
      const imgRes = await fetch(img, { signal: AbortSignal.timeout(25_000) });
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = (imgRes.headers.get("content-type") ?? "").toLowerCase();
        const isJpeg = ct.includes("jpeg") || ct.includes("jpg");
        const filename = isJpeg ? "preview.jpg" : "preview.png";
        const contentType = isJpeg ? "image/jpeg" : "image/png";
        const contentId = "prospect_preview_img";
        attachments = [{ filename, content: buf, contentType, contentId }];
        previewImageHtml = `<p><img src="cid:${contentId}" alt="Site preview" style="max-width:100%;height:auto;border-radius:8px;" /></p>`;
      }
    } catch {
      previewImageHtml = "";
    }
  }
  if (!previewImageHtml && hasImg && img) {
    previewImageHtml = `<p><img src="${img}" alt="Preview" style="max-width:100%;height:auto;border-radius:8px;" /></p>`;
  }

  const htmlBody = `
<p>${textBody.replace(/\n/g, "<br/>")}</p>
<p><a href="${previewUrl}">Open preview</a></p>
${previewImageHtml}
`.trim();

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to.trim(),
    subject: subj,
    html: htmlBody,
    text: `${textBody}\n\n${previewUrl}`,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
