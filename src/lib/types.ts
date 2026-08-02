export interface BlogBlock {
  id: string;
  type: "text" | "image" | "video" | "youtube" | "habits";
  content: string; // text content, URL for image/video, video ID for youtube, or JSON for habits
  caption?: string; // optional caption for images/videos/youtube
}

export interface Habit {
  id: string;
  name: string;
  days: number[]; // days of the month (1-31) marked done
}

/** How a single day went, beyond the habit checkboxes. */
export interface DayLog {
  sleep?: number; // 1-5
  mood?: number; // 1-5
  happiness?: number; // 1-5
  note?: string;
}

export type RatingField = "sleep" | "mood" | "happiness";

export interface HabitTracker {
  year: number;
  month: number; // 0-11, same convention as Date#getMonth
  habits: Habit[];
  logs?: Record<string, DayLog>; // keyed by day of month, "1".."31"
  labels?: Partial<Record<RatingField, string>>; // column names; absent means default
}

export interface Blog {
  id: string;
  title: string;
  blocks: BlogBlock[];
  status: "published" | "archived" | "draft";
  category?: "daily" | "monthly";
  visibility?: "public" | "private";
  period?: string; // "YYYY-MM" — the month a monthly update covers
  createdAt: number;
  updatedAt: number;
}
