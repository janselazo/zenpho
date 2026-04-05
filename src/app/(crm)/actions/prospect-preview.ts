"use server";

import twilio from "twilio";
import { Resend } from "resend";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

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
