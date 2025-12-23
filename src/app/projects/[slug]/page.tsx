"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProjectDetailPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const projectConfig: Record<
    string,
    {
      title: string;
      comingSoon?: boolean;
      videoLabel?: string;
      videoUrl?: string;
    }
  > = {
    "project-two": {
      title: "n8n Workflow Automation",
      comingSoon: true,
      videoLabel: "Click here to watch the demo video",
      videoUrl: "https://www.tiktok.com/@just_ask_it/video/7568734573585059080",
    },
    "project-three": {
      title: "Chatbots and Voice Agent using Voiceflow and Retell AI",
      comingSoon: true,
      videoLabel: "Click here to watch the demo video",
      videoUrl: "https://www.tiktok.com/@just_ask_it/video/7560704907917921544",
    },
    "project-four": {
      title: "Local Apartment Website",
      comingSoon: true,
      videoLabel: "Click if you want to see the project demo",
      videoUrl: "https://www.divinesuitesnepal.com/",
    },
  };

  const key = typeof slug === "string" ? slug : "";
  const config = projectConfig[key];
  const isComingSoon = !!config?.comingSoon;

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
        {isComingSoon ? config?.title ?? "Coming Soon" : "Project Details"}
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
            If you want to see the video, click below.
          </p>
          <a
            href={config?.videoUrl ?? "#"}
            className="inline-block px-6 sm:px-8 py-3 border transition-all duration-300"
            style={{
              borderColor: "#f5f5dc",
              color: "#f5f5dc",
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              letterSpacing: "0.15em",
              fontSize: "0.875rem",
              textTransform: "uppercase",
            }}
            rel="noreferrer"
            target={
              config?.videoUrl && config.videoUrl !== "#" ? "_blank" : undefined
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5dc";
              e.currentTarget.style.color = "#0a0a0a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#f5f5dc";
            }}
          >
            {config?.videoLabel ?? "Watch Demo"}
          </a>
        </div>
      ) : (
        <p
          className="text-lg md:text-xl text-center mb-8"
          style={{
            color: "#a3a3a3",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
          }}
        >
          This is the detail page for project:{" "}
          <span style={{ color: "#f5f5dc", fontStyle: "italic" }}>{slug}</span>
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
