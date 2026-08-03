"use client";

/**
 * Dark/light switch for the blog surfaces.
 *
 * The theme itself lives in CSS (see `--blog-*` in globals.css) keyed off a
 * `data-blog-theme` attribute on <html>, which `themeInitScript` sets before
 * first paint. This component only flips that attribute, so switching costs no
 * React re-render and the server-rendered HTML is never briefly the wrong
 * colour.
 */

export const THEME_STORAGE_KEY = "blog-theme";

/**
 * Runs blocking, before the browser paints, so a saved light theme never shows
 * a frame of dark. Kept as a string because it has to be inline — an external
 * script would be too late.
 */
export const themeInitScript = `try{document.documentElement.dataset.blogTheme=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})==="light"?"light":"dark"}catch(e){document.documentElement.dataset.blogTheme="dark"}`;

export function ThemeToggleButton() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.blogTheme === "light" ? "dark" : "light";
    root.dataset.blogTheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing with storage blocked — the switch still works for
      // this page view, it just won't be remembered.
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full border transition-colors"
      style={{
        borderColor: "var(--blog-toggle-border)",
        color: "var(--blog-toggle-text)",
        fontFamily: "var(--font-poppins), Poppins, sans-serif",
      }}
      // Static, because the label can't depend on state that only exists after
      // hydration without mismatching the server-rendered HTML.
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
    >
      <svg
        className="blog-theme-sun"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <svg
        className="blog-theme-moon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
