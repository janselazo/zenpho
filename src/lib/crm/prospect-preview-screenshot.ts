import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMicrolinkScreenshotUrl } from "@/lib/crm/microlink-screenshot";
import { prospectPreviewMicrolinkUrl } from "@/lib/crm/prospect-preview-public-url";

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
 *
 * Uses the UUID preview URL on the primary public app origin so Microlink always hits a stable, public route
 * (not a preview subdomain that may lack DNS or overlap with CRM iframe issues).
 */
export async function captureProspectPreviewScreenshot(previewId: string): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error(
      "[prospectPreview screenshot] Cannot create admin client (set SUPABASE_SERVICE_ROLE_KEY):",
      e,
    );
    return;
  }

  const pageUrl = prospectPreviewMicrolinkUrl(previewId);

  try {
    const remoteImageUrl = await fetchMicrolinkScreenshotUrl(pageUrl);

    if (!remoteImageUrl) {
      console.warn("[prospectPreview screenshot] Microlink returned no image for", pageUrl);
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
      console.error("[prospectPreview screenshot] DB update failed", error.message);
      await markScreenshotFailed(previewId, admin);
    }
  } catch (e) {
    console.error("[prospectPreview screenshot] Unexpected error", e);
    await markScreenshotFailed(previewId, admin);
  }
}
