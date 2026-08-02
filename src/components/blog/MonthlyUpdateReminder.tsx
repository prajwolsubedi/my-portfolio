"use client";

import { useEffect, useState } from "react";
import type { Blog } from "@/lib/types";
import { currentPeriodKey, findMonthlyBlogForPeriod, formatPeriod } from "@/lib/blogUtils";

// Dismissing hides the nudge for the rest of the day, not the rest of the month —
// an unwritten monthly update is worth bringing up again tomorrow.
const DISMISS_KEY = "monthly-reminder-dismissed";

const fontPoppins = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const fontPlayfair = { fontFamily: "var(--font-playfair), Georgia, serif" };

interface MonthlyUpdateReminderProps {
  blogs: Blog[];
  onStart: () => void;
  onContinue: (blog: Blog) => void;
}

export default function MonthlyUpdateReminder({
  blogs,
  onStart,
  onContinue,
}: MonthlyUpdateReminderProps) {
  // Resolved after mount so the date never differs between server and client.
  const [now, setNow] = useState<Date | null>(null);
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock and localStorage are external state, unreadable during SSR
    setNow(new Date());
    setDismissedOn(localStorage.getItem(DISMISS_KEY));
  }, []);

  if (!now) return null;

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  if (dismissedOn === todayKey) return null;

  const period = currentPeriodKey(now);
  const existing = findMonthlyBlogForPeriod(blogs, period);
  if (existing?.status === "published") return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, todayKey);
    setDismissedOn(todayKey);
  };

  const monthLabel = formatPeriod(period);
  const dayOfMonth = now.getDate();

  const headline = existing
    ? `${monthLabel} update isn't published yet`
    : `No ${monthLabel} update yet`;

  const body = existing
    ? "Pick it back up — mark your habits and add this month's reflections."
    : dayOfMonth <= 7
    ? "Fresh month. Set the vision, list the habits you're tracking, and plan what matters."
    : `You're ${dayOfMonth} days into ${monthLabel.split(" ")[0]} — the sooner it's up, the more you'll actually track.`;

  return (
    <div
      className="mb-8 rounded-xl px-5 py-4 flex items-start justify-between gap-4 flex-wrap"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid rgba(168,212,240,0.25)",
        borderLeft: "3px solid #a8d4f0",
      }}
    >
      <div className="min-w-0">
        <p
          className="text-[10px] uppercase tracking-[0.15em] mb-1"
          style={{ ...fontPoppins, color: "#a8d4f0" }}
        >
          Monthly update
        </p>
        <h2
          className="text-lg font-light text-[var(--text-main)]"
          style={fontPlayfair}
        >
          {headline}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1" style={fontPoppins}>
          {body}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => (existing ? onContinue(existing) : onStart())}
          className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          style={fontPoppins}
        >
          {existing ? "Continue" : `Start ${monthLabel}`}
        </button>
        <button
          onClick={dismiss}
          className="px-2 py-2 text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors text-sm"
          style={fontPoppins}
          title="Hide until tomorrow"
          aria-label="Hide until tomorrow"
        >
          ×
        </button>
      </div>
    </div>
  );
}
