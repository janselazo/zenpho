import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "prospect-attachments";
/** Brand book + funnel PDFs embed many rasters (50MB cap; raise in Dashboard if Storage rejects below this). */
const BRANDING_FUNNEL_MAX_BYTES = 50 * 1024 * 1024;

function safePdfName(filename: string | null | undefined): string {
  const safe =
    (filename ?? "brand-kit-funnel.pdf")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "brand-kit-funnel.pdf";
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

export async function uploadBrandingFunnelPdf(params: {
  bytes: Buffer;
  filename?: string | null;
  leadId?: string | null;
  userId?: string | null;
}): Promise<
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: string }
> {
  if (params.bytes.length < 100) {
    return { ok: false, error: "PDF payload too small." };
  }
  if (params.bytes.length > BRANDING_FUNNEL_MAX_BYTES) {
    const got = (params.bytes.length / (1024 * 1024)).toFixed(1);
    const max = (BRANDING_FUNNEL_MAX_BYTES / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      error: `PDF is too large to store (${got}MB; max ${max}MB). Reduce images in the brand book or raise Storage limits.`,
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Server storage is not configured (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const ownerSegment = params.leadId?.trim()
    ? params.leadId.trim()
    : `draft/${params.userId?.trim() || "unknown"}`;
  const filename = safePdfName(params.filename);
  const path = `branding-funnel/${ownerSegment}/${Date.now()}-${filename}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, params.bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) return { ok: false, error: error.message || "Upload failed." };

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, path, publicUrl };
}

export function publicBrandingFunnelPdfUrl(path: string): string {
  const admin = createAdminClient();
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
