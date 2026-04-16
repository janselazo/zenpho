import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const company = String(body.company ?? "").trim();
  const message = String(body.message ?? "").trim();
  const projectType = String(body.project_type ?? "").trim();
  const smsConsent = body.sms_consent === true;

  if (!name || !email) {
    return json({ error: "Name and email are required" }, 400);
  }

  try {
    const supabase = createAdminClient();

    const { error: leadErr } = await supabase.from("lead").insert({
      name,
      email,
      phone: phone || null,
      company: company || null,
      source: "Website Contact",
      stage: "new",
      notes: message || null,
      project_type: projectType || null,
      owner_id: null,
      sms_consent: smsConsent,
    });

    if (leadErr) return json({ error: leadErr.message }, 500);

    return json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return json({ error: msg }, 500);
  }
}
