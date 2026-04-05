import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !UUID_RE.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return new Response("Preview hosting unavailable", { status: 503 });
  }

  const { data, error } = await admin
    .from("prospect_preview")
    .select("html")
    .eq("id", id)
    .maybeSingle();

  if (error || !data?.html?.trim()) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(data.html as string, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
