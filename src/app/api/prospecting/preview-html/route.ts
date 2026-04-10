import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { createAdminClient } from "@/lib/supabase/admin";
import { injectProspectPreviewFooterLinkStyles } from "@/lib/crm/prospect-preview-sanitize";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Staff-only: HTML body for in-browser scroll video (same injection as public /preview/[id]). */
export async function GET(request: Request) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    const status = auth.error === "Forbidden" ? 403 : 401;
    return NextResponse.json(
      { ok: false as const, error: auth.error ?? "Unauthorized" },
      { status },
    );
  }

  const previewId = new URL(request.url).searchParams.get("previewId")?.trim() ?? "";
  if (!previewId || !UUID_RE.test(previewId)) {
    return NextResponse.json({ ok: false as const, error: "Invalid previewId." }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Preview hosting unavailable." },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("prospect_preview")
    .select("html, preview_device_type")
    .eq("id", previewId)
    .maybeSingle();

  if (error || !data?.html?.trim()) {
    return NextResponse.json({ ok: false as const, error: "Preview not found." }, { status: 404 });
  }

  const html = injectProspectPreviewFooterLinkStyles(data.html as string);
  const raw = data.preview_device_type;
  const deviceType =
    raw === "MOBILE" || raw === "DESKTOP" ? raw : null;

  return NextResponse.json({
    ok: true as const,
    html,
    deviceType,
  });
}
