/**
 * SendGrid v3 Mail Send via HTTP (no extra dependency).
 * @see https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
export type SendGridAttachment = {
  contentBase64: string;
  filename: string;
  type: string;
  disposition: "inline" | "attachment";
  contentId?: string;
};

export async function sendSendGridMail(opts: {
  apiKey: string;
  to: string;
  from: { email: string; name?: string | null };
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
  attachments?: SendGridAttachment[];
  /** Custom headers for email threading (Message-ID, In-Reply-To, References). */
  headers?: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: opts.to.trim() }] }],
    from: opts.from.name?.trim()
      ? { email: opts.from.email.trim(), name: opts.from.name.trim() }
      : { email: opts.from.email.trim() },
    subject: opts.subject,
    content: [
      { type: "text/plain", value: opts.text },
      { type: "text/html", value: opts.html },
    ],
  };

  if (opts.replyTo?.trim()) {
    payload.reply_to = { email: opts.replyTo.trim() };
  }

  if (opts.headers && Object.keys(opts.headers).length > 0) {
    payload.headers = opts.headers;
  }

  if (opts.attachments?.length) {
    payload.attachments = opts.attachments.map((a) => ({
      content: a.contentBase64,
      filename: a.filename,
      type: a.type,
      disposition: a.disposition,
      ...(a.contentId ? { content_id: a.contentId } : {}),
    }));
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) return { ok: true };
  let errText = await res.text();
  try {
    const j = JSON.parse(errText) as { errors?: { message?: string }[] };
    if (j.errors?.length) {
      errText = j.errors.map((e) => e.message).filter(Boolean).join("; ") || errText;
    }
  } catch {
    /* keep errText */
  }
  return { ok: false, error: errText.slice(0, 500) || `SendGrid HTTP ${res.status}` };
}
