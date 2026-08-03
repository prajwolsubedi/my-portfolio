import { redirect } from "next/navigation";
import { listBlogSummaries } from "@/lib/blogStore";
import {
  currentPeriodKey,
  findMonthlyBlogForPeriod,
  getBlogCategory,
  isVisibleToPublic,
} from "@/lib/blogUtils";

/**
 * /monthly — one-hop shortcut to this month's update. Falls back to the most
 * recent one, then to the Monthly Updates tab if none exist yet.
 *
 * Resolved on the server: the browser follows a redirect instead of loading a
 * page, booting React, downloading every post, and only then navigating. The
 * lookup runs against the cached summary list, so it usually costs nothing.
 */
export const revalidate = 3600;

export default async function MonthlyShortcutPage() {
  const blogs = (await listBlogSummaries()).filter(isVisibleToPublic);

  const target =
    findMonthlyBlogForPeriod(blogs, currentPeriodKey()) ??
    blogs.find((blog) => getBlogCategory(blog) === "monthly");

  redirect(target ? `/blogs/${target.id}` : "/blogs?tab=monthly");
}
