import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const previewHost = process.env.PREVIEW_PUBLIC_HOST?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();
  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";

  if (previewHost && host === previewHost) {
    const path = request.nextUrl.pathname;
    if (
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path === "/favicon.ico" ||
      /\.[a-z0-9]+$/i.test(path)
    ) {
      return NextResponse.next();
    }
    if (path === "/" || path === "") {
      return new NextResponse(null, { status: 404 });
    }
    const seg = path.replace(/^\//, "").split("/")[0];
    if (seg) {
      const url = request.nextUrl.clone();
      url.pathname = `/preview/${seg}`;
      return NextResponse.rewrite(url);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
