"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Blog, BlogBlock } from "@/lib/types";
import {
  formatDate,
  formatPeriod,
  getBlogCategory,
  parsePeriodKey,
  resolveBlogPeriod,
} from "@/lib/blogUtils";
import { parseHabitTracker, serializeHabitTracker } from "@/lib/habitUtils";
import HabitTrackerGrid from "@/components/blog/HabitTracker";
import {
  BlogThemeProvider,
  useTheme,
  ThemeToggleButton,
  blogThemeStyles,
} from "@/components/blog/ThemeToggle";

interface BlockRendererProps {
  block: BlogBlock;
  period: string;
  editable: boolean;
  onContentChange: (blockId: string, content: string) => void;
}

function BlogBlockRenderer({ block, period, editable, onContentChange }: BlockRendererProps) {
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
    case "youtube":
      return (
        <figure className="my-8">
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${block.content}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
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
    case "habits": {
      const now = new Date();
      const fallback = parsePeriodKey(period) ?? {
        year: now.getFullYear(),
        month: now.getMonth(),
      };
      return (
        <HabitTrackerGrid
          variant="public"
          tracker={parseHabitTracker(block.content, fallback.year, fallback.month)}
          readOnly={!editable}
          onChange={
            editable
              ? (next) => onContentChange(block.id, serializeHabitTracker(next))
              : undefined
          }
        />
      );
    }
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
  const [authed, setAuthed] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlocks = useRef<BlogBlock[] | null>(null);

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

  // Logged in? Then habits are tickable straight from the post — no detour
  // through the editor just to check off a day.
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleContentChange = (blockId: string, content: string) => {
    if (!blog) return;

    const nextBlocks = blog.blocks.map((b) =>
      b.id === blockId ? { ...b, content } : b
    );
    setBlog({ ...blog, blocks: nextBlocks });
    pendingBlocks.current = nextBlocks;
    setSaveState("saving");

    // Debounced so ticking a run of days is one write, not ten.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: pendingBlocks.current }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 600);
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

  const isMonthly = getBlogCategory(blog) === "monthly";
  const period = resolveBlogPeriod(blog);
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
      ? "Saved"
      : saveState === "error"
      ? "Couldn't save"
      : "";

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ ...styles, backgroundColor: "var(--blog-bg)" }}>
      <article className="blog-shell pt-12 pb-20">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/blogs"
            className="text-sm transition-colors hover:opacity-70"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", color: "var(--blog-text-secondary)" }}
          >
            ← Back to Blog
          </Link>
          <div className="flex items-center gap-3">
            {authed && (
              <>
                {saveLabel && (
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      color: saveState === "error" ? "#f87171" : "var(--blog-text-secondary)",
                    }}
                  >
                    {saveLabel}
                  </span>
                )}
                <Link
                  href={`/blogs/admin?edit=${blog.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{
                    fontFamily: "var(--font-poppins), Poppins, sans-serif",
                    color: "var(--blog-hover)",
                    border: "1px solid var(--blog-border)",
                  }}
                >
                  Edit post
                </Link>
              </>
            )}
            <ThemeToggleButton />
          </div>
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
          {isMonthly ? formatPeriod(period) : formatDate(blog.createdAt)}
        </time>

        {/* Content Blocks */}
        <div className="space-y-6">
          {blog.blocks.map((block) => (
            <BlogBlockRenderer
              key={block.id}
              block={block}
              period={period}
              editable={authed}
              onContentChange={handleContentChange}
            />
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
