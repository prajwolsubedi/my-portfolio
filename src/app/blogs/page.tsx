"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Blog } from "@/lib/types";
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

  useEffect(() => {
    fetch("/api/blogs")
      .then((res) => res.json())
      .then((data) => {
        setBlogs(data.blogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const styles = blogThemeStyles(theme);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
      {/* Header */}
      <header className="pt-12 pb-8 px-6 max-w-[720px] mx-auto">
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
      </header>

      {/* Blog List */}
      <main className="px-6 pb-20 max-w-[720px] mx-auto">
        {loading ? (
          <div className="py-20 text-center" style={{ color: "var(--blog-text-secondary)" }}>
            <div className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}>
              No posts yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {blogs.map((blog, index) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.id}`}
                className="block py-6 group"
                style={{ borderBottom: "1px solid var(--blog-border)" }}
              >
                <article className="flex gap-4 items-start">
                  {/* Blog number */}
                  <span
                    className="text-2xl sm:text-3xl font-light opacity-30 select-none shrink-0 w-8 text-right"
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--blog-text)" }}
                  >
                    {String(blogs.length - index).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <time
                      className="text-sm block mb-1.5"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
                    >
                      {formatDate(blog.createdAt)}
                    </time>
                    <h2
                      className="text-xl sm:text-2xl font-light transition-colors"
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--blog-text)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blog-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--blog-text)")}
                    >
                      {blog.title}
                    </h2>
                    {blog.blocks?.find((b) => b.type === "text") && (
                      <p
                        className="mt-2 text-sm line-clamp-2"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
                      >
                        {blog.blocks.find((b) => b.type === "text")!.content.slice(0, 200)}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
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
