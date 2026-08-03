"use client";

import { useEffect, useState, type ReactNode } from "react";

type Tab = "daily" | "monthly";

/**
 * The only interactive part of the blog index.
 *
 * Both panels are rendered on the server and shipped in the HTML, so switching
 * tabs reveals markup that is already on the page — no fetch, no spinner. This
 * component only decides which one is visible.
 */
export default function BlogTabs({
  daily,
  monthly,
}: {
  daily: ReactNode;
  monthly: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("daily");

  // /blogs?tab=monthly opens straight on the Monthly Updates tab. Read from the
  // URL rather than useSearchParams so the page can stay statically rendered.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is external state, absent from the prerendered page
    if (tab === "monthly") setActiveTab("monthly");
  }, []);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(
      {},
      "",
      tab === "monthly" ? "?tab=monthly" : window.location.pathname
    );
  };

  return (
    <>
      {/* This strip carries the padding the header used to, so moving it out of
          the header leaves the spacing unchanged. */}
      <div className="blog-shell pb-8">
        <div
          className="flex gap-6"
          style={{ borderBottom: "1px solid var(--blog-border)" }}
        >
          {(["daily", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => selectTab(tab)}
              className="blog-sans pb-3 text-sm transition-colors relative"
              style={{
                color:
                  activeTab === tab
                    ? "var(--blog-text)"
                    : "var(--blog-text-secondary)",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--blog-hover)"
                    : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tab === "daily" ? "Blog" : "Monthly Updates"}
            </button>
          ))}
        </div>
      </div>

      <main className="blog-shell pb-20">
        <div hidden={activeTab !== "daily"}>{daily}</div>
        <div hidden={activeTab !== "monthly"}>{monthly}</div>
      </main>
    </>
  );
}
