import { createAdminClient } from "@/lib/supabase/admin";
import { prospectPreviewHtmlResponseHeaders } from "@/lib/crm/prospect-preview-frame-ancestors";
import {
  injectProspectPreviewFooterLinkStyles,
  repairWebAppDashboardNavigation,
  sanitizeProspectPreviewFullDocumentHtml,
  type ProspectPreviewSectionMeta,
} from "@/lib/crm/prospect-preview-sanitize";
import { buildMobilePreviewFrameDocument } from "@/lib/crm/prospect-preview-mobile-frame";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Slug segment: letters, numbers, hyphens (from prospectPreviewSlugFromBusiness). */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: segment } = await context.params;
  if (!segment?.trim()) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const rawHtml = url.searchParams.get("raw") === "1";

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return new Response("Preview hosting unavailable", { status: 503 });
  }

  const isUuid = UUID_RE.test(segment);
  const isSlug = SLUG_RE.test(segment) && !isUuid;

  if (!isUuid && !isSlug) {
    return new Response("Not found", { status: 404 });
  }

  const base = admin
    .from("prospect_preview")
    .select(
      "id, html, preview_device_type, business_name, business_address, primary_category",
    );
  const { data, error } = isUuid
    ? await base.eq("id", segment).maybeSingle()
    : await base.eq("slug", segment).maybeSingle();

  if (error || !data?.html?.trim()) {
    return new Response("Not found", { status: 404 });
  }

  // Lazy self-heal for previously stored web-app dashboards whose sidebar
  // links pointed at non-existent panels. The repair is gated by structural
  // heuristics inside `repairWebAppDashboardNavigation`, so it is a no-op for
  // marketing-style previews.
  let storedHtml = data.html as string;
  const looksLikeWebAppShell =
    /<(nav|aside)\b[^>]*>/i.test(storedHtml) &&
    /<a\b[^>]*\bhref=["']#/i.test(storedHtml);
  const alreadyRepaired = /\bclass=["'][^"']*\bpage\b[^"']*["']/i.test(storedHtml);
  if (looksLikeWebAppShell && !alreadyRepaired) {
    try {
      const meta: ProspectPreviewSectionMeta = {
        businessName:
          typeof data.business_name === "string" ? data.business_name : null,
        businessAddress:
          typeof data.business_address === "string" ? data.business_address : null,
        primaryCategory:
          typeof data.primary_category === "string" ? data.primary_category : null,
      };
      const repaired = repairWebAppDashboardNavigation(storedHtml, meta);
      if (repaired !== storedHtml) {
        const sanitized = sanitizeProspectPreviewFullDocumentHtml(repaired);
        storedHtml = sanitized;
        const rowId =
          typeof data.id === "string" && data.id.trim()
            ? data.id
            : isUuid
              ? segment
              : null;
        if (rowId) {
          void admin
            .from("prospect_preview")
            .update({ html: sanitized })
            .eq("id", rowId)
            .then(
              () => undefined,
              () => undefined,
            );
        }
      }
    } catch {
      // Self-heal is best-effort; fall back to serving the original html.
    }
  }

  const htmlOut = injectProspectPreviewFooterLinkStyles(storedHtml);

  const deviceType =
    typeof data.preview_device_type === "string" ? data.preview_device_type.trim() : "";

  if (!rawHtml && deviceType === "MOBILE") {
    const inner = new URL(url.pathname, url.origin);
    inner.searchParams.set("raw", "1");
    const framed = buildMobilePreviewFrameDocument(inner.toString());
    return new Response(framed, {
      status: 200,
      headers: prospectPreviewHtmlResponseHeaders(),
    });
  }

  return new Response(htmlOut, {
    status: 200,
    headers: prospectPreviewHtmlResponseHeaders(),
  });
}
