import { createAdminClient } from "@/lib/supabase/admin";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";

async function markScreenshotFailed(previewId: string, admin: ReturnType<typeof createAdminClient>) {
  await admin
    .from("prospect_preview")
    .update({
      screenshot_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", previewId);
}

/**
 * Fetches a screenshot of the public preview page (Microlink) and optionally re-uploads to Vercel Blob.
 * Safe to fire-and-forget from a server action.
 */
export async function captureProspectPreviewScreenshot(previewId: string): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }

  const pageUrl = prospectPreviewPageUrl(previewId);
  const apiKey = process.env.MICROLINK_API_KEY?.trim();
  const micBase = apiKey ? "https://pro.microlink.io" : "https://api.microlink.io";
  const micUrl = `${micBase}/?url=${encodeURIComponent(pageUrl)}&screenshot=true&meta=false`;

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  let remoteImageUrl: string | null = null;
  try {
    const res = await fetch(micUrl, { headers, signal: AbortSignal.timeout(60_000) });
    const json = (await res.json()) as {
      data?: { screenshot?: { url?: string } };
    };
    remoteImageUrl = json?.data?.screenshot?.url?.trim() || null;
  } catch {
    remoteImageUrl = null;
  }

  if (!remoteImageUrl) {
    await markScreenshotFailed(previewId, admin);
    return;
  }

  let publicImageUrl = remoteImageUrl;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    try {
      const imgRes = await fetch(remoteImageUrl, { signal: AbortSignal.timeout(45_000) });
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = imgRes.headers.get("content-type") ?? "";
        const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : "png";
        const mime = ext === "jpg" ? "image/jpeg" : "image/png";
        const { put } = await import("@vercel/blob");
        const blob = await put(`prospect-previews/${previewId}.${ext}`, buf, {
          access: "public",
          token: blobToken,
          contentType: mime,
        });
        publicImageUrl = blob.url;
      }
    } catch {
      /* keep Microlink URL */
    }
  }

  const { error } = await admin
    .from("prospect_preview")
    .update({
      screenshot_url: publicImageUrl,
      screenshot_status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", previewId);

  if (error) {
    await markScreenshotFailed(previewId, admin);
  }
}
