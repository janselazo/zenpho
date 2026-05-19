import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./config";

const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

const AGENCY_APP_PREFIXES = [
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
  "/lead-magnets",
  "/tools",
  "/proposals",
  "/invoices",
  "/conversations",
  "/finances",
  "/store",
  "/reviews",
  "/referrals",
  "/automations",
  "/my-life",
  "/time-tracking",
  "/estimates",
  "/portal",
];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Public marketing routes that live under an agency-app prefix but should
// remain accessible to anonymous visitors (e.g. the Business Audit marketing
// page lives under /tools/business-audit even though /tools itself is gated).
const PUBLIC_OVERRIDES = ["/tools/business-audit"];

function isPublicOverride(pathname: string) {
  return PUBLIC_OVERRIDES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAgencyAppPath(pathname: string) {
  if (isPublicOverride(pathname)) return false;
  return AGENCY_APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  /** PKCE email confirmation / OAuth: Supabase redirects here with `?code=` — exchange before getUser(). */
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(authCode);

    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("code");
    cleanUrl.searchParams.delete("error");
    cleanUrl.searchParams.delete("error_description");

    const redirectTarget = exchangeError
      ? (() => {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = "/login";
          loginUrl.searchParams.delete("code");
          loginUrl.searchParams.delete("error");
          loginUrl.searchParams.delete("error_description");
          loginUrl.searchParams.set("error", "confirm");
          return loginUrl;
        })()
      : cleanUrl;

    const redirectResponse = NextResponse.redirect(redirectTarget);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isAgencyAppPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
