import { createAdminClient } from "@/lib/supabase/admin";
import { prospectPreviewHtmlResponseHeaders } from "@/lib/crm/prospect-preview-frame-ancestors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Slug segment: letters, numbers, hyphens (from prospectPreviewSlugFromBusiness). */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: segment } = await context.params;
  if (!segment?.trim()) {
    return new Response("Not found", { status: 404 });
  }

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

  const base = admin.from("prospect_preview").select("html");
  const { data, error } = isUuid
    ? await base.eq("id", segment).maybeSingle()
    : await base.eq("slug", segment).maybeSingle();

  if (error || !data?.html?.trim()) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(data.html as string, {
    status: 200,
    headers: prospectPreviewHtmlResponseHeaders(),
  });
}
