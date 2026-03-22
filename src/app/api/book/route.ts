import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/book?date=YYYY-MM-DD  →  booked slots for that day
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "Provide ?date=YYYY-MM-DD" }, 400);
  }

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("appointment")
      .select("starts_at, ends_at")
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd)
      .order("starts_at");

    if (error) return json({ error: error.message }, 500);
    return json({ slots: rows ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return json({ error: msg }, 500);
  }
}

// POST /api/book  →  create lead + appointment
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
  const startsAt = String(body.starts_at ?? "").trim();
  const endsAt = String(body.ends_at ?? "").trim();

  if (!name || !email) {
    return json({ error: "Name and email are required" }, 400);
  }

  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (isNaN(starts.getTime()) || isNaN(ends.getTime()) || ends <= starts) {
    return json({ error: "Valid start and end times are required" }, 400);
  }

  try {
    const supabase = createAdminClient();

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from("appointment")
      .select("id")
      .lt("starts_at", ends.toISOString())
      .gt("ends_at", starts.toISOString())
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return json({ error: "This time slot is no longer available" }, 409);
    }

    // Insert lead
    const { data: lead, error: leadErr } = await supabase
      .from("lead")
      .insert({
        name,
        email,
        phone: phone || null,
        company: company || null,
        source: "Website Booking",
        stage: "new",
        notes: message || null,
        owner_id: null,
      })
      .select("id")
      .single();

    if (leadErr) return json({ error: leadErr.message }, 500);

    // Insert appointment linked to the lead
    const { error: aptErr } = await supabase.from("appointment").insert({
      title: `Strategy Call – ${name}`,
      description: message || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      lead_id: lead.id,
      created_by: null,
    });

    if (aptErr) return json({ error: aptErr.message }, 500);

    return json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return json({ error: msg }, 500);
  }
}
