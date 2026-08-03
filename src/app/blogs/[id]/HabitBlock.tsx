"use client";

import dynamic from "next/dynamic";
import type { BlogBlock } from "@/lib/types";
import { parseHabitTracker } from "@/lib/habitUtils";

// A route preloads every client chunk it statically references, so a plain
// import here would send the grid to text-only posts as well. Loading it
// through `next/dynamic` puts it behind an import() that is only resolved when
// a habits block actually renders. Server rendering stays on, so the grid is
// still in the HTML for the posts that do have one.
const HabitTrackerGrid = dynamic(() => import("@/components/blog/HabitTracker"));

/**
 * A habit grid inside a post — always read-only. Editing habit data only ever
 * happens from /blogs/admin (see src/middleware.ts), so this component has no
 * `onChange` to offer, on purpose: there is nothing here for an admin session
 * to unlock.
 *
 * Its own module on purpose. The server page references this only for blocks
 * of type "habits", so the grid — the largest client component on the blog —
 * is fetched only by the posts that actually show one. An ordinary text post
 * never downloads any of it.
 */
export default function HabitBlock({
  block,
  year,
  month,
}: {
  block: BlogBlock;
  year: number;
  month: number;
}) {
  return (
    <HabitTrackerGrid variant="public" tracker={parseHabitTracker(block.content, year, month)} readOnly />
  );
}
