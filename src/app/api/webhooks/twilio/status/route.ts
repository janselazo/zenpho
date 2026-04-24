import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Twilio outbound delivery status callback.
 *
 * Keep this intentionally lightweight: Twilio only needs a non-error response.
 * We do not mutate CRM state here yet, so signature validation is not required
 * and cannot break delivery with 11200 warnings when preview/prod hostnames differ.
 */
export async function POST(req: NextRequest) {
  // Consume the body so the runtime does not leave the stream dangling.
  await req.text().catch(() => "");
  return new NextResponse(null, { status: 204 });
}
