import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function buildLeadNotes(payload: Record<string, unknown>): string {
  const what = str(payload.what_building);
  const whom = str(payload.product_for);
  const validation = str(payload.validation_notes);
  const help = str(payload.help_needed);
  const timeline = str(payload.timeline);
  const budget = str(payload.budget_range);
  const extra = str(payload.notes_extra);
  const web = str(payload.website_linkedin);

  const parts: string[] = [];
  if (what) parts.push(`Business goals / what to improve:\n${what}`);
  if (whom) parts.push(`Service area & ideal customer:\n${whom}`);
  if (validation)
    parts.push(`Current marketing, CRM, or tracking:\n${validation}`);
  if (help)
    parts.push(`Interest:\n${help}`);
  if (timeline) parts.push(`Timeline:\n${timeline}`);
  if (budget) parts.push(`Budget / investment range:\n${budget}`);
  if (web) parts.push(`Website or social:\n${web}`);
  if (extra) parts.push(`Additional notes:\n${extra}`);
  return parts.join("\n\n—\n\n");
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = str(body.name);
  const email = str(body.email);
  const phone = str(body.phone);
  const company = str(body.company);
  const message = buildLeadNotes(body);
  const projectType = str(body.product_type);
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
      source: "Website Contact (local growth)",
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
