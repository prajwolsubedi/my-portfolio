"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Blog, BlogBlock } from "@/lib/types";
import {
  BlogThemeProvider,
  useTheme,
  ThemeToggleButton,
  blogThemeStyles,
} from "@/components/blog/ThemeToggle";

function BlogBlockRenderer({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div
          className="text-[1.05rem] sm:text-lg leading-[1.8] whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontWeight: 400, color: "var(--blog-text)" }}
        >
          {block.content}
        </div>
      );
    case "image":
      return (
        <figure className="my-8">
          <img
            src={block.content}
            alt={block.caption || "Blog image"}
            className="w-full rounded-lg"
            loading="lazy"
          />
          {block.caption && (
            <figcaption
              className="text-center text-sm mt-3 italic"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "video":
      return (
        <figure className="my-8">
          <video
            src={block.content}
            controls
            className="w-full rounded-lg"
            preload="metadata"
          />
          {block.caption && (
            <figcaption
              className="text-center text-sm mt-3 italic"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    default:
      return null;
  }
}

function BlogPostContent() {
  const { theme } = useTheme();
  const params = useParams();
  const id = params.id as string;
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/blogs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setBlog(data.blog);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const styles = blogThemeStyles(theme);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "var(--blog-text-secondary)" }} />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
        <p className="text-lg" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}>
          Post not found.
        </p>
        <Link
          href="/blogs"
          className="text-sm hover:underline"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-hover)" }}
        >
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
      <article className="max-w-[720px] mx-auto px-6 pt-12 pb-20">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/blogs"
            className="text-sm transition-colors hover:opacity-70"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
          >
            ← Back to Blog
          </Link>
          <ThemeToggleButton />
        </div>

        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-light mt-10 mb-4 leading-tight"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif", letterSpacing: "-0.02em", color: "var(--blog-text)" }}
        >
          {blog.title}
        </h1>

        {/* Date */}
        <time
          className="text-sm block mb-12"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
        >
          {formatDate(blog.createdAt)}
        </time>

        {/* Content Blocks */}
        <div className="space-y-6">
          {blog.blocks.map((block) => (
            <BlogBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </article>
    </div>
  );
}

export default function BlogPostPage() {
  return (
    <BlogThemeProvider>
      <BlogPostContent />
    </BlogThemeProvider>
  );
}
