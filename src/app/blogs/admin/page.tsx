"use client";

import { useEffect, useState, useCallback } from "react";
import type { Blog } from "@/lib/types";
import BlogEditor from "@/components/blog/BlogEditor";
import { getBlogCategory, getBlogVisibility, isVisibleToPublic } from "@/lib/blogUtils";

type View = "dashboard" | "editor";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
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
        setAuthenticated(true);
        setPassword("");
      } else {
        setLoginError("Incorrect password");
      }
    } catch {
      setLoginError("Connection error");
    }
    setLoggingIn(false);
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
    setView("editor");
  };

  const handleEditBlog = (blog: Blog) => {
    setEditingBlog(blog);
    setView("editor");
  };

  const handleEditorDone = () => {
    setView("dashboard");
    setEditingBlog(null);
    fetchBlogs();
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filteredBlogs = blogs
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => categoryFilter === "all" || getBlogCategory(b) === categoryFilter)
    .filter((b) => visibilityFilter === "all" || getBlogVisibility(b) === visibilityFilter)
    .filter((b) => viewMode === "admin" || isVisibleToPublic(b));

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
            {loggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  // Editor view
  if (view === "editor") {
    return <BlogEditor blog={editingBlog} onDone={handleEditorDone} />;
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-[var(--bg-color)] px-6 py-8">
      <div className="max-w-[900px] mx-auto">
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
              onClick={handleNewBlog}
              className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={fontPoppins}
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
                  <h3
                    className="text-lg text-[var(--text-main)] font-light truncate"
                    style={fontPlayfair}
                  >
                    {blog.title}
                  </h3>
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
    </div>
  );
}
