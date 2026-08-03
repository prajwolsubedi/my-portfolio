/**
 * A readable companion to the httpOnly admin session cookie.
 *
 * The session itself is httpOnly and signed — the browser can't read it, and
 * only the server can judge it. That's the right shape for a credential, but it
 * means a page has no way to tell whether asking "am I logged in?" is even
 * worth a request, so every visitor ends up making one.
 *
 * This cookie is set and cleared alongside the session purely so the client can
 * answer that. It is not a credential and carries no authority: forging it gets
 * you nothing but a call to /api/auth/check that returns false.
 */

export const ADMIN_HINT_COOKIE = "blog_admin_hint";

/** Browser-side: is there any point asking the server about a session? */
export function hasAdminHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith(`${ADMIN_HINT_COOKIE}=`));
}
