import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSalesProposalPdfForDelivery } from "@/lib/crm/sales-proposal-pdf-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { proposalId?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const proposalId =
    typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  if (!proposalId) {
    return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const built = await buildSalesProposalPdfForDelivery({ supabase, proposalId });
  if (!built.ok) {
    return NextResponse.json(
      { error: built.error },
      { status: built.status },
    );
  }

  return new NextResponse(new Uint8Array(built.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${built.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
