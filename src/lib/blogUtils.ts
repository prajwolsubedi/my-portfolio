import type { Blog } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMonthYear(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function getBlogCategory(blog: Pick<Blog, "category">): "daily" | "monthly" {
  return blog.category === "monthly" ? "monthly" : "daily";
}

export function getBlogVisibility(blog: Pick<Blog, "visibility">): "public" | "private" {
  return blog.visibility === "private" ? "private" : "public";
}

export function isVisibleToPublic(blog: Pick<Blog, "status" | "visibility">): boolean {
  return blog.status === "published" && getBlogVisibility(blog) !== "private";
}

/* ── Monthly periods ─────────────────────────────────────────────────────── */

/** A month identifier, e.g. 2026-08. */
export function periodKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function currentPeriodKey(now: Date = new Date()): string {
  return periodKey(now.getFullYear(), now.getMonth());
}

export function parsePeriodKey(
  key: string | undefined | null
): { year: number; month: number } | null {
  if (typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

export function formatPeriod(key: string): string {
  const parsed = parsePeriodKey(key);
  if (!parsed) return key;
  return `${MONTH_NAMES[parsed.month]} ${parsed.year}`;
}

export function shiftPeriod(key: string, months: number): string {
  const parsed = parsePeriodKey(key);
  if (!parsed) return key;
  const d = new Date(parsed.year, parsed.month + months, 1);
  return periodKey(d.getFullYear(), d.getMonth());
}

/**
 * Which month a monthly update covers. Posts written before `period` existed
 * (and any saved without one) fall back to their title — "August 2026" — and
 * finally to the month they were created in.
 */
export function resolveBlogPeriod(
  blog: Pick<Blog, "period" | "title" | "createdAt">
): string {
  if (parsePeriodKey(blog.period)) return blog.period as string;

  const fromTitle = periodFromTitle(blog.title);
  if (fromTitle) return fromTitle;

  const created = new Date(blog.createdAt);
  return periodKey(created.getFullYear(), created.getMonth());
}

export function findMonthlyBlogForPeriod<T extends Pick<Blog, "category" | "period" | "title" | "createdAt">>(
  blogs: T[],
  period: string
): T | undefined {
  return blogs.find(
    (blog) => getBlogCategory(blog) === "monthly" && resolveBlogPeriod(blog) === period
  );
}

function periodFromTitle(title: string): string | null {
  if (!title) return null;
  const match = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\b[\\s,]+(\\d{4})`, "i").exec(title);
  if (!match) return null;
  const month = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === match[1].toLowerCase()
  );
  if (month < 0) return null;
  return periodKey(Number(match[2]), month);
}
