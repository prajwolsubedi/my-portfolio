"use client";

import { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Blog, BlogBlock } from "@/lib/types";
import {
  currentPeriodKey,
  formatPeriod,
  parsePeriodKey,
  resolveBlogPeriod,
} from "@/lib/blogUtils";
import {
  createHabitTracker,
  moveTrackerToMonth,
  parseHabitTracker,
  serializeHabitTracker,
} from "@/lib/habitUtils";
import HabitTrackerGrid from "./HabitTracker";

interface BlogEditorProps {
  blog: Blog | null;
  onDone: () => void;
  /** Pre-fills a brand new post as a monthly update. */
  preset?: "monthly" | null;
}

/** A fresh, empty tracker pointed at the month the post covers. */
function makeHabitsBlock(period: string): BlogBlock {
  const now = new Date();
  const { year, month } = parsePeriodKey(period) ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };
  return {
    id: uuidv4(),
    type: "habits",
    content: serializeHabitTracker(createHabitTracker(year, month)),
  };
}

export default function BlogEditor({ blog, onDone, preset = null }: BlogEditorProps) {
  const initialPeriod = blog ? resolveBlogPeriod(blog) : currentPeriodKey();
  const initialCategory: "daily" | "monthly" = blog
    ? blog.category === "monthly"
      ? "monthly"
      : "daily"
    : preset === "monthly"
    ? "monthly"
    : "daily";

  const [title, setTitle] = useState(
    blog?.title || (preset === "monthly" ? formatPeriod(initialPeriod) : "")
  );
  const [category, setCategory] = useState<"daily" | "monthly">(initialCategory);
  const [period, setPeriod] = useState(initialPeriod);
  const [visibility, setVisibility] = useState<"public" | "private">(
    blog?.visibility === "private" ? "private" : "public"
  );
  const [blocks, setBlocks] = useState<BlogBlock[]>(() => {
    if (blog?.blocks) return blog.blocks;
    const first: BlogBlock = { id: uuidv4(), type: "text", content: "" };
    return preset === "monthly" ? [first, makeHabitsBlock(initialPeriod)] : [first];
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBlockType, setPendingBlockType] = useState<"image" | "youtube" | null>(null);
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);
  const [pendingYoutubeTitle, setPendingYoutubeTitle] = useState("");
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [youtubeModalTitle, setYoutubeModalTitle] = useState("");
  const [pendingYoutubeUploads, setPendingYoutubeUploads] = useState<
    Record<string, { file: File; title: string; previewUrl: string }>
  >({});

  const fontPoppins = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };
  const fontPlayfair = { fontFamily: "var(--font-playfair), Georgia, serif" };

  const updateBlock = (id: string, updates: Partial<BlogBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setPendingYoutubeUploads((prev) => {
      if (!prev[id]) return prev;
      URL.revokeObjectURL(prev[id].previewUrl);
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addBlock = (type: BlogBlock["type"], afterIndex: number) => {
    if (type === "image") {
      setPendingBlockType(type);
      setPendingInsertIndex(afterIndex);
      fileInputRef.current?.click();
      return;
    }
    if (type === "youtube") {
      setYoutubeModalTitle(title || "Blog video");
      setPendingInsertIndex(afterIndex);
      setYoutubeModalOpen(true);
      return;
    }
    const newBlock: BlogBlock =
      type === "habits" ? makeHabitsBlock(period) : { id: uuidv4(), type, content: "" };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock);
      return next;
    });
  };

  // Monthly updates get a tracker by default — it's the point of the section.
  const handleCategoryChange = (next: "daily" | "monthly") => {
    setCategory(next);
    if (next !== "monthly") return;
    if (!title.trim()) setTitle(formatPeriod(period));
    setBlocks((prev) =>
      prev.some((b) => b.type === "habits") ? prev : [...prev, makeHabitsBlock(period)]
    );
  };

  const handlePeriodChange = (next: string) => {
    const parsed = parsePeriodKey(next);
    if (!parsed) return;
    // Keep an auto-generated title ("July 2026") in step with the month.
    if (title.trim() === formatPeriod(period)) setTitle(formatPeriod(next));
    setPeriod(next);
    setBlocks((prev) =>
      prev.map((b) =>
        b.type === "habits"
          ? {
              ...b,
              content: serializeHabitTracker(
                moveTrackerToMonth(
                  parseHabitTracker(b.content, parsed.year, parsed.month),
                  parsed.year,
                  parsed.month
                )
              ),
            }
          : b
      )
    );
  };

  const confirmYoutubeTitle = () => {
    const videoTitle = youtubeModalTitle.trim();
    if (!videoTitle) return;
    setPendingYoutubeTitle(videoTitle);
    setPendingBlockType("youtube");
    setYoutubeModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingBlockType === null || pendingInsertIndex === null) return;

    const blockId = uuidv4();

    // YouTube uploads cost quota and take time, so stage the file with a
    // local preview and require an explicit confirm instead of auto-uploading
    // the moment a file is picked (easy to select the wrong clip otherwise).
    if (pendingBlockType === "youtube") {
      const previewUrl = URL.createObjectURL(file);
      const placeholderBlock: BlogBlock = {
        id: blockId,
        type: "youtube",
        content: "",
        caption: pendingYoutubeTitle,
      };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(pendingInsertIndex + 1, 0, placeholderBlock);
        return next;
      });
      setPendingYoutubeUploads((prev) => ({
        ...prev,
        [blockId]: { file, title: pendingYoutubeTitle, previewUrl },
      }));
      setPendingBlockType(null);
      setPendingInsertIndex(null);
      setPendingYoutubeTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const placeholderBlock: BlogBlock = {
      id: blockId,
      type: pendingBlockType,
      content: "",
    };

    setBlocks((prev) => {
      const next = [...prev];
      next.splice(pendingInsertIndex + 1, 0, placeholderBlock);
      return next;
    });

    setUploading(blockId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content: data.url } : b)));
      } else {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        alert(data.error || "Upload failed");
      }
    } catch {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      alert("Upload failed");
    }

    setUploading(null);
    setPendingBlockType(null);
    setPendingInsertIndex(null);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadPendingYoutube = async (blockId: string) => {
    const pending = pendingYoutubeUploads[blockId];
    if (!pending) return;

    setUploading(blockId);

    try {
      const formData = new FormData();
      formData.append("file", pending.file);
      formData.append("title", pending.title);

      const res = await fetch("/api/upload-youtube", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content: data.videoId } : b)));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    }

    URL.revokeObjectURL(pending.previewUrl);
    setPendingYoutubeUploads((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
    setUploading(null);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    setBlocks((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      alert("Please add a title");
      return;
    }

    setSaving(true);

    try {
      const url = blog ? `/api/blogs/${blog.id}` : "/api/blogs";
      const method = blog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          blocks,
          status,
          category,
          visibility,
          ...(category === "monthly" ? { period } : {}),
        }),
      });

      if (res.ok) {
        onDone();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] py-8">
      <div className="blog-shell">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onDone}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
            style={fontPoppins}
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="px-4 py-2 border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] rounded-lg text-sm hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors disabled:opacity-50"
              style={fontPoppins}
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave("published")}
              disabled={saving}
              className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={fontPoppins}
            >
              {saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>

        {/* Category toggle */}
        <div className="flex gap-2 mb-6 items-center flex-wrap">
          {(["daily", "monthly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCategoryChange(c)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                category === c
                  ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                  : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
              style={fontPoppins}
            >
              {c === "daily" ? "Daily" : "Monthly Update"}
            </button>
          ))}
          {category === "monthly" && (
            <label
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] ml-1"
              style={fontPoppins}
            >
              <span className="text-[10px] uppercase tracking-wider">Month</span>
              <input
                type="month"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="bg-transparent border border-[var(--text-secondary)]/30 rounded-full px-3 py-1 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#a8d4f0]"
                style={fontPoppins}
              />
            </label>
          )}
        </div>

        {/* Visibility toggle */}
        <div className="flex gap-2 mb-6">
          {(["public", "private"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                visibility === v
                  ? "bg-[var(--text-main)] text-[var(--bg-color)]"
                  : "border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
              style={fontPoppins}
            >
              {v === "private" ? "🔒 Private" : "🌐 Public"}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={category === "monthly" ? "e.g. July 2026" : "Post title..."}
          className="w-full bg-transparent text-3xl sm:text-4xl font-light text-[var(--text-main)] placeholder-[var(--text-secondary)]/30 focus:outline-none mb-10"
          style={{ ...fontPlayfair, letterSpacing: "-0.02em" }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Content Blocks */}
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div key={block.id} className="relative p-4 -mx-4 rounded-lg border border-transparent hover:border-[var(--text-secondary)]/10 hover:bg-[var(--card-bg)]/30 transition-all group">
              {/* Block controls */}
              <div className="absolute -left-8 top-2 flex flex-col gap-0.5">
                {index > 0 && (
                  <button
                    onClick={() => moveBlock(index, "up")}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs p-1"
                    title="Move up"
                  >
                    ↑
                  </button>
                )}
                {index < blocks.length - 1 && (
                  <button
                    onClick={() => moveBlock(index, "down")}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs p-1"
                    title="Move down"
                  >
                    ↓
                  </button>
                )}
              </div>

              {/* Text Block */}
              {block.type === "text" && (
                <textarea
                  value={block.content}
                  onChange={(e) => {
                    updateBlock(block.id, { content: e.target.value });
                    // Auto-resize
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  placeholder="Write your text here..."
                  className="w-full bg-transparent text-[var(--text-main)] text-base leading-[1.8] placeholder-[var(--text-secondary)]/30 focus:outline-none resize-none overflow-hidden min-h-[80px]"
                  style={fontPoppins}
                  onFocus={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />
              )}

              {/* Image Block */}
              {block.type === "image" && (
                <div className="rounded-lg overflow-hidden">
                  {block.content ? (
                    <img
                      src={block.content}
                      alt={block.caption || "Blog image"}
                      className="w-full rounded-lg"
                    />
                  ) : uploading === block.id ? (
                    <div className="w-full h-48 bg-[var(--card-bg)] rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm" style={fontPoppins}>
                        <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </div>
                    </div>
                  ) : null}
                  {block.content && (
                    <input
                      type="text"
                      value={block.caption || ""}
                      onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                      placeholder="Add a caption (optional)"
                      className="w-full bg-transparent text-sm text-[var(--text-secondary)] placeholder-[var(--text-secondary)]/30 focus:outline-none mt-2 text-center italic"
                      style={fontPoppins}
                    />
                  )}
                </div>
              )}

              {/* Video Block */}
              {block.type === "video" && (
                <div className="rounded-lg overflow-hidden">
                  {block.content ? (
                    <video
                      src={block.content}
                      controls
                      className="w-full rounded-lg"
                      preload="metadata"
                    />
                  ) : uploading === block.id ? (
                    <div className="w-full h-48 bg-[var(--card-bg)] rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm" style={fontPoppins}>
                        <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </div>
                    </div>
                  ) : null}
                  {block.content && (
                    <input
                      type="text"
                      value={block.caption || ""}
                      onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                      placeholder="Add a caption (optional)"
                      className="w-full bg-transparent text-sm text-[var(--text-secondary)] placeholder-[var(--text-secondary)]/30 focus:outline-none mt-2 text-center italic"
                      style={fontPoppins}
                    />
                  )}
                </div>
              )}

              {/* YouTube Block */}
              {block.type === "youtube" && (
                <div className="rounded-lg overflow-hidden">
                  {block.content ? (
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${block.content}`}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : uploading === block.id ? (
                    <div className="w-full h-48 bg-[var(--card-bg)] rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm" style={fontPoppins}>
                        <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                        Uploading to YouTube...
                      </div>
                    </div>
                  ) : pendingYoutubeUploads[block.id] ? (
                    <div className="space-y-2">
                      <video
                        src={pendingYoutubeUploads[block.id].previewUrl}
                        controls
                        className="w-full rounded-lg"
                        preload="metadata"
                      />
                      <button
                        type="button"
                        onClick={() => uploadPendingYoutube(block.id)}
                        className="w-full py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        style={fontPoppins}
                      >
                        Upload to YouTube
                      </button>
                    </div>
                  ) : null}
                  {(block.content || pendingYoutubeUploads[block.id]) && (
                    <input
                      type="text"
                      value={block.caption || ""}
                      onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                      placeholder="Add a caption (optional)"
                      className="w-full bg-transparent text-sm text-[var(--text-secondary)] placeholder-[var(--text-secondary)]/30 focus:outline-none mt-2 text-center italic"
                      style={fontPoppins}
                    />
                  )}
                </div>
              )}

              {/* Habit Tracker Block */}
              {block.type === "habits" && (
                <HabitTrackerGrid
                  variant="admin"
                  tracker={parseHabitTracker(
                    block.content,
                    parsePeriodKey(period)?.year ?? new Date().getFullYear(),
                    parsePeriodKey(period)?.month ?? new Date().getMonth()
                  )}
                  onChange={(next) =>
                    updateBlock(block.id, { content: serializeHabitTracker(next) })
                  }
                />
              )}

              {/* Remove block button */}
              {blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(block.id)}
                  className="absolute -right-2 top-2 text-[var(--text-secondary)]/50 hover:text-red-400 text-sm p-1"
                  title="Remove block"
                >
                  ×
                </button>
              )}

              {/* Add block toolbar (always visible) */}
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[var(--text-secondary)]/10">
                <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase tracking-wider mr-2" style={fontPoppins}>Add:</span>
                <button
                  onClick={() => addBlock("text", index)}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--text-secondary)]/20 rounded hover:border-[var(--text-main)] transition-colors"
                  style={fontPoppins}
                >
                  + Text
                </button>
                <button
                  onClick={() => addBlock("image", index)}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--text-secondary)]/20 rounded hover:border-[var(--text-main)] transition-colors"
                  style={fontPoppins}
                >
                  + Image
                </button>
                <button
                  onClick={() => addBlock("youtube", index)}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--text-secondary)]/20 rounded hover:border-[var(--text-main)] transition-colors"
                  style={fontPoppins}
                >
                  + YouTube
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* YouTube title modal (replaces window.prompt, which iframes/some mobile browsers block) */}
      {youtubeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm bg-[var(--bg-color)] border border-[var(--text-secondary)]/20 rounded-lg p-6 space-y-4">
            <h3 className="text-lg text-[var(--text-main)]" style={fontPlayfair}>
              YouTube video title
            </h3>
            <input
              type="text"
              autoFocus
              value={youtubeModalTitle}
              onChange={(e) => setYoutubeModalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmYoutubeTitle();
              }}
              className="w-full bg-transparent border border-[var(--text-secondary)]/30 rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-[#a8d4f0]"
              style={fontPoppins}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setYoutubeModalOpen(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                style={fontPoppins}
              >
                Cancel
              </button>
              <button
                onClick={confirmYoutubeTitle}
                disabled={!youtubeModalTitle.trim()}
                className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-color)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={fontPoppins}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
