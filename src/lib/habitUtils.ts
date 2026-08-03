import type { DayLog, Habit, HabitTracker, RatingField } from "./types";

// Habit trackers ride inside BlogBlock.content as JSON: the shape is a grid, and
// Firestore refuses nested arrays, so serialising keeps the block schema flat.

type LooseHabit = { id?: unknown; name?: unknown; days?: unknown; hidden?: unknown };
type LooseTracker = {
  year?: unknown;
  month?: unknown;
  habits?: unknown;
  logs?: unknown;
  labels?: unknown;
};

export const RATING_FIELDS: RatingField[] = ["sleep", "mood", "happiness"];
export const RATING_MAX = 10;
export const RATING_LABEL_MAX = 16;

/** Used until the admin renames a column. */
export const RATING_DEFAULT_LABELS: Record<RatingField, string> = {
  sleep: "Slept",
  mood: "Felt",
  happiness: "Happy",
};

export function ratingLabel(tracker: HabitTracker, field: RatingField): string {
  return tracker.labels?.[field]?.trim() || RATING_DEFAULT_LABELS[field];
}

/** Blanking the name restores the default rather than leaving a nameless column. */
export function setRatingLabel(
  tracker: HabitTracker,
  field: RatingField,
  label: string
): HabitTracker {
  const labels = { ...(tracker.labels ?? {}) };
  const name = label.slice(0, RATING_LABEL_MAX);
  if (name.trim() === "") delete labels[field];
  else labels[field] = name;
  return { ...tracker, labels };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** How many days' grace a day gets before an unfilled entry counts as missed. */
export const FILL_GRACE_DAYS = 1;

export type DayStatus = "future" | "open" | "missed";

/**
 * Where a calendar day sits relative to today: not arrived yet, still fillable
 * (today, or within the grace window after it), or past the deadline. `now` is
 * passed in rather than read internally so this stays pure and callers can
 * resolve the real clock client-side, after mount, avoiding an SSR mismatch.
 */
export function dayStatus(year: number, month: number, day: number, now: Date): DayStatus {
  const target = new Date(year, month, day).setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysSinceTarget = Math.round((today - target) / 86_400_000);
  if (daysSinceTarget < 0) return "future";
  if (daysSinceTarget <= FILL_GRACE_DAYS) return "open";
  return "missed";
}

export function createHabitTracker(
  year: number,
  month: number,
  habits: Habit[] = []
): HabitTracker {
  return { year, month, habits, logs: {} };
}

export function parseHabitTracker(
  content: string,
  fallbackYear: number,
  fallbackMonth: number
): HabitTracker {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return createHabitTracker(fallbackYear, fallbackMonth);
  }

  if (!raw || typeof raw !== "object") {
    return createHabitTracker(fallbackYear, fallbackMonth);
  }

  const data = raw as LooseTracker;
  const year = typeof data.year === "number" ? data.year : fallbackYear;
  const month =
    typeof data.month === "number" && data.month >= 0 && data.month <= 11
      ? data.month
      : fallbackMonth;
  const total = daysInMonth(year, month);

  const habits: Habit[] = Array.isArray(data.habits)
    ? data.habits.map((entry, index) => {
        const habit = (entry ?? {}) as LooseHabit;
        return {
          id: typeof habit.id === "string" && habit.id ? habit.id : `habit-${index}`,
          name: typeof habit.name === "string" ? habit.name : "",
          days: normalizeDays(habit.days, total),
          hidden: habit.hidden === true,
        };
      })
    : [];

  return {
    year,
    month,
    habits,
    logs: normalizeLogs(data.logs, total),
    labels: normalizeLabels(data.labels),
  };
}

export function serializeHabitTracker(tracker: HabitTracker): string {
  return JSON.stringify(tracker);
}

export function toggleHabitDay(
  tracker: HabitTracker,
  habitId: string,
  day: number
): HabitTracker {
  return {
    ...tracker,
    habits: tracker.habits.map((habit) =>
      habit.id === habitId
        ? {
            ...habit,
            days: habit.days.includes(day)
              ? habit.days.filter((d) => d !== day)
              : [...habit.days, day].sort((a, b) => a - b),
          }
        : habit
    ),
  };
}

/** Flips whether a habit's column is shown to public readers. Admin-only. */
export function toggleHabitVisibility(tracker: HabitTracker, habitId: string): HabitTracker {
  return {
    ...tracker,
    habits: tracker.habits.map((habit) =>
      habit.id === habitId ? { ...habit, hidden: !habit.hidden } : habit
    ),
  };
}

/**
 * Drops hidden habits entirely, rather than just marking them read-only.
 *
 * Used server-side before a habits block ever reaches a non-admin reader, so a
 * hidden habit's name and daily marks never leave the server — filtering them
 * out only in the rendered UI would still leak the data through the page's
 * source or serialized props.
 */
export function stripHiddenHabits(tracker: HabitTracker): HabitTracker {
  return { ...tracker, habits: tracker.habits.filter((habit) => !habit.hidden) };
}

/** Reorders habits (and so their table columns) by moving one to another slot. */
export function moveHabit(tracker: HabitTracker, fromIndex: number, toIndex: number): HabitTracker {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= tracker.habits.length ||
    toIndex >= tracker.habits.length
  ) {
    return tracker;
  }
  const habits = [...tracker.habits];
  const [moved] = habits.splice(fromIndex, 1);
  habits.splice(toIndex, 0, moved);
  return { ...tracker, habits };
}

export function getDayLog(tracker: HabitTracker, day: number): DayLog {
  return tracker.logs?.[String(day)] ?? {};
}

/** Merges a patch into one day, dropping the entry once it holds nothing. */
export function updateDayLog(
  tracker: HabitTracker,
  day: number,
  patch: Partial<DayLog>
): HabitTracker {
  const logs = { ...(tracker.logs ?? {}) };
  const key = String(day);
  const next: DayLog = { ...(logs[key] ?? {}), ...patch };

  for (const field of Object.keys(next) as (keyof DayLog)[]) {
    const value = next[field];
    if (value === undefined || value === null || value === "") delete next[field];
  }

  if (Object.keys(next).length === 0) delete logs[key];
  else logs[key] = next;

  return { ...tracker, logs };
}

/** Reads a typed score, clamped to the scale. Blank (or 0) clears the rating. */
export function parseRating(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const value = Number(digits);
  if (value < 1) return undefined;
  return Math.min(value, RATING_MAX);
}

export function dayDoneCount(tracker: HabitTracker, day: number): number {
  return tracker.habits.filter((habit) => habit.days.includes(day)).length;
}

/** Re-points a tracker at another month, dropping days that month doesn't have. */
export function moveTrackerToMonth(
  tracker: HabitTracker,
  year: number,
  month: number
): HabitTracker {
  if (tracker.year === year && tracker.month === month) return tracker;
  const total = daysInMonth(year, month);
  const logs: Record<string, DayLog> = {};
  for (const [key, log] of Object.entries(tracker.logs ?? {})) {
    if (Number(key) <= total) logs[key] = log;
  }
  return {
    year,
    month,
    habits: tracker.habits.map((habit) => ({
      ...habit,
      days: habit.days.filter((d) => d <= total),
    })),
    logs,
    labels: tracker.labels,
  };
}

export function trackerTotals(tracker: HabitTracker): {
  done: number;
  possible: number;
  daysLogged: number;
} {
  const total = daysInMonth(tracker.year, tracker.month);
  return {
    done: tracker.habits.reduce((sum, habit) => sum + habit.days.length, 0),
    possible: tracker.habits.length * total,
    daysLogged: Object.keys(tracker.logs ?? {}).length,
  };
}

/** Monthly average for one rating, over the days that were actually rated. */
export function ratingAverage(tracker: HabitTracker, field: RatingField): number | null {
  const values = Object.values(tracker.logs ?? {})
    .map((log) => log[field])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function isTrackerEmpty(tracker: HabitTracker): boolean {
  return tracker.habits.length === 0 && Object.keys(tracker.logs ?? {}).length === 0;
}

function normalizeDays(value: unknown, total: number): number[] {
  if (!Array.isArray(value)) return [];
  const days = value.filter(
    (d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= total
  );
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function normalizeLabels(value: unknown): Partial<Record<RatingField, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = value as Record<string, unknown>;
  const labels: Partial<Record<RatingField, string>> = {};
  for (const field of RATING_FIELDS) {
    const raw = entries[field];
    if (typeof raw !== "string") continue;
    // Keep the name exactly as typed, minus the length cap. Trimming here, or
    // dropping a name that happens to match the default, rewrites the field
    // mid-keystroke: typing a space or the last letter of "Happy" would wipe it.
    const name = raw.slice(0, RATING_LABEL_MAX);
    if (name.trim()) labels[field] = name;
  }
  return labels;
}

function normalizeLogs(value: unknown, total: number): Record<string, DayLog> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const logs: Record<string, DayLog> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 1 || day > total) continue;
    if (!raw || typeof raw !== "object") continue;

    const entry = raw as Record<string, unknown>;
    const log: DayLog = {};
    for (const field of RATING_FIELDS) {
      const rating = entry[field];
      if (
        typeof rating === "number" &&
        Number.isInteger(rating) &&
        rating >= 1 &&
        rating <= RATING_MAX
      ) {
        log[field] = rating;
      }
    }
    if (typeof entry.note === "string" && entry.note.trim()) log.note = entry.note;

    if (Object.keys(log).length > 0) logs[String(day)] = log;
  }
  return logs;
}
