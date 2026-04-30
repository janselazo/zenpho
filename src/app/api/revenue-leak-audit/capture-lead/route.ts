import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

type AuditMeta = {
  businessName?: string;
  placeId?: string;
  auditId?: string;
  overallScore?: number;
  monthlyLeakLow?: number;
  monthlyLeakHigh?: number;
};

function buildNotes(meta: AuditMeta | undefined, prospectName: string): string {
  const lines = [
    "Revenue Leak Audit — prospect requested help fixing leaks.",
    "",
    `Submitted by: ${prospectName}`,
  ];
  if (meta?.businessName) lines.push(`Audited business: ${meta.businessName}`);
  if (meta?.placeId) lines.push(`Google Place ID: ${meta.placeId}`);
  if (meta?.auditId) lines.push(`Audit id: ${meta.auditId}`);
  if (typeof meta?.overallScore === "number") lines.push(`Overall score: ${meta.overallScore}/100`);
  if (typeof meta?.monthlyLeakLow === "number" && typeof meta?.monthlyLeakHigh === "number") {
    lines.push(
      `Est. monthly revenue at risk: $${Math.round(meta.monthlyLeakLow).toLocaleString()}–$${Math.round(meta.monthlyLeakHigh).toLocaleString()}`
    );
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const hp = String((body as { company_website?: string }).company_website ?? "").trim();
  if (hp) return json({ ok: true }, 200);

  if (!name || !email) {
    return json({ ok: false, error: "Name and email are required." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Enter a valid email address." }, 400);
  }

  const auditMeta = body.audit as AuditMeta | undefined;

  try {
    const supabase = createAdminClient();
    const company = auditMeta?.businessName?.trim() || null;

    const { error: leadErr } = await supabase.from("lead").insert({
      name,
      email,
      phone: phone || null,
      company,
      source: "Revenue Leak Audit",
      stage: "open",
      notes: buildNotes(auditMeta, name),
      owner_id: null,
    });

    if (leadErr) {
      console.error("[revenue-leak-audit/capture-lead]", leadErr);
      return json({ ok: false, error: "Could not save your request. Please try again." }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY") || msg.includes("NEXT_PUBLIC_SUPABASE_URL")) {
      return json(
        { ok: false, error: "Lead capture is not configured on this server (missing Supabase admin env)." },
        503
      );
    }
    console.error("[revenue-leak-audit/capture-lead]", e);
    return json({ ok: false, error: "Something went wrong. Please try again later." }, 500);
  }
}
