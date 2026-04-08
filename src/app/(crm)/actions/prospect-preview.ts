"use server";

import twilio from "twilio";
import { Resend } from "resend";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";
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
    return {
      ok: false as const,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (or TWILIO_SECRET_KEY), and TWILIO_FROM_PHONE on the host that runs this action — e.g. .env.local then restart npm run dev locally, or Vercel → Environment Variables for Production/Preview then redeploy — or save credentials under Settings → Integrations → Twilio.",
    };
  }
  if (!creds.fromPhone) {
    return { ok: false as const, error: "Set a From phone number in Twilio integration settings." };
  }

  const { data: row } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status, slug")
    .eq("id", input.previewId.trim())
    .maybeSingle();

  const previewUrl = prospectPreviewPageUrl(
    input.previewId.trim(),
    row?.slug?.trim() || null,
  );
  const body = mergeProspectOutreachTemplate(input.bodyTemplate, {
    previewUrl,
    businessName: input.businessName,
    yourName: input.yourName,
  });

  const client = twilio(creds.accountSid, creds.authToken);

  let mediaUrl: string | undefined;
  if (input.includeMmsImage && row) {
    const u = row.screenshot_url?.trim();
    if (row.screenshot_status === "ready" && u?.startsWith("https://")) {
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

  const { data: prevRow } = await auth.supabase
    .from("prospect_preview")
    .select("slug, screenshot_url, screenshot_status")
    .eq("id", input.previewId.trim())
    .maybeSingle();

  const previewUrl = prospectPreviewPageUrl(
    input.previewId.trim(),
    prevRow?.slug?.trim() || null,
  );
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

  const img = prevRow?.screenshot_url?.trim();
  const hasImg =
    prevRow?.screenshot_status === "ready" && img?.startsWith("https://");

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

  const plainText = `${textBody}\n\n${previewUrl}`;

  const sendGridCreds = await getAgencySendGridCredentials();
  if (sendGridCreds) {
    const sgAttachments =
      attachments?.map((a) => ({
        contentBase64: a.content.toString("base64"),
        filename: a.filename,
        type: a.contentType ?? "application/octet-stream",
        disposition: "inline" as const,
        contentId: a.contentId,
      })) ?? [];

    const sent = await sendSendGridMail({
      apiKey: sendGridCreds.apiKey,
      to: input.to.trim(),
      from: { email: sendGridCreds.fromEmail, name: sendGridCreds.fromName },
      replyTo: sendGridCreds.replyTo,
      subject: subj,
      text: plainText,
      html: htmlBody,
      ...(sgAttachments.length ? { attachments: sgAttachments } : {}),
    });
    if (!sent.ok) {
      return { ok: false as const, error: sent.error };
    }
    return { ok: true as const };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey) {
    return {
      ok: false as const,
      error:
        "No email provider configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, or RESEND_API_KEY and RESEND_FROM_EMAIL, or add SendGrid under Settings → Integrations.",
    };
  }
  if (!resendFrom) {
    return {
      ok: false as const,
      error:
        "Set RESEND_FROM_EMAIL on the server, or set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, or configure SendGrid in Settings → Integrations.",
    };
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: resendFrom,
    to: input.to.trim(),
    subject: subj,
    html: htmlBody,
    text: plainText,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
