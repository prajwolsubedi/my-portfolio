"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import type { HabitTracker } from "@/lib/types";
import {
  RATING_DEFAULT_LABELS,
  RATING_FIELDS,
  RATING_LABEL_MAX,
  RATING_MAX,
  dayDoneCount,
  dayStatus,
  daysInMonth,
  getDayLog,
  isTrackerEmpty,
  moveHabit,
  parseRating,
  ratingAverage,
  ratingLabel,
  setRatingLabel,
  toggleHabitDay,
  toggleHabitVisibility,
  trackerTotals,
  updateDayLog,
} from "@/lib/habitUtils";
import { formatPeriod, periodKey } from "@/lib/blogUtils";

type Variant = "admin" | "public";

interface Palette {
  text: string;
  muted: string;
  surface: string;
  border: string;
  accent: string;
  accentText: string;
}

const PALETTES: Record<Variant, Palette> = {
  admin: {
    text: "var(--text-main)",
    muted: "var(--text-secondary)",
    surface: "var(--card-bg)",
    border: "rgba(148,163,184,0.18)",
    accent: "#a8d4f0",
    accentText: "#0f0f0f",
  },
  public: {
    text: "var(--blog-text)",
    muted: "var(--blog-text-secondary)",
    surface: "var(--blog-card)",
    border: "var(--blog-border)",
    accent: "var(--blog-hover)",
    accentText: "var(--blog-bg)",
  },
};

/** Habit names only get truncated past this length. */
const HABIT_NAME_VISIBLE_CHARS = 100;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const fontPoppins = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
const fontPlayfair = { fontFamily: "var(--font-playfair), Georgia, serif" };

interface HabitTrackerGridProps {
  tracker: HabitTracker;
  variant?: Variant;
  readOnly?: boolean;
  onChange?: (next: HabitTracker) => void;
}

export default function HabitTrackerGrid({
  tracker,
  variant = "public",
  readOnly = false,
  onChange,
}: HabitTrackerGridProps) {
  const palette = PALETTES[variant];
  const editable = !readOnly && !!onChange;
  const total = daysInMonth(tracker.year, tracker.month);
  const [newHabit, setNewHabit] = useState("");
  // Resolved after mount so prerendered markup and the client agree on the
  // date. Drives both the "today" highlight and the missed-day dashes below —
  // the latter needs the real clock regardless of which month is on screen,
  // since a fully past month should read as missed throughout.
  const [now, setNow] = useState<Date | null>(null);

  const days = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const day = i + 1;
        const weekday = new Date(tracker.year, tracker.month, day).getDay();
        return { day, weekday, weekend: weekday === 0 || weekday === 6 };
      }),
    [total, tracker.year, tracker.month]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the real clock is external state, unknowable during SSR
    setNow(new Date());
  }, []);

  const today =
    now && now.getFullYear() === tracker.year && now.getMonth() === tracker.month
      ? now.getDate()
      : null;

  // A hidden habit drops out of the grid itself — for the admin too, not just
  // readers. Clicking the eye icon needs a visible, immediate effect or it
  // reads as broken; toggling it back on happens from the chip strip below,
  // which lists every habit regardless of hidden state. Filtering here is
  // also a defense-in-depth backstop for readers — the real barrier is the
  // server never sending a hidden habit's data to a signed-out request.
  const tableHabits = tracker.habits.filter((h) => !h.hidden);
  const tableTracker = { ...tracker, habits: tableHabits };
  const { done, possible, daysLogged } = trackerTotals(tableTracker);
  const hasHabits = tableHabits.length > 0;
  const todayTint = `color-mix(in srgb, ${palette.accent} 9%, ${palette.surface})`;

  // Stable so React only runs it on mount. Sizing all 31 notes on every render
  // forces a reflow per textarea, which makes typing crawl; the edited one
  // resizes itself in onChange instead. Measuring waits a frame because column
  // widths aren't settled at mount, and a too-narrow cell reports extra lines.
  const sizeNote = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    requestAnimationFrame(() => {
      if (el.isConnected) fitToContent(el);
    });
  }, []);

  const addHabit = () => {
    const name = newHabit.trim();
    if (!name || !onChange) return;
    onChange({
      ...tracker,
      habits: [...tracker.habits, { id: uuidv4(), name, days: [] }],
    });
    setNewHabit("");
  };

  const renameHabit = (habitId: string, name: string) => {
    onChange?.({
      ...tracker,
      habits: tracker.habits.map((h) => (h.id === habitId ? { ...h, name } : h)),
    });
  };

  const removeHabit = (habitId: string) => {
    onChange?.({
      ...tracker,
      habits: tracker.habits.filter((h) => h.id !== habitId),
    });
  };

  const toggleVisibility = (habitId: string) => {
    onChange?.(toggleHabitVisibility(tracker, habitId));
  };

  // Drag-to-reorder lives only on the chip strip below the grid, not on the
  // table's own headers — dragIndex tracks which chip is mid-drag so it can
  // be dimmed, and the drop target just needs to know its own index.
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleChipDragStart = (index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Firefox won't start a drag without data being set.
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleChipDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleChipDrop = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onChange?.(moveHabit(tracker, dragIndex, index));
    }
    setDragIndex(null);
  };

  if (!editable && isTrackerEmpty(tableTracker)) return null;

  return (
    <section
      className="habit-grid my-8 rounded-xl overflow-hidden"
      style={{ border: `1px solid ${palette.border}`, backgroundColor: palette.surface }}
    >
      {/* Header */}
      <div
        className="flex items-baseline justify-between gap-4 px-6 py-5 flex-wrap"
        style={{ borderBottom: `1px solid ${palette.border}` }}
      >
        <div>
          <p
            className="text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-[0.15em] opacity-70"
            style={{ ...fontPoppins, color: palette.muted }}
          >
            Habits &amp; Daily Log
          </p>
          <h3
            className="text-lg sm:text-xl lg:text-2xl font-light"
            style={{ ...fontPlayfair, color: palette.text }}
          >
            {formatPeriod(periodKey(tracker.year, tracker.month))}
          </h3>
        </div>
        <p className="text-xs sm:text-sm shrink-0" style={{ ...fontPoppins, color: palette.muted }}>
          {hasHabits && `${done}/${possible} marked · `}
          {daysLogged} {daysLogged === 1 ? "day" : "days"} logged
        </p>
      </div>

      {/* Grid: days down the side, habits across the top */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={fontPoppins}>
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 text-left text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider font-normal align-bottom px-6 pt-4 pb-3 w-[84px] sm:w-[90px] lg:w-[96px] min-w-[84px] sm:min-w-[90px] lg:min-w-[96px]"
                style={{
                  color: palette.muted,
                  backgroundColor: palette.surface,
                  borderBottom: `1px solid ${palette.border}`,
                }}
              >
                Day
              </th>

              {tableHabits.map((habit) => (
                <th
                  key={habit.id}
                  title={habit.name || "Untitled habit"}
                  className="font-normal align-bottom p-0 w-[40px] min-w-[40px]"
                  style={{ borderBottom: `1px solid ${palette.border}` }}
                >
                  {/* The header grows to fit the longest habit name rather than
                      clipping it; the cap is only there so a runaway name can't
                      push the header off the screen. Padding and margin are set
                      as physical CSS here, not Tailwind's py and mx utilities:
                      those compile to logical padding-block and margin-inline,
                      which writing-mode vertical-rl remaps to left and right
                      instead of top and bottom, silently erasing the vertical
                      spacing we actually want. */}
                  <div
                    className="text-xs lg:text-sm"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      marginLeft: "auto",
                      marginRight: "auto",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      minHeight: "120px",
                      maxHeight: `${HABIT_NAME_VISIBLE_CHARS}ch`,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: palette.text,
                    }}
                  >
                    {habit.name || "Untitled habit"}
                  </div>
                </th>
              ))}

              {hasHabits && (
                <th
                  className="font-normal text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider align-bottom px-3 pt-4 pb-3 w-[52px] sm:w-[56px] lg:w-[60px] min-w-[52px] sm:min-w-[56px] lg:min-w-[60px]"
                  style={{ color: palette.muted, borderBottom: `1px solid ${palette.border}` }}
                >
                  Done
                </th>
              )}

              {RATING_FIELDS.map((field) => (
                <th
                  key={field}
                  className="font-normal text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider align-bottom px-2 pt-4 pb-3 w-[58px] sm:w-[62px] lg:w-[66px] min-w-[58px] sm:min-w-[62px] lg:min-w-[66px]"
                  style={{ color: palette.muted, borderBottom: `1px solid ${palette.border}` }}
                >
                  <span className="block leading-tight">{ratingLabel(tracker, field)}</span>
                  <span className="block leading-tight opacity-60">/{RATING_MAX}</span>
                </th>
              ))}

              <th
                className="font-normal text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider text-left align-bottom px-5 pt-4 pb-3 min-w-[220px]"
                style={{ color: palette.muted, borderBottom: `1px solid ${palette.border}` }}
              >
                The day
              </th>
            </tr>
          </thead>

          <tbody>
            {days.map(({ day, weekday, weekend }) => {
              const isToday = day === today;
              const rowBg = isToday ? todayTint : palette.surface;
              const log = getDayLog(tracker, day);
              // Defaults to "open" before the clock resolves post-mount, so
              // nothing flashes as missed during the first render.
              const dayStat = now ? dayStatus(tracker.year, tracker.month, day, now) : "open";

              return (
                <tr key={day} style={{ backgroundColor: isToday ? todayTint : undefined }}>
                  <td
                    className="sticky left-0 z-10 px-6 py-2.5"
                    style={{
                      backgroundColor: rowBg,
                      borderBottom: `1px solid ${palette.border}`,
                    }}
                  >
                    <span
                      className="text-sm sm:text-base lg:text-lg tabular-nums"
                      style={{ color: isToday ? palette.accent : palette.text }}
                    >
                      {day}
                    </span>
                    <span
                      className="text-[10px] sm:text-[11px] lg:text-xs ml-1.5"
                      style={{ color: palette.muted, opacity: weekend ? 0.6 : 1 }}
                    >
                      {WEEKDAYS[weekday]}
                    </span>
                  </td>

                  {tableHabits.map((habit) => {
                    const marked = habit.days.includes(day);
                    // A dash appears only once a day is both unfilled and past
                    // its one-day grace period — checking it later clears the
                    // dash the same as any other cell, so nothing is locked.
                    const missed = !marked && dayStat === "missed";
                    const label = missed
                      ? `${habit.name || "Habit"} — day ${day}, missed`
                      : `${habit.name || "Habit"} — day ${day}`;
                    const boxStyle = {
                      backgroundColor: marked ? palette.accent : "transparent",
                      border: marked ? "none" : `1px solid ${palette.border}`,
                      color: palette.muted,
                    };
                    return (
                      <td
                        key={habit.id}
                        className="p-0 text-center"
                        style={{ borderBottom: `1px solid ${palette.border}` }}
                      >
                        {readOnly ? (
                          <span
                            className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] my-1.5 align-middle text-[11px] lg:text-xs leading-none"
                            style={boxStyle}
                            title={label}
                          >
                            {missed ? "–" : null}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onChange?.(toggleHabitDay(tracker, habit.id, day))}
                            aria-pressed={marked}
                            aria-label={label}
                            title={label}
                            className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[5px] my-1.5 align-middle transition-colors hover:opacity-80 cursor-pointer text-[11px] lg:text-xs leading-none"
                            style={boxStyle}
                          >
                            {missed ? "–" : null}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {hasHabits && (
                    <td
                      className="px-3 py-2.5 text-center text-xs sm:text-sm tabular-nums"
                      style={{ color: palette.muted, borderBottom: `1px solid ${palette.border}` }}
                    >
                      {dayDoneCount(tableTracker, day)}
                    </td>
                  )}

                  {RATING_FIELDS.map((field) => (
                    <td
                      key={field}
                      className="px-2 py-2.5"
                      style={{ borderBottom: `1px solid ${palette.border}` }}
                    >
                      <RatingScore
                        value={log[field]}
                        palette={palette}
                        readOnly={readOnly}
                        label={`${ratingLabel(tracker, field)} on day ${day}, out of ${RATING_MAX}`}
                        onSet={(value) =>
                          onChange?.(updateDayLog(tracker, day, { [field]: value }))
                        }
                      />
                    </td>
                  ))}

                  <td
                    className="px-5 py-2.5"
                    style={{ borderBottom: `1px solid ${palette.border}` }}
                  >
                    {readOnly ? (
                      <p
                        className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
                        style={{ color: palette.text }}
                      >
                        {log.note}
                      </p>
                    ) : (
                      <textarea
                        rows={1}
                        value={log.note ?? ""}
                        onChange={(e) => {
                          fitToContent(e.currentTarget);
                          onChange?.(updateDayLog(tracker, day, { note: e.target.value }));
                        }}
                        // Repeating the hint on all 31 rows is just noise.
                        placeholder={isToday ? "How the day went…" : ""}
                        className="w-full bg-transparent text-sm sm:text-base leading-relaxed resize-none overflow-hidden focus:outline-none"
                        style={{ color: palette.text }}
                        ref={sizeNote}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {(hasHabits || daysLogged > 0) && (
            <tfoot>
              <tr>
                <td
                  className="sticky left-0 z-10 px-6 py-3.5 text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider"
                  style={{ color: palette.muted, backgroundColor: palette.surface }}
                >
                  Total
                </td>
                {tableHabits.map((habit) => (
                  <td
                    key={habit.id}
                    className="px-0 py-3.5 text-center text-xs sm:text-sm tabular-nums"
                    style={{ color: palette.text }}
                  >
                    {habit.days.length}
                  </td>
                ))}
                {hasHabits && (
                  <td
                    className="px-3 py-3.5 text-center text-xs sm:text-sm tabular-nums"
                    style={{ color: palette.text }}
                  >
                    {done}
                  </td>
                )}
                {RATING_FIELDS.map((field) => {
                  const avg = ratingAverage(tracker, field);
                  return (
                    <td
                      key={field}
                      className="px-2 py-3.5 text-center text-xs sm:text-sm tabular-nums"
                      style={{ color: palette.text }}
                      title={`Average ${ratingLabel(tracker, field).toLowerCase()} this month, out of ${RATING_MAX}`}
                    >
                      {avg === null ? "—" : avg.toFixed(1)}
                    </td>
                  );
                })}
                <td className="px-5 py-3.5 text-xs sm:text-sm" style={{ color: palette.muted }}>
                  {daysLogged} of {total} days
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Setup strip: what the columns are. Sits under the grid so the table
          itself stays free of controls. */}
      {editable && (
        <div
          className="px-6 py-5 grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_300px]"
          style={{ borderTop: `1px solid ${palette.border}` }}
        >
          <div className="space-y-3">
            <p
              className="text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-[0.15em]"
              style={{ color: palette.muted }}
            >
              Habits
            </p>
          {tracker.habits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {/* Numbered in table-column order — habit 1 here is the first
                  column in the grid above. Drag the grip to reorder; the whole
                  chip is the drop target so you don't need to aim precisely.
                  Lists every habit, hidden or not — this is the only place a
                  hidden one can be managed since it drops out of the grid
                  itself. */}
              {tracker.habits.map((habit, index) => (
                <div
                  key={habit.id}
                  onDragOver={handleChipDragOver}
                  onDrop={handleChipDrop(index)}
                  className="flex items-center gap-1.5 rounded-full pl-1.5 pr-1.5 py-1 transition-opacity"
                  style={{
                    border: `1px solid ${palette.border}`,
                    opacity: dragIndex === index ? 0.4 : habit.hidden ? 0.55 : 1,
                  }}
                >
                  {/* Decorative drag handle — native HTML5 drag has no
                      keyboard equivalent, so this isn't exposed as an
                      interactive control; the tooltip is a mouse-only hint. */}
                  <span
                    draggable
                    onDragStart={handleChipDragStart(index)}
                    onDragEnd={() => setDragIndex(null)}
                    className="shrink-0 cursor-grab active:cursor-grabbing select-none"
                    style={{ color: palette.muted }}
                    title={`Drag to reorder ${habit.name || "habit"}`}
                    aria-hidden="true"
                  >
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
                      <circle cx="2.5" cy="2.5" r="1.4" />
                      <circle cx="7.5" cy="2.5" r="1.4" />
                      <circle cx="2.5" cy="8" r="1.4" />
                      <circle cx="7.5" cy="8" r="1.4" />
                      <circle cx="2.5" cy="13.5" r="1.4" />
                      <circle cx="7.5" cy="13.5" r="1.4" />
                    </svg>
                  </span>
                  <span
                    className="shrink-0 text-[10px] sm:text-[11px] lg:text-xs tabular-nums w-4 text-center"
                    style={{ color: palette.muted }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={habit.name}
                    onChange={(e) => renameHabit(habit.id, e.target.value)}
                    placeholder="Habit name"
                    className="bg-transparent text-sm sm:text-base w-[120px] focus:outline-none"
                    style={{ color: palette.text }}
                    aria-label={`Habit ${index + 1} name`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(habit.id)}
                    className="shrink-0 px-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: palette.muted }}
                    title={
                      habit.hidden
                        ? `Hidden from readers — show ${habit.name || "habit"}`
                        : `Visible to readers — hide ${habit.name || "habit"}`
                    }
                    aria-label={
                      habit.hidden
                        ? `Show ${habit.name || "habit"} to readers`
                        : `Hide ${habit.name || "habit"} from readers`
                    }
                    aria-pressed={!!habit.hidden}
                  >
                    {habit.hidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHabit(habit.id)}
                    className="text-xs sm:text-sm px-1 opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: palette.muted }}
                    title={`Remove ${habit.name || "habit"}`}
                    aria-label={`Remove ${habit.name || "habit"}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHabit();
                }
              }}
              placeholder="Add a habit (e.g. Read 20 pages)"
              className="flex-1 bg-transparent text-sm sm:text-base focus:outline-none rounded-lg px-3 py-2"
              style={{ color: palette.text, border: `1px solid ${palette.border}` }}
            />
            <button
              type="button"
              onClick={addHabit}
              disabled={!newHabit.trim()}
              className="text-xs sm:text-sm uppercase tracking-wider px-3 py-2 rounded-lg transition-opacity disabled:opacity-40"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              Add
            </button>
          </div>
          </div>

          {/* Column names for the three score columns. Blank keeps the default. */}
          <div className="space-y-3">
            <p
              className="text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-[0.15em]"
              style={{ color: palette.muted }}
            >
              Score columns
            </p>
            <div className="space-y-2">
              {RATING_FIELDS.map((field) => (
                <div
                  key={field}
                  className="flex items-center gap-2 rounded-lg pl-3 pr-2.5 py-2"
                  style={{ border: `1px solid ${palette.border}` }}
                >
                  <input
                    type="text"
                    maxLength={RATING_LABEL_MAX}
                    value={tracker.labels?.[field] ?? ""}
                    onChange={(e) => onChange?.(setRatingLabel(tracker, field, e.target.value))}
                    placeholder={RATING_DEFAULT_LABELS[field]}
                    aria-label={`Name for the "${RATING_DEFAULT_LABELS[field]}" column`}
                    className="flex-1 min-w-0 bg-transparent text-sm sm:text-base focus:outline-none"
                    style={{ color: palette.text }}
                  />
                  <span
                    className="text-[10px] sm:text-[11px] lg:text-xs shrink-0"
                    style={{ color: palette.muted }}
                  >
                    /{RATING_MAX}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function fitToContent(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RatingScore({
  value,
  palette,
  readOnly,
  label,
  onSet,
}: {
  value: number | undefined;
  palette: Palette;
  readOnly: boolean;
  label: string;
  onSet: (value: number | undefined) => void;
}) {
  if (readOnly) {
    return (
      <span
        className="block text-center text-sm sm:text-base tabular-nums"
        style={{ color: value === undefined ? palette.muted : palette.text }}
        title={label}
      >
        {value ?? "–"}
      </span>
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={value ?? ""}
      onChange={(e) => onSet(parseRating(e.target.value))}
      placeholder="–"
      aria-label={label}
      title={label}
      className="w-full text-center text-sm sm:text-base tabular-nums bg-transparent focus:outline-none"
      style={{ color: palette.text }}
    />
  );
}
