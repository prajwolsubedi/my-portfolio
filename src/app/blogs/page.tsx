import type { Metadata } from "next";
import Link from "next/link";
import { listBlogSummaries, type BlogSummary } from "@/lib/blogStore";
import {
  formatDate,
  formatMonthYear,
  getBlogCategory,
  isVisibleToPublic,
} from "@/lib/blogUtils";
import { ThemeToggleButton } from "@/components/blog/ThemeToggle";
import BlogTabs from "./BlogTabs";

/**
 * Rendered on the server and cached. The list arrives as HTML, so there's no
 * spinner and nothing to fetch after hydration — the posts are painted before
 * the page JS has even downloaded. Writes call `revalidateTag(BLOGS_TAG)`, so
 * this hour is only a backstop for edits made outside the app.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog — Prajwol Subedi",
  description: "Thoughts, ideas, and things I find interesting.",
};

function PostRow({ blog, date }: { blog: BlogSummary; date: string }) {
  return (
    <Link href={`/blogs/${blog.id}`} className="blog-row">
      <h2 className="blog-serif blog-row-title text-base sm:text-lg font-light">
        {blog.title}
      </h2>
      <time className="blog-sans blog-row-date text-xs sm:text-sm">{date}</time>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <p
        className="blog-sans text-lg"
        style={{ color: "var(--blog-text-secondary)" }}
      >
        {message}
      </p>
    </div>
  );
}

function DailyList({ blogs }: { blogs: BlogSummary[] }) {
  if (blogs.length === 0) {
    return <EmptyState message="No posts yet. Check back soon." />;
  }
  return (
    <div className="space-y-0">
      {blogs.map((blog) => (
        <PostRow key={blog.id} blog={blog} date={formatDate(blog.createdAt)} />
      ))}
    </div>
  );
}

function MonthlyList({ blogs }: { blogs: BlogSummary[] }) {
  if (blogs.length === 0) {
    return <EmptyState message="No monthly updates yet." />;
  }

  // A Map, not a plain object: object keys that look like integers ("2025")
  // come back from Object.keys in ascending numeric order regardless of
  // insertion order, which would list the oldest year first.
  const byYear = new Map<string, BlogSummary[]>();
  for (const blog of blogs) {
    const year = new Date(blog.createdAt).getFullYear().toString();
    const bucket = byYear.get(year);
    if (bucket) bucket.push(blog);
    else byYear.set(year, [blog]);
  }

  return (
    <>
      {[...byYear.entries()].map(([year, yearBlogs]) => (
        <div key={year} className="mb-10">
          <h3
            className="blog-sans text-sm mb-3 opacity-60"
            style={{ color: "var(--blog-text-secondary)" }}
          >
            {year}
          </h3>
          <div className="space-y-0">
            {yearBlogs.map((blog) => (
              <PostRow
                key={blog.id}
                blog={blog}
                date={formatMonthYear(blog.createdAt)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default async function BlogsPage() {
  // Summaries only — the list shows a title and a date, so pulling every post's
  // blocks would mean fetching (and shipping) the entire blog to render none of
  // it. Drafts and private posts are dropped here, on the server, rather than
  // being sent to the browser and filtered there.
  const blogs = (await listBlogSummaries()).filter(isVisibleToPublic);

  const daily = blogs.filter((b) => getBlogCategory(b) === "daily");
  const monthly = blogs.filter((b) => getBlogCategory(b) === "monthly");

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--blog-bg)" }}
    >
      <header className="blog-shell pt-12 pb-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="blog-sans text-sm transition-colors hover:opacity-70"
            style={{ color: "var(--blog-text-secondary)" }}
          >
            ← Back to Home
          </Link>
          <ThemeToggleButton />
        </div>
        <h1
          className="blog-serif text-4xl sm:text-5xl font-light mt-8 mb-3"
          style={{ letterSpacing: "-0.02em", color: "var(--blog-text)" }}
        >
          Blog
        </h1>
        <p className="blog-sans text-base" style={{ color: "var(--blog-text-secondary)" }}>
          Thoughts, ideas, and things I find interesting.
          {blogs.length > 0 && (
            <span className="ml-2 opacity-60">
              — {blogs.length} {blogs.length === 1 ? "post" : "posts"}
            </span>
          )}
        </p>
      </header>

      <BlogTabs
        daily={<DailyList blogs={daily} />}
        monthly={<MonthlyList blogs={monthly} />}
      />
    </div>
  );
}
