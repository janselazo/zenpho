import { NextResponse } from "next/server";
import { generateRevenueLeakAudit } from "@/lib/revenue-leak-audit/audit-service";
import type {
  AuditAssumptions,
  BusinessProfile,
} from "@/lib/revenue-leak-audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Interactive audit targets ~60s; keep in sync with client `AbortSignal.timeout` and PageSpeed budget. */
export const maxDuration = 60;

type Body = {
  business?: unknown;
  assumptions?: Partial<AuditAssumptions>;
};

function isBusinessProfile(value: unknown): value is BusinessProfile {
  return (
    typeof value === "object" &&
    value !== null &&
    "placeId" in value &&
    "name" in value &&
    typeof (value as { placeId?: unknown }).placeId === "string" &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body.", audit: null },
      { status: 400 }
    );
  }

  if (!isBusinessProfile(body.business)) {
    return NextResponse.json(
      { ok: false, error: "Select a business before running the audit.", audit: null },
      { status: 400 }
    );
  }

  try {
    const result = await generateRevenueLeakAudit({
      business: body.business,
      assumptions: body.assumptions ?? {},
    });
    return NextResponse.json({
      ok: true,
      audit: result.data,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("[revenue-leak-audit] analysis failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Revenue Leak Audit failed. Please try again.",
        audit: null,
      },
      { status: 500 }
    );
  }
}
