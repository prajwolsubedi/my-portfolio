"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Blog, BlogBlock, HabitTracker } from "@/lib/types";
import HabitTrackerGrid from "./HabitTracker";
import {
  createHabitTracker,
  parseHabitTracker,
  serializeHabitTracker,
} from "@/lib/habitUtils";
import { currentPeriodKey, formatPeriod, parsePeriodKey, resolveBlogPeriod } from "@/lib/blogUtils";

const fontPoppins = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const fontPlayfair = { fontFamily: "var(--font-playfair), Georgia, serif" };

interface HabitTrackerModalProps {
  /** This month's update, or null when it hasn't been started yet. */
  blog: Blog | null;
  onClose: () => void;
  onCreateUpdate: () => void;
}

/**
 * Marking habits is a daily, 20-second job, so it gets its own popup off the
 * dashboard rather than a trip through the post editor.
 */
export default function HabitTrackerModal({
  blog,
  onClose,
  onCreateUpdate,
}: HabitTrackerModalProps) {
  const [blocks, setBlocks] = useState<BlogBlock[]>(blog?.blocks ?? []);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlocks = useRef<BlogBlock[] | null>(null);
  const saveInFlight = useRef(false);

  const period = blog ? resolveBlogPeriod(blog) : currentPeriodKey();
  const now = new Date();
  const { year, month } = parsePeriodKey(period) ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };

  const habitsBlock = blocks.find((b) => b.type === "habits");
  const tracker = habitsBlock
    ? parseHabitTracker(habitsBlock.content, year, month)
    : createHabitTracker(year, month);

  const save = async (next: BlogBlock[]) => {
    if (!blog) return;
    saveInFlight.current = true;
    try {
      const res = await fetch(`/api/blogs/${blog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: next }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      saveInFlight.current = false;
    }
  };

  const handleChange = (next: HabitTracker) => {
    const content = serializeHabitTracker(next);
    // Monthly updates written before the tracker existed have no habits block
    // yet — the first edit adds one.
    const nextBlocks = habitsBlock
      ? blocks.map((b) => (b.id === habitsBlock.id ? { ...b, content } : b))
      : [...blocks, { id: uuidv4(), type: "habits" as const, content }];

    setBlocks(nextBlocks);
    pendingBlocks.current = nextBlocks;
    setSaveState("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save(nextBlocks);
    }, 600);
  };

  /**
   * Writes immediately instead of waiting out the debounce. Skips the write
   * if a save is already in flight — the debounce timer clears itself once
   * it fires, so without this a click landing in that window (timer gone,
   * fetch not yet resolved) would fire a redundant duplicate request.
   */
  const saveNow = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (saveInFlight.current) return;
    if (pendingBlocks.current) await save(pendingBlocks.current);
  };

  // Never close on an unwritten edit.
  const handleClose = async () => {
    await saveNow();
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
      ? "Saved"
      : saveState === "error"
      ? "Couldn't save"
      : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) void handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Habit tracker for ${formatPeriod(period)}`}
        className="w-full rounded-xl my-auto"
        style={{
          maxWidth: "min(1760px, 96vw)",
          backgroundColor: "var(--bg-color)",
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(148,163,184,0.15)" }}
        >
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-secondary)]"
              style={fontPoppins}
            >
              Habit tracker
            </p>
            <h2 className="text-xl font-light text-[var(--text-main)]" style={fontPlayfair}>
              {formatPeriod(period)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {saveLabel && (
              <span
                className="text-xs"
                style={{
                  ...fontPoppins,
                  color: saveState === "error" ? "#f87171" : "var(--text-secondary)",
                }}
              >
                {saveLabel}
              </span>
            )}
            {/* Sits at the top, next to Close, so it's reachable without
                scrolling past a 31-row grid — edits still autosave on their
                own; this just lets you commit on demand. */}
            {blog && (
              <button
                onClick={() => void saveNow()}
                disabled={saveState !== "saving" && saveState !== "error"}
                className="px-3 py-1.5 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                style={fontPoppins}
              >
                Save
              </button>
            )}
            <button
              onClick={() => void handleClose()}
              autoFocus
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
              style={fontPoppins}
              aria-label="Close habit tracker"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {blog ? (
            <HabitTrackerGrid variant="admin" tracker={tracker} onChange={handleChange} />
          ) : (
            <div className="py-16 text-center space-y-4">
              <p className="text-[var(--text-secondary)]" style={fontPoppins}>
                There&apos;s no {formatPeriod(period)} update to track habits against yet.
              </p>
              <button
                onClick={onCreateUpdate}
                className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={fontPoppins}
              >
                Start {formatPeriod(period)} update
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
