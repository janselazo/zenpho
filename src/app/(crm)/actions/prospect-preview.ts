"use server";

import twilio from "twilio";
import { Resend } from "resend";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import { isIntegrationSecretsKeyConfigured } from "@/lib/crypto/integration-secrets";
import {
  getAgencyTwilioCredentials,
  getTwilioEnvVarPresence,
} from "@/lib/twilio/agency-credentials";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import {
  findOrCreateEmailConversation,
  insertEmailMessage,
  generateMessageId,
} from "@/lib/crm/conversation-email";
import {
  findOrCreateSmsConversation,
  insertSmsMessage,
} from "@/lib/crm/conversation-sms";
import { getPublicAppOrigin } from "@/lib/crm/prospect-preview-public-url";

function normalizeHttpsImageUrl(raw: string | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t.startsWith("https://") ? t : null;
}

function normalizeOutboundSmsPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function twilioErrorMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "SMS failed.";
  const obj = e as { message?: unknown; code?: unknown; moreInfo?: unknown; status?: unknown };
  const parts = [
    typeof obj.message === "string" ? obj.message : "SMS failed.",
    obj.code ? `Code: ${String(obj.code)}` : "",
    obj.status ? `HTTP: ${String(obj.status)}` : "",
    typeof obj.moreInfo === "string" ? obj.moreInfo : "",
  ].filter(Boolean);
  return parts.join(" ");
}

export type OutreachFileAttachment = {
  name: string;
  base64: string;
  contentType: string;
};

export async function sendProspectPreviewSmsAction(input: {
  previewId: string;
  to: string;
  bodyTemplate: string;
  businessName: string;
  yourName?: string;
  includeMmsImage?: boolean;
  /** Stitch CDN preview; used for MMS when hosted screenshot is not ready yet. */
  stitchPreviewImageUrl?: string;
  /** Extra file attachments (base64). Uploaded to Supabase storage for Twilio MMS. */
  extraAttachments?: OutreachFileAttachment[];
}) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const creds = await getAgencyTwilioCredentials();
  if (!creds) {
    const e = getTwilioEnvVarPresence();
    const missing: string[] = [];
    if (!e.accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!e.authToken) missing.push("TWILIO_AUTH_TOKEN (or TWILIO_SECRET_KEY)");
    if (!e.fromPhone) missing.push("TWILIO_FROM_PHONE");
    if (missing.length > 0) {
      return {
        ok: false as const,
        error: `Twilio env missing on this server: ${missing.join(", ")}. Add them in Vercel → Project → Settings → Environment Variables for Production and/or Preview (match the URL you use), redeploy, or save under Settings → Integrations → Twilio. Logged-in staff can check GET /api/integrations/twilio-env.`,
      };
    }
    const parts: string[] = [];
    if (!isIntegrationSecretsKeyConfigured()) parts.push("INTEGRATION_SECRETS_KEY");
    parts.push("SUPABASE_SERVICE_ROLE_KEY");
    return {
      ok: false as const,
      error: `Twilio env variables are set, but loading credentials failed (database path). Set ${parts.join(" and ")} on the server and redeploy, then save Twilio under Settings → Integrations again. Staff: GET /api/integrations/twilio-env.`,
    };
  }
  if (!creds.fromPhone) {
    return { ok: false as const, error: "Set a From phone number in Twilio integration settings." };
  }
  const toPhone = normalizeOutboundSmsPhone(input.to);
  if (!toPhone) {
    return {
      ok: false as const,
      error: "Enter the recipient phone in a valid SMS format, e.g. +17869070227.",
    };
  }

  const { data: row, error: rowErr } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status, slug")
    .eq("id", input.previewId.trim())
    .maybeSingle();
  if (rowErr) {
    return { ok: false as const, error: "Could not load preview for SMS." };
  }

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
  const statusCallback = `${getPublicAppOrigin()}/api/webhooks/twilio/status`;

  let mediaUrl: string | undefined;
  if (input.includeMmsImage) {
    const screenshotReady =
      row &&
      row.screenshot_status === "ready" &&
      Boolean(row.screenshot_url?.trim().startsWith("https://"));
    const screenshotUrl = row?.screenshot_url?.trim();
    const stitchUrl = normalizeHttpsImageUrl(input.stitchPreviewImageUrl);
    if (screenshotReady && screenshotUrl) {
      mediaUrl = screenshotUrl;
    } else if (stitchUrl) {
      mediaUrl = stitchUrl;
    }
  }

  const allMediaUrls: string[] = [];
  if (mediaUrl) allMediaUrls.push(mediaUrl);

  if (input.extraAttachments?.length) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    for (const att of input.extraAttachments.slice(0, 9)) {
      try {
        const buf = Buffer.from(att.base64, "base64");
        const ext = att.name.split(".").pop() ?? "bin";
        const path = `outreach/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await admin.storage
          .from("prospect-attachments")
          .upload(path, buf, { contentType: att.contentType, upsert: false });
        if (upErr) continue;
        const { data: { publicUrl } } = admin.storage.from("prospect-attachments").getPublicUrl(path);
        if (publicUrl) allMediaUrls.push(publicUrl);
      } catch { /* skip failed upload */ }
    }
  }

  try {
    const smsResult = await client.messages.create({
      from: creds.fromPhone,
      to: toPhone,
      body,
      statusCallback,
      ...(allMediaUrls.length ? { mediaUrl: allMediaUrls.slice(0, 10) } : {}),
    });
    await logProspectSmsToConversation(auth.supabase, {
      to: toPhone,
      businessName: input.businessName,
      body,
      smsSid: smsResult.sid,
      senderName: input.yourName ?? "You",
    });
    return {
      ok: true as const,
      sid: smsResult.sid,
      status: smsResult.status,
      to: toPhone,
      warning:
        smsResult.status === "queued" || smsResult.status === "accepted"
          ? "Twilio accepted the SMS. Final carrier delivery can still fail later; check Twilio logs if the prospect does not receive it."
          : undefined,
    };
  } catch (e) {
    const hasMedia = allMediaUrls.length > 0;
    const noMms =
      hasMedia &&
      e &&
      typeof e === "object" &&
      "message" in e &&
      String((e as { message: string }).message).toLowerCase().includes("media");
    if (noMms) {
      try {
        const smsRetry = await client.messages.create({
          from: creds.fromPhone,
          to: toPhone,
          body,
          statusCallback,
        });
        await logProspectSmsToConversation(auth.supabase, {
          to: toPhone,
          businessName: input.businessName,
          body,
          smsSid: smsRetry.sid,
          senderName: input.yourName ?? "You",
        });
        return {
          ok: true as const,
          sid: smsRetry.sid,
          status: smsRetry.status,
          to: toPhone,
          warning: `MMS failed; sent SMS with link only. Twilio SID ${smsRetry.sid}, status ${smsRetry.status}.`,
        };
      } catch (e2) {
        return { ok: false as const, error: twilioErrorMessage(e2) };
      }
    }
    return { ok: false as const, error: twilioErrorMessage(e) };
  }
}

export async function sendProspectPreviewEmailAction(input: {
  previewId: string;
  to: string;
  subjectTemplate: string;
  bodyTemplate: string;
  businessName: string;
  yourName?: string;
  /** Stitch CDN preview; inlined when hosted screenshot is not ready yet. */
  stitchPreviewImageUrl?: string;
  /** Extra file attachments (base64) sent as email attachments. */
  extraAttachments?: OutreachFileAttachment[];
}) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const { data: prevRow, error: prevRowErr } = await auth.supabase
    .from("prospect_preview")
    .select("slug, screenshot_url, screenshot_status")
    .eq("id", input.previewId.trim())
    .maybeSingle();
  if (prevRowErr) {
    return { ok: false as const, error: "Could not load preview for email." };
  }

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

  const stitchImg = normalizeHttpsImageUrl(input.stitchPreviewImageUrl);
  if (!previewImageHtml && stitchImg) {
    try {
      const imgRes = await fetch(stitchImg, { signal: AbortSignal.timeout(25_000) });
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = (imgRes.headers.get("content-type") ?? "").toLowerCase();
        const isJpeg = ct.includes("jpeg") || ct.includes("jpg");
        const filename = isJpeg ? "stitch-preview.jpg" : "stitch-preview.png";
        const contentType = isJpeg ? "image/jpeg" : "image/png";
        const contentId = "prospect_preview_img";
        attachments = [{ filename, content: buf, contentType, contentId }];
        previewImageHtml = `<p><img src="cid:${contentId}" alt="Concept preview" style="max-width:100%;height:auto;border-radius:8px;" /></p>`;
      }
    } catch {
      previewImageHtml = "";
    }
  }
  if (!previewImageHtml && stitchImg) {
    previewImageHtml = `<p><img src="${stitchImg}" alt="Concept preview" style="max-width:100%;height:auto;border-radius:8px;" /></p>`;
  }

  if (input.extraAttachments?.length) {
    for (const att of input.extraAttachments) {
      const buf = Buffer.from(att.base64, "base64");
      attachments = attachments ?? [];
      attachments.push({
        filename: att.name,
        content: buf,
        contentType: att.contentType,
      });
    }
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
      attachments?.map((a) => {
        const hasCid = Boolean(a.contentId?.trim());
        return {
          contentBase64: a.content.toString("base64"),
          filename: a.filename,
          type: a.contentType ?? "application/octet-stream",
          disposition: hasCid ? ("inline" as const) : ("attachment" as const),
          ...(hasCid ? { contentId: a.contentId } : {}),
        };
      }) ?? [];

    const emailMid = generateMessageId(
      sendGridCreds.fromEmail.split("@")[1] ?? "zenpho.com"
    );

    const sent = await sendSendGridMail({
      apiKey: sendGridCreds.apiKey,
      to: input.to.trim(),
      from: { email: sendGridCreds.fromEmail, name: sendGridCreds.fromName },
      replyTo: sendGridCreds.replyTo,
      subject: subj,
      text: plainText,
      html: htmlBody,
      headers: { "Message-ID": emailMid },
      ...(sgAttachments.length ? { attachments: sgAttachments } : {}),
    });
    if (!sent.ok) {
      return { ok: false as const, error: sent.error };
    }

    await logProspectEmailToConversation(auth.supabase, {
      to: input.to.trim(),
      businessName: input.businessName,
      subject: subj,
      body: textBody,
      emailMessageId: emailMid,
      senderName: input.yourName ?? "You",
    });
    return { ok: true as const, emailChannel: "sendgrid" as const };
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

  const emailMid = generateMessageId(resendFrom.split("@")[1] ?? "zenpho.com");

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: resendFrom,
    to: input.to.trim(),
    subject: subj,
    html: htmlBody,
    text: plainText,
    headers: { "Message-ID": emailMid },
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await logProspectEmailToConversation(auth.supabase, {
    to: input.to.trim(),
    businessName: input.businessName,
    subject: subj,
    body: textBody,
    emailMessageId: emailMid,
    senderName: input.yourName ?? "You",
  });
  return { ok: true as const, emailChannel: "resend" as const };
}

async function logProspectEmailToConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  opts: {
    to: string;
    businessName: string;
    subject: string;
    body: string;
    emailMessageId: string;
    senderName: string;
  }
) {
  try {
    const { conversationId } = await findOrCreateEmailConversation(supabase, {
      contactEmail: opts.to,
      contactName: opts.businessName || opts.to,
    });

    await insertEmailMessage(supabase, {
      conversationId,
      direction: "outbound",
      body: opts.body,
      senderName: opts.senderName,
      emailSubject: opts.subject,
      emailMessageId: opts.emailMessageId,
    });
  } catch {
    // Non-blocking: email was sent, conversation logging is best-effort
  }
}

async function logProspectSmsToConversation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  opts: {
    to: string;
    businessName: string;
    body: string;
    smsSid: string;
    senderName: string;
  }
) {
  try {
    const { conversationId } = await findOrCreateSmsConversation(supabase, {
      contactPhone: opts.to,
      contactName: opts.businessName || opts.to,
    });

    await insertSmsMessage(supabase, {
      conversationId,
      direction: "outbound",
      body: opts.body,
      senderName: opts.senderName,
      smsSid: opts.smsSid,
    });
  } catch {
    // Non-blocking: SMS was sent, conversation logging is best-effort
  }
}
