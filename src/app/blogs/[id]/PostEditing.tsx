"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { hasAdminHint } from "@/lib/authHint";

/**
 * The one admin-facing thing a post page shows: a link over to the real
 * editor. Blog content itself is never editable here — see src/middleware.ts,
 * which refuses any write that didn't originate from /blogs/admin, and
 * editRoutes.ts for why. This context exists only to decide whether that link
 * is worth showing, not to grant any editing capability.
 *
 * It hydrates after the content is already on screen, so signed-out readers
 * never wait on any of it.
 */

export interface EditingContext {
  authed: boolean;
}

export const PostEditingContext = createContext<EditingContext>({ authed: false });

export function PostEditingProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // The session cookie is httpOnly, so the browser can't read it directly —
    // but login also drops a readable hint alongside it. Without the hint
    // there is nothing to verify, so the vast majority of visitors skip this
    // request entirely. The hint grants nothing; /api/auth/check still
    // decides, and even a true result here only ever shows a link to
    // /blogs/admin — it doesn't unlock editing on this page.
    if (!hasAdminHint()) return;

    const aborted = new AbortController();
    fetch("/api/auth/check", { signal: aborted.signal })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => {});
    return () => aborted.abort();
  }, []);

  return (
    <PostEditingContext.Provider value={{ authed }}>{children}</PostEditingContext.Provider>
  );
}

/** Link over to the real editor. Renders nothing signed out. */
export function PostAdminBar({ blogId }: { blogId: string }) {
  const { authed } = useContext(PostEditingContext);
  if (!authed) return null;

  return (
    <Link
      href={`/blogs/admin?edit=${blogId}`}
      className="blog-sans text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
      style={{ color: "var(--blog-hover)", border: "1px solid var(--blog-border)" }}
    >
      Edit post
    </Link>
  );
}
