"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Blog } from "@/lib/types";
import { currentPeriodKey, findMonthlyBlogForPeriod, getBlogCategory } from "@/lib/blogUtils";

/**
 * /monthly — one-hop shortcut to this month's update. Falls back to the most
 * recent one, then to the Monthly Updates tab if none exist yet. Logged in, the
 * lookup also sees drafts, so it lands on the post you're still writing.
 */
export default function MonthlyShortcutPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/blogs")
      .then((res) => res.json())
      .then((data) => {
        const blogs: Blog[] = data.blogs || [];
        const target =
          findMonthlyBlogForPeriod(blogs, currentPeriodKey()) ??
          blogs.find((b) => getBlogCategory(b) === "monthly");
        router.replace(target ? `/blogs/${target.id}` : "/blogs?tab=monthly");
      })
      .catch(() => router.replace("/blogs?tab=monthly"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
      <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
