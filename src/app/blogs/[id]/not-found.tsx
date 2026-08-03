import Link from "next/link";

export default function PostNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "var(--blog-bg)" }}
    >
      <p className="blog-sans text-lg" style={{ color: "var(--blog-text-secondary)" }}>
        Post not found.
      </p>
      <Link
        href="/blogs"
        className="blog-sans text-sm hover:underline"
        style={{ color: "var(--blog-hover)" }}
      >
        ← Back to Blog
      </Link>
    </div>
  );
}
