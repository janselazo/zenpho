import { NextResponse } from "next/server";
import { runDueAppointmentReminders } from "@/lib/notifications/appointment";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueAppointmentReminders();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Appointment reminder cron failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
