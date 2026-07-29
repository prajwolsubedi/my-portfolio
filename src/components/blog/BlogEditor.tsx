"use client";

import { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Blog, BlogBlock } from "@/lib/types";

interface BlogEditorProps {
  blog: Blog | null;
  onDone: () => void;
}

export default function BlogEditor({ blog, onDone }: BlogEditorProps) {
  const [title, setTitle] = useState(blog?.title || "");
  const [blocks, setBlocks] = useState<BlogBlock[]>(
    blog?.blocks || [{ id: uuidv4(), type: "text", content: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBlockType, setPendingBlockType] = useState<"image" | "video" | null>(null);
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);

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
  };

  const addBlock = (type: BlogBlock["type"], afterIndex: number) => {
    if (type === "image" || type === "video") {
      setPendingBlockType(type);
      setPendingInsertIndex(afterIndex);
      fileInputRef.current?.click();
      return;
    }
    const newBlock: BlogBlock = { id: uuidv4(), type, content: "" };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingBlockType === null || pendingInsertIndex === null) return;

    const blockId = uuidv4();
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
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, content: data.url } : b))
        );
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
        body: JSON.stringify({ title: title.trim(), blocks, status }),
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
    <div className="min-h-screen bg-[var(--bg-color)] px-6 py-8">
      <div className="max-w-[720px] mx-auto">
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

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title..."
          className="w-full bg-transparent text-3xl sm:text-4xl font-light text-[var(--text-main)] placeholder-[var(--text-secondary)]/30 focus:outline-none mb-10"
          style={{ ...fontPlayfair, letterSpacing: "-0.02em" }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
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
                  onClick={() => addBlock("video", index)}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--text-secondary)]/20 rounded hover:border-[var(--text-main)] transition-colors"
                  style={fontPoppins}
                >
                  + Video
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
