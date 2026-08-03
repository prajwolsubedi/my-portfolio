/**
 * Single source of truth for "blog content is only ever edited from
 * /blogs/admin." Read by src/middleware.ts, which rejects any request to
 * these API routes that didn't originate from the admin dashboard.
 *
 * This is a structural backstop, not the security boundary — every route
 * below already requires a valid admin session (see src/lib/auth.ts), and
 * that check still runs regardless. This adds an independent, route-level
 * restriction on top: even a genuinely authenticated request is refused
 * unless the browser's current page is the admin dashboard, so a future bug
 * that reintroduces an edit control on a public post page still can't
 * actually write anything.
 */

export const ADMIN_ROUTE = "/blogs/admin";

interface ProtectedRoute {
  pattern: RegExp;
  methods: string[];
}

/** Endpoints that mutate blog content or its media. */
export const PROTECTED_API_ROUTES: ProtectedRoute[] = [
  { pattern: /^\/api\/blogs(?:\/|$)/, methods: ["POST", "PUT", "DELETE"] },
  { pattern: /^\/api\/upload$/, methods: ["POST"] },
  { pattern: /^\/api\/upload-youtube$/, methods: ["POST"] },
];

export function isProtectedWrite(pathname: string, method: string): boolean {
  return PROTECTED_API_ROUTES.some(
    (route) => route.pattern.test(pathname) && route.methods.includes(method)
  );
}

export function isFromAdminRoute(refererPathname: string | null): boolean {
  return !!refererPathname && refererPathname.startsWith(ADMIN_ROUTE);
}
