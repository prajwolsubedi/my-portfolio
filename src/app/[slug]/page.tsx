import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { getProjectBySlug, projectSlugs } from "@/data/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs.map((slug) => ({ slug }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  const detail = project?.detail;

  // Only allow the known internal projects.
  if (!project || project.external || !detail) notFound();

  const isComingSoon = !!detail.comingSoon;
  const hasPrimaryLink = !!detail.primaryLinkUrl;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16"
      style={{
        background: "#0a0a0a",
        fontFamily: '"Playfair Display", Georgia, serif',
      }}
    >
      {/* Decorative line */}
      <div
        className="w-16 h-px mb-8"
        style={{
          background:
            "linear-gradient(90deg, transparent, #f5f5dc, transparent)",
        }}
      />

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl md:text-5xl font-light tracking-wide text-center mb-6 px-2"
        style={{ color: "#f5f5dc", letterSpacing: "0.08em" }}
      >
        {isComingSoon ? detail.title ?? "Coming Soon" : detail.title}
      </h1>

      {/* Decorative line */}
      <div
        className="w-24 h-px mb-10"
        style={{
          background:
            "linear-gradient(90deg, transparent, #f5f5dc, transparent)",
        }}
      />

      {isComingSoon ? (
        <div className="text-center max-w-lg px-2">
          <p
            className="text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8"
            style={{
              color: "#a3a3a3",
              fontFamily: '"Cormorant Garamond", Georgia, serif',
            }}
          >
            The description will be added soon.
            <br />
            {hasPrimaryLink ? "If you want to see the demo, click below." : null}
          </p>
          {hasPrimaryLink ? (
            <a
              href={detail.primaryLinkUrl}
              className="inline-block px-6 sm:px-8 py-3 border transition-colors duration-300 hover:bg-[#f5f5dc] hover:text-[#0a0a0a]"
              style={{
                borderColor: "#f5f5dc",
                color: "#f5f5dc",
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                letterSpacing: "0.15em",
                fontSize: "0.875rem",
                textTransform: "uppercase",
              }}
              rel="noreferrer"
              target="_blank"
            >
              {detail.primaryLinkLabel ?? "Open"}
            </a>
          ) : null}
        </div>
      ) : (
        <p
          className="text-lg md:text-xl text-center mb-8"
          style={{
            color: "#a3a3a3",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
          }}
        >
          This is the detail page for:{" "}
          <span style={{ color: "#f5f5dc", fontStyle: "italic" }}>
            {detail.title}
          </span>
        </p>
      )}

      {/* Back link */}
      <Link href="/" passHref>
        <div
          className="mt-12 flex items-center gap-3 cursor-pointer transition-opacity duration-300 hover:opacity-70"
          style={{
            color: "#737373",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            letterSpacing: "0.1em",
            fontSize: "0.875rem",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>←</span>
          <span>Back to Home</span>
        </div>
      </Link>
    </div>
  );
}
