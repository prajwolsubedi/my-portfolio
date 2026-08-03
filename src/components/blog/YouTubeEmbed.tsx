"use client";

import { useState } from "react";

/**
 * A YouTube embed that doesn't load YouTube until you ask it to.
 *
 * The real iframe pulls roughly a megabyte of player JavaScript and opens
 * connections to several Google domains — on page load, for a video most
 * readers will scroll past. This shows the video's own thumbnail instead and
 * swaps in the iframe on the first click, which is also when it starts playing,
 * so the click isn't wasted.
 */
export default function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title?: string;
}) {
  const [activated, setActivated] = useState(false);

  if (activated) {
    return (
      <iframe
        // autoplay, because the click that mounted this was the play button.
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={title || "YouTube video"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="group relative w-full h-full cursor-pointer"
      aria-label={title ? `Play video: ${title}` : "Play video"}
    >
      {/* hqdefault is the one thumbnail size YouTube always has. It's 4:3, so
          it's cropped to fill the 16:9 box rather than letterboxed. */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
        <svg
          width="68"
          height="48"
          viewBox="0 0 68 48"
          aria-hidden="true"
          className="drop-shadow-lg"
        >
          <path
            d="M66.52 7.74a8.57 8.57 0 0 0-6-6.05C55.2.24 34 .24 34 .24s-21.2 0-26.52 1.45a8.57 8.57 0 0 0-6 6.05A89.4 89.4 0 0 0 0 24a89.4 89.4 0 0 0 1.48 16.26 8.57 8.57 0 0 0 6 6.05C12.8 47.76 34 47.76 34 47.76s21.2 0 26.52-1.45a8.57 8.57 0 0 0 6-6.05A89.4 89.4 0 0 0 68 24a89.4 89.4 0 0 0-1.48-16.26z"
            fill="#f00"
            className="opacity-90 transition-opacity group-hover:opacity-100"
          />
          <path d="M27.2 34.4 45.6 24 27.2 13.6z" fill="#fff" />
        </svg>
      </span>
    </button>
  );
}
