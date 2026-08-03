import { NextRequest, NextResponse } from "next/server";
import { isFromAdminRoute, isProtectedWrite } from "@/lib/editRoutes";

/**
 * Global gate: a write to blog content or media only goes through when the
 * browser's current page is the admin dashboard. See editRoutes.ts for why
 * this exists alongside (not instead of) the per-route session check.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedWrite(pathname, request.method)) {
    return NextResponse.next();
  }

  const referer = request.headers.get("referer");
  let refererPathname: string | null = null;
  if (referer) {
    try {
      refererPathname = new URL(referer).pathname;
    } catch {
      refererPathname = null;
    }
  }

  if (!isFromAdminRoute(refererPathname)) {
    return NextResponse.json(
      { error: "Editing is only available from the admin dashboard." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/blogs/:path*", "/api/upload", "/api/upload-youtube"],
};
