import { NextResponse } from "next/server";
import { generateRevenueLeakAuditPdf } from "@/lib/revenue-leak-audit/pdf-report-service";
import type { RevenueLeakAudit } from "@/lib/revenue-leak-audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  audit?: unknown;
};

function isAudit(value: unknown): value is RevenueLeakAudit {
  return (
    typeof value === "object" &&
    value !== null &&
    "business" in value &&
    "findings" in value &&
    "scores" in value
  );
}

function filenameFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "business"}-revenue-leak-audit.pdf`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (!isAudit(body.audit)) {
    return NextResponse.json(
      { ok: false, error: "Missing audit report data." },
      { status: 400 }
    );
  }

  try {
    const pdf = await generateRevenueLeakAuditPdf(body.audit);
    const arrayBuffer = new ArrayBuffer(pdf.byteLength);
    new Uint8Array(arrayBuffer).set(pdf);
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameFor(
          body.audit.business.name
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[revenue-leak-audit] pdf failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not generate PDF report." },
      { status: 500 }
    );
  }
}
