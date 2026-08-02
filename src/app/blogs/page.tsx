"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Blog } from "@/lib/types";
import { formatDate, formatMonthYear, getBlogCategory } from "@/lib/blogUtils";
import {
  BlogThemeProvider,
  useTheme,
  ThemeToggleButton,
  blogThemeStyles,
} from "@/components/blog/ThemeToggle";

function BlogsContent() {
  const { theme } = useTheme();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  useEffect(() => {
    fetch("/api/blogs")
      .then((res) => res.json())
      .then((data) => {
        setBlogs(data.blogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // /blogs?tab=monthly opens straight on the Monthly Updates tab. Read from the
  // URL rather than useSearchParams so the page needs no Suspense boundary.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is external state, absent from the prerendered page
    if (tab === "monthly" || tab === "daily") setActiveTab(tab);
  }, []);

  const selectTab = (tab: "daily" | "monthly") => {
    setActiveTab(tab);
    window.history.replaceState(
      {},
      "",
      tab === "monthly" ? "?tab=monthly" : window.location.pathname
    );
  };

  const styles = blogThemeStyles(theme);

  const dailyBlogs = blogs.filter((b) => getBlogCategory(b) === "daily");
  const monthlyBlogs = blogs.filter((b) => getBlogCategory(b) === "monthly");

  const monthlyByYear = monthlyBlogs.reduce<Record<string, Blog[]>>((acc, b) => {
    const year = new Date(b.createdAt).getFullYear().toString();
    (acc[year] ||= []).push(b);
    return acc;
  }, {});
  const years = Object.keys(monthlyByYear);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
      {/* Header */}
      <header className="blog-shell pt-12 pb-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm transition-colors hover:opacity-70"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
          >
            ← Back to Home
          </Link>
          <ThemeToggleButton />
        </div>
        <h1
          className="text-4xl sm:text-5xl font-light mt-8 mb-3"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif", letterSpacing: "-0.02em", color: "var(--blog-text)" }}
        >
          Blog
        </h1>
        <p
          className="text-base"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
        >
          Thoughts, ideas, and things I find interesting.
          {!loading && blogs.length > 0 && (
            <span className="ml-2 opacity-60">— {blogs.length} {blogs.length === 1 ? "post" : "posts"}</span>
          )}
        </p>

        {/* Tabs */}
        <div className="flex gap-6 mt-8" style={{ borderBottom: "1px solid var(--blog-border)" }}>
          {(["daily", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => selectTab(tab)}
              className="pb-3 text-sm transition-colors relative"
              style={{
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                color: activeTab === tab ? "var(--blog-text)" : "var(--blog-text-secondary)",
                borderBottom: activeTab === tab ? "2px solid var(--blog-hover)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tab === "daily" ? "Blog" : "Monthly Updates"}
            </button>
          ))}
        </div>
      </header>

      {/* Blog List */}
      <main className="blog-shell pb-20">
        {loading ? (
          <div className="py-20 text-center" style={{ color: "var(--blog-text-secondary)" }}>
            <div className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "daily" ? (
          dailyBlogs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}>
                No posts yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {dailyBlogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blogs/${blog.id}`}
                  className="flex items-baseline justify-between gap-4 py-3 group"
                  style={{ borderBottom: "1px solid var(--blog-border)" }}
                >
                  <h2
                    className="text-base sm:text-lg font-light transition-colors truncate"
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--blog-text)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blog-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--blog-text)")}
                  >
                    {blog.title}
                  </h2>
                  <time
                    className="text-xs sm:text-sm shrink-0"
                    style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
                  >
                    {formatDate(blog.createdAt)}
                  </time>
                </Link>
              ))}
            </div>
          )
        ) : monthlyBlogs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}>
              No monthly updates yet.
            </p>
          </div>
        ) : (
          years.map((year) => (
            <div key={year} className="mb-10">
              <h3
                className="text-sm mb-3 opacity-60"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
              >
                {year}
              </h3>
              <div className="space-y-0">
                {monthlyByYear[year].map((blog) => (
                  <Link
                    key={blog.id}
                    href={`/blogs/${blog.id}`}
                    className="flex items-baseline justify-between gap-4 py-3 group"
                    style={{ borderBottom: "1px solid var(--blog-border)" }}
                  >
                    <span
                      className="text-base sm:text-lg font-light transition-colors truncate"
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--blog-text)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blog-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--blog-text)")}
                    >
                      {blog.title}
                    </span>
                    <time
                      className="text-xs sm:text-sm shrink-0"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
                    >
                      {formatMonthYear(blog.createdAt)}
                    </time>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default function BlogsPage() {
  return (
    <BlogThemeProvider>
      <BlogsContent />
    </BlogThemeProvider>
  );
}
