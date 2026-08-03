import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { BlogBlock } from "@/lib/types";
import { getBlog, listBlogSummaries } from "@/lib/blogStore";
import { isAuthenticated } from "@/lib/auth";
import { parseHabitTracker, serializeHabitTracker, stripHiddenHabits } from "@/lib/habitUtils";
import {
  formatDate,
  formatPeriod,
  getBlogCategory,
  isVisibleToPublic,
  parsePeriodKey,
  resolveBlogPeriod,
} from "@/lib/blogUtils";
import { BLOG_IMAGE_SIZES, imageSrcSet, optimizedImageUrl } from "@/lib/media";
import { ThemeToggleButton } from "@/components/blog/ThemeToggle";
import YouTubeEmbed from "@/components/blog/YouTubeEmbed";
import { PostAdminBar, PostEditingProvider } from "./PostEditing";
import HabitBlock from "./HabitBlock";

/** Backstop; writes call `revalidateTag`, so edits show up immediately. */
export const revalidate = 3600;

/**
 * Published posts are rendered at build time and served as static HTML. Drafts
 * and private posts aren't listed here — they fall through to an on-demand
 * render below, which is where the session gets checked.
 */
export async function generateStaticParams() {
  const blogs = await listBlogSummaries();
  return blogs.filter(isVisibleToPublic).map((blog) => ({ id: blog.id }));
}

/** First bit of prose in the post, for the description meta tag. */
function excerpt(blocks: BlogBlock[]): string | undefined {
  const text = blocks.find((b) => b.type === "text")?.content?.trim();
  if (!text) return undefined;
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlog(id);

  // Don't put an unpublished post's title in a <title> tag.
  if (!blog || !isVisibleToPublic(blog)) return { title: "Blog — Prajwol Subedi" };

  return {
    title: `${blog.title} — Prajwol Subedi`,
    description: excerpt(blog.blocks),
    openGraph: {
      title: blog.title,
      description: excerpt(blog.blocks),
      type: "article",
      publishedTime: new Date(blog.createdAt).toISOString(),
    },
  };
}

function Caption({ text }: { text: string }) {
  return (
    <figcaption
      className="blog-sans text-center text-sm mt-3 italic"
      style={{ color: "var(--blog-text-secondary)" }}
    >
      {text}
    </figcaption>
  );
}

/**
 * One block of a post. Everything here renders on the server except the habit
 * grid, which needs the reader's own clock to know which days are still open.
 *
 * `priority` marks the first piece of media in the post: it's the one most
 * likely to be the largest element in the initial viewport, so it loads
 * immediately while everything below it waits until it's scrolled near.
 */
function BlockView({
  block,
  period,
  priority,
  authed,
}: {
  block: BlogBlock;
  period: string;
  priority: boolean;
  authed: boolean;
}) {
  switch (block.type) {
    case "text":
      return (
        <div
          className="blog-sans text-[1.05rem] sm:text-lg leading-[1.8] whitespace-pre-wrap"
          style={{ fontWeight: 400, color: "var(--blog-text)" }}
        >
          {block.content}
        </div>
      );

    case "image":
      return (
        <figure className="my-8">
          <img
            src={optimizedImageUrl(block.content)}
            srcSet={imageSrcSet(block.content)}
            sizes={BLOG_IMAGE_SIZES}
            alt={block.caption || "Blog image"}
            className="w-full rounded-lg"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
          {block.caption && <Caption text={block.caption} />}
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
          {block.caption && <Caption text={block.caption} />}
        </figure>
      );

    case "youtube":
      return (
        <figure className="my-8">
          <div className="aspect-video rounded-lg overflow-hidden">
            <YouTubeEmbed videoId={block.content} title={block.caption} />
          </div>
          {block.caption && <Caption text={block.caption} />}
        </figure>
      );

    case "habits": {
      const parsed = parsePeriodKey(period);
      const year = parsed?.year ?? new Date().getFullYear();
      const month = parsed?.month ?? new Date().getMonth();

      // Habits marked hidden are stripped out of the content before it ever
      // reaches a non-admin reader — filtering them in the UI alone would
      // still leak the name and daily marks through the rendered page.
      const publicBlock = authed
        ? block
        : {
            ...block,
            content: serializeHabitTracker(
              stripHiddenHabits(parseHabitTracker(block.content, year, month))
            ),
          };

      return <HabitBlock block={publicBlock} year={year} month={month} />;
    }

    default:
      return null;
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlog(id);
  if (!blog) notFound();

  // Reading the session is what makes a render dynamic, so it happens only on
  // the branches that need it: a post with no habits block and nothing to hide
  // never reaches this line and stays fully static, while the author can still
  // open a draft at its real URL, and a habit tracker's hidden columns never
  // reach a signed-out reader.
  const hasHabitsBlock = blog.blocks.some((b) => b.type === "habits");
  const authed =
    !isVisibleToPublic(blog) || hasHabitsBlock ? await isAuthenticated() : false;

  if (!isVisibleToPublic(blog) && !authed) notFound();

  const isMonthly = getBlogCategory(blog) === "monthly";
  const period = resolveBlogPeriod(blog);
  const firstMediaId = blog.blocks.find((b) => b.type === "image")?.id;

  return (
    <PostEditingProvider>
      <div
        className="min-h-screen transition-colors duration-300"
        style={{ backgroundColor: "var(--blog-bg)" }}
      >
        <article className="blog-shell pt-12 pb-20">
          <div className="flex items-center justify-between">
            <Link
              href="/blogs"
              className="blog-sans text-sm transition-colors hover:opacity-70"
              style={{ color: "var(--blog-text-secondary)" }}
            >
              ← Back to Blog
            </Link>
            <div className="flex items-center gap-3">
              <PostAdminBar blogId={blog.id} />
              <ThemeToggleButton />
            </div>
          </div>

          <h1
            className="blog-serif text-3xl sm:text-4xl md:text-5xl font-light mt-10 mb-4 leading-tight"
            style={{ letterSpacing: "-0.02em", color: "var(--blog-text)" }}
          >
            {blog.title}
          </h1>

          <time
            className="blog-sans text-sm block mb-12"
            style={{ color: "var(--blog-text-secondary)" }}
          >
            {isMonthly ? formatPeriod(period) : formatDate(blog.createdAt)}
          </time>

          <div className="space-y-6">
            {blog.blocks.map((block) => (
              <BlockView
                key={block.id}
                block={block}
                period={period}
                priority={block.id === firstMediaId}
                authed={authed}
              />
            ))}
          </div>
        </article>
      </div>
    </PostEditingProvider>
  );
}
