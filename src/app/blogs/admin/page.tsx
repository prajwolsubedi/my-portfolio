"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Blog } from "@/lib/types";
import BlogEditor from "@/components/blog/BlogEditor";
import MonthlyUpdateReminder from "@/components/blog/MonthlyUpdateReminder";
import HabitTrackerModal from "@/components/blog/HabitTrackerModal";
import {
  currentPeriodKey,
  findMonthlyBlogForPeriod,
  getBlogCategory,
  getBlogVisibility,
} from "@/lib/blogUtils";

type View = "dashboard" | "editor";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginStep, setLoginStep] = useState<"password" | "otp">("password");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [editorPreset, setEditorPreset] = useState<"monthly" | null>(null);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const deepLinkHandled = useRef(false);
  const [filter, setFilter] = useState<"all" | "published" | "archived" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "daily" | "monthly">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [viewMode, setViewMode] = useState<"admin" | "audience">("admin");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  // Fetch blogs when authenticated
  const fetchBlogs = useCallback(() => {
    setLoading(true);
    fetch("/api/blogs?all=true")
      .then((r) => r.json())
      .then((d) => {
        setBlogs(d.blogs || []);
        setBlogsLoaded(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authenticated) fetchBlogs();
  }, [authenticated, fetchBlogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setLoginStep("otp");
        setPassword("");
      } else {
        setLoginError("Incorrect password");
      }
    } catch {
      setLoginError("Connection error");
    }
    setLoggingIn(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp }),
      });

      if (res.ok) {
        setAuthenticated(true);
        setOtp("");
        setLoginStep("password");
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Incorrect code");
      }
    } catch {
      setLoginError("Connection error");
    }
    setLoggingIn(false);
  };

  const handleBackToPassword = () => {
    setLoginStep("password");
    setOtp("");
    setLoginError("");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setBlogs([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    await fetch(`/api/blogs/${id}`, { method: "DELETE" });
    fetchBlogs();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/blogs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchBlogs();
  };

  const handleNewBlog = () => {
    setEditingBlog(null);
    setEditorPreset(null);
    setView("editor");
  };

  const handleEditBlog = (blog: Blog) => {
    setEditingBlog(blog);
    setEditorPreset(null);
    setView("editor");
  };

  const handleEditorDone = () => {
    setView("dashboard");
    setEditingBlog(null);
    setEditorPreset(null);
    fetchBlogs();
  };

  // Jump straight into this month's update, creating it if it doesn't exist yet.
  const openThisMonth = useCallback(() => {
    const existing = findMonthlyBlogForPeriod(blogs, currentPeriodKey());
    setEditingBlog(existing ?? null);
    setEditorPreset(existing ? null : "monthly");
    setView("editor");
  }, [blogs]);

  // Shortcut links: /blogs/admin?new=monthly and /blogs/admin?edit=<id>. Read
  // from the URL directly so the page needs no Suspense boundary, and wait for
  // the blog list so ?edit= can resolve to a post.
  useEffect(() => {
    if (!authenticated || !blogsLoaded || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const edit = params.get("edit");
    const create = params.get("new");
    if (!edit && !create) return;

    deepLinkHandled.current = true;
    // Drop the params so a refresh doesn't reopen the editor.
    window.history.replaceState({}, "", window.location.pathname);

    if (create === "monthly") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the editor is driven by the URL, an external source
      openThisMonth();
      return;
    }
    const target = blogs.find((b) => b.id === edit);
    if (target) handleEditBlog(target);
  }, [authenticated, blogsLoaded, blogs, openThisMonth]);

  const closeHabits = useCallback(() => {
    setHabitsOpen(false);
    fetchBlogs();
  }, [fetchBlogs]);

  const startMonthlyFromHabits = useCallback(() => {
    setHabitsOpen(false);
    openThisMonth();
  }, [openThisMonth]);

  // Dashboard keyboard shortcuts: M = this month's update, N = new post,
  // H = habit tracker.
  useEffect(() => {
    if (!authenticated || view !== "dashboard" || habitsOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "m") {
        e.preventDefault();
        openThisMonth();
      } else if (key === "n") {
        e.preventDefault();
        setEditingBlog(null);
        setEditorPreset(null);
        setView("editor");
      } else if (key === "h") {
        e.preventDefault();
        setHabitsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authenticated, view, habitsOpen, openThisMonth]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filteredBlogs = blogs
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => categoryFilter === "all" || getBlogCategory(b) === categoryFilter)
    .filter((b) => visibilityFilter === "all" || getBlogVisibility(b) === visibilityFilter);

  const fontPoppins = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
  const fontPlayfair = { fontFamily: "var(--font-playfair), Georgia, serif" };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-6">
        {loginStep === "password" ? (
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
            <h1
              className="text-3xl font-light text-[var(--text-main)] text-center"
              style={fontPlayfair}
            >
              Admin Login
            </h1>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent border border-[var(--text-secondary)]/30 rounded-lg px-4 py-3 text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[#a8d4f0] transition-colors"
                style={fontPoppins}
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-red-400 text-sm text-center" style={fontPoppins}>
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn || !password}
              className="w-full py-3 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={fontPoppins}
            >
              {loggingIn ? "Sending code..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-1">
              <h1
                className="text-3xl font-light text-[var(--text-main)]"
                style={fontPlayfair}
              >
                Enter Code
              </h1>
              <p className="text-sm text-[var(--text-secondary)]" style={fontPoppins}>
                We emailed a 6-digit code. It expires in 5 minutes.
              </p>
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full bg-transparent border border-[var(--text-secondary)]/30 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-[var(--text-main)] placeholder-[var(--text-secondary)]/30 focus:outline-none focus:border-[#a8d4f0] transition-colors"
                style={fontPoppins}
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-red-400 text-sm text-center" style={fontPoppins}>
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn || otp.length !== 6}
              className="w-full py-3 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={fontPoppins}
            >
              {loggingIn ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={handleBackToPassword}
              className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
              style={fontPoppins}
            >
              Back
            </button>
          </form>
        )}
      </div>
    );
  }

  // Editor view
  if (view === "editor") {
    return (
      <BlogEditor blog={editingBlog} onDone={handleEditorDone} preset={editorPreset} />
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-[var(--bg-color)] py-8">
      <div className="blog-shell">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1
            className="text-3xl font-light text-[var(--text-main)]"
            style={fontPlayfair}
          >
            Blog Admin
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode((v) => (v === "admin" ? "audience" : "admin"))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "audience"
                  ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                  : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
              style={fontPoppins}
            >
              {viewMode === "audience" ? "👁 Viewing as Audience" : "View as Audience"}
            </button>
            <button
              onClick={() => setHabitsOpen(true)}
              className="p-2 rounded-lg border border-[#a8d4f0]/40 text-[#a8d4f0] hover:bg-[#a8d4f0]/10 transition-colors"
              title="Habit tracker (H)"
              aria-label="Open habit tracker"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </button>
            <button
              onClick={openThisMonth}
              className="px-4 py-2 border border-[#a8d4f0]/40 text-[#a8d4f0] rounded-lg text-sm font-medium hover:bg-[#a8d4f0]/10 transition-colors"
              style={fontPoppins}
              title="Open this month's update (M)"
            >
              This Month
            </button>
            <button
              onClick={handleNewBlog}
              className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={fontPoppins}
              title="New post (N)"
            >
              + New Post
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] rounded-lg text-sm hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors"
              style={fontPoppins}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <p
          className="hidden sm:block text-[11px] text-[var(--text-secondary)]/60 -mt-6 mb-8"
          style={fontPoppins}
        >
          Shortcuts: <kbd className="font-medium">M</kbd> this month&apos;s update ·{" "}
          <kbd className="font-medium">H</kbd> habit tracker ·{" "}
          <kbd className="font-medium">N</kbd> new post
        </p>

        {/* Monthly update nudge */}
        {blogsLoaded && (
          <MonthlyUpdateReminder
            blogs={blogs}
            onStart={openThisMonth}
            onContinue={handleEditBlog}
          />
        )}

        {/* Filters disclosure */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors mb-4"
          style={fontPoppins}
        >
          <span className={`inline-block transition-transform ${filtersOpen ? "rotate-90" : ""}`}>▸</span>
          Filters
          {(filter !== "all" || categoryFilter !== "all" || visibilityFilter !== "all") && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--text-main)] text-[var(--bg-color)]">
              active
            </span>
          )}
        </button>

        {filtersOpen && (
          <div className="space-y-3 mb-8">
            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "published", "draft", "archived"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                    filter === f
                      ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                      : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                  }`}
                  style={fontPoppins}
                >
                  {f} {f !== "all" && `(${blogs.filter((b) => b.status === f).length})`}
                  {f === "all" && `(${blogs.length})`}
                </button>
              ))}
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "daily", "monthly"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                    categoryFilter === c
                      ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                      : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                  }`}
                  style={fontPoppins}
                >
                  {c === "all"
                    ? `All Types (${blogs.length})`
                    : c === "daily"
                    ? `Daily (${blogs.filter((b) => getBlogCategory(b) === "daily").length})`
                    : `Monthly (${blogs.filter((b) => getBlogCategory(b) === "monthly").length})`}
                </button>
              ))}
            </div>

            {/* Visibility Filters */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "public", "private"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibilityFilter(v)}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                    visibilityFilter === v
                      ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                      : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                  }`}
                  style={fontPoppins}
                >
                  {v === "all"
                    ? `All (${blogs.length})`
                    : v === "public"
                    ? `Public (${blogs.filter((b) => getBlogVisibility(b) === "public").length})`
                    : `Private (${blogs.filter((b) => getBlogVisibility(b) === "private").length})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blog List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[var(--text-secondary)]" style={fontPoppins}>
              {filter === "all" ? "No blog posts yet. Create your first one!" : `No ${filter} posts.`}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                className="py-5 border-b border-[var(--text-secondary)]/10 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                        blog.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : blog.status === "archived"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                      style={fontPoppins}
                    >
                      {blog.status}
                    </span>
                    <span
                      className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                        getBlogCategory(blog) === "monthly"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                      style={fontPoppins}
                    >
                      {getBlogCategory(blog) === "monthly" ? "Monthly" : "Daily"}
                    </span>
                    <span title={getBlogVisibility(blog) === "private" ? "Private" : "Public"} className="text-xs">
                      {getBlogVisibility(blog) === "private" ? "🔒" : "🌐"}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]" style={fontPoppins}>
                      {formatDate(blog.createdAt)}
                    </span>
                  </div>
                  {viewMode === "audience" ? (
                    <Link
                      href={`/blogs/${blog.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-[var(--text-main)] font-light truncate block hover:underline"
                      style={fontPlayfair}
                    >
                      {blog.title}
                    </Link>
                  ) : (
                    <h3
                      className="text-lg text-[var(--text-main)] font-light truncate"
                      style={fontPlayfair}
                    >
                      {blog.title}
                    </h3>
                  )}
                </div>

                {/* Actions */}
                {viewMode === "admin" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditBlog(blog)}
                      className="text-xs px-3 py-1.5 border border-[var(--text-secondary)]/20 text-[var(--text-secondary)] rounded hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors"
                      style={fontPoppins}
                    >
                      Edit
                    </button>
                    {blog.status !== "published" && (
                      <button
                        onClick={() => handleStatusChange(blog.id, "published")}
                        className="text-xs px-3 py-1.5 border border-green-500/30 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                        style={fontPoppins}
                      >
                        Publish
                      </button>
                    )}
                    {blog.status === "published" && (
                      <button
                        onClick={() => handleStatusChange(blog.id, "archived")}
                        className="text-xs px-3 py-1.5 border border-yellow-500/30 text-yellow-400 rounded hover:bg-yellow-500/20 transition-colors"
                        style={fontPoppins}
                      >
                        Archive
                      </button>
                    )}
                    {blog.status === "archived" && (
                      <button
                        onClick={() => handleStatusChange(blog.id, "published")}
                        className="text-xs px-3 py-1.5 border border-green-500/30 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                        style={fontPoppins}
                      >
                        Unarchive
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                      style={fontPoppins}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {habitsOpen && (
        <HabitTrackerModal
          blog={findMonthlyBlogForPeriod(blogs, currentPeriodKey()) ?? null}
          onClose={closeHabits}
          onCreateUpdate={startMonthlyFromHabits}
        />
      )}
    </div>
  );
}
