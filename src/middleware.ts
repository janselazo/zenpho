import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const DEFAULT_SITE_HOST = "zenpho.com";
const DEFAULT_APP_HOST = "app.zenpho.com";

const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

const APP_PREFIXES = [
  "/dashboard",
  "/audit",
  "/leads",
  "/deals",
  "/clients",
  "/projects",
  "/products",
  "/products-services",
  "/calendar",
  "/settings",
  "/team",
  "/capacity",
  "/reports",
  "/reporting",
  "/prospecting",
  "/docs",
  "/tools",
  "/proposals",
  "/invoices",
  "/conversations",
  "/finances",
  "/store",
  "/reviews",
  "/referrals",
  "/automations",
  "/time-tracking",
  "/estimates",
  "/portal",
];

const PUBLIC_MARKETING_OVERRIDES = ["/tools/business-audit"];

function normalizeHost(value: string | undefined, fallback = "") {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split(":")[0]
      .trim() || fallback
  );
}

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicMarketingOverride(pathname: string) {
  return matchesPath(pathname, PUBLIC_MARKETING_OVERRIDES);
}

function isAppPath(pathname: string) {
  if (pathname.startsWith("/api")) return false;
  if (isPublicMarketingOverride(pathname)) return false;
  return matchesPath(pathname, AUTH_PREFIXES) || matchesPath(pathname, APP_PREFIXES);
}

function isLocalOrPreviewHost(host: string, siteHost: string, appHost: string) {
  if (!host) return true;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }
  return host.endsWith(".vercel.app") && host !== siteHost && host !== appHost;
}

function redirectToHost(request: NextRequest, host: string, pathname?: string) {
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = host;
  url.port = "";
  if (pathname) url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const previewHost = normalizeHost(process.env.PREVIEW_PUBLIC_HOST);
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

  const siteHost = normalizeHost(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_HOST);
  const appHost = normalizeHost(
    process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    DEFAULT_APP_HOST,
  );
  const siteHosts = new Set([siteHost, `www.${siteHost.replace(/^www\./, "")}`]);
  const appHosts = new Set([appHost]);
  const pathname = request.nextUrl.pathname;

  if (!isLocalOrPreviewHost(host, siteHost, appHost)) {
    if (host === `www.${siteHost.replace(/^www\./, "")}`) {
      return redirectToHost(request, siteHost);
    }

    if (siteHosts.has(host) && isAppPath(pathname)) {
      return redirectToHost(request, appHost);
    }

    if (appHosts.has(host)) {
      if (pathname === "/" || pathname === "") {
        return redirectToHost(request, appHost, "/login");
      }
      if (!pathname.startsWith("/api") && !isAppPath(pathname)) {
        return redirectToHost(request, siteHost);
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
