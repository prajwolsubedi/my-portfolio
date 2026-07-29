"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({
  theme: "dark",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function BlogThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("blog-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("blog-theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggleButton() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full border transition-colors"
      style={{
        borderColor: theme === "dark" ? "rgba(148,163,184,0.3)" : "rgba(0,0,0,0.15)",
        color: theme === "dark" ? "#94a3b8" : "#374151",
        fontFamily: "var(--font-poppins), Poppins, sans-serif",
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// Blog theme CSS variables
export function blogThemeStyles(theme: Theme) {
  if (theme === "light") {
    return {
      "--blog-bg": "#fafafa",
      "--blog-text": "#1a1a1a",
      "--blog-text-secondary": "#6b7280",
      "--blog-border": "rgba(0,0,0,0.08)",
      "--blog-card": "#ffffff",
      "--blog-hover": "#2563eb",
    } as React.CSSProperties;
  }
  return {
    "--blog-bg": "#0f0f0f",
    "--blog-text": "#fffbf7",
    "--blog-text-secondary": "#94a3b8",
    "--blog-border": "rgba(148,163,184,0.1)",
    "--blog-card": "#1a1a1a",
    "--blog-hover": "#a8d4f0",
  } as React.CSSProperties;
}
