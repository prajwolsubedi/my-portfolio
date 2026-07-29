import type { Blog } from "./types";

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
