/**
 * Next.js 16 Proxy (formerly "middleware") Ã¢â‚¬â€ runs on every matched request.
 *
 * Responsibilities:
 * 1. Refresh Supabase session cookies (keeps auth alive across requests).
 * 2. Redirect unauthenticated users away from protected routes Ã¢â€ â€™ /login.
 * 3. Redirect authenticated users away from /login Ã¢â€ â€™ /dashboard.
 *
 * SECURITY NOTE:
 * This proxy performs optimistic session checks using the cookie only.
 * It does NOT enforce role-based restrictions Ã¢â‚¬â€ that is done server-side
 * inside each layout via the DAL (verifySession, requireAdmin, etc.).
 *
 * The service-role key is never used here. Only the anon key is used
 * to call getUser() which validates the JWT with Supabase Auth servers.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/** Routes that require authentication */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/finance",
  "/admin",
  "/it",
  "/headmaster",
  "/academic",
  "/teacher",
  "/operations",
  "/staff",
  "/requests",
  "/unauthorized",
];

/** Auth routes Ã¢â‚¬â€ redirect away if already authenticated */
const AUTH_ROUTES = ["/login"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareClient(request, response);

  // Refresh session Ã¢â‚¬â€ this writes updated auth cookies back onto the response.
  // getUser() validates with Supabase Auth servers (not just cookie claims).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes Ã¢â€ â€™ /login
  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login Ã¢â€ â€™ /dashboard
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - api (API route handlers, file uploads, proxies)
     * - _next/static (compiled assets)
     * - _next/image (image optimization)
     * - favicon.ico and public image assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
