"use client";

import React, { useState } from "react";

export default function Snowfall() {
  // Generate snowflakes with variety - using useState to avoid Math.random in render
  const [snowflakes] = useState(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 8,
      animationDuration: 6 + Math.random() * 10,
      size: 2 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.6,
      // Variation in drift direction
      drift: (Math.random() - 0.5) * 50,
      // Some snowflakes are actual snowflake characters
      isSymbol: Math.random() > 0.7,
    }));
  });

  const [sparkles] = useState(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      bottom: 8 + Math.random() * 12,
      opacity: 0.2 + Math.random() * 0.4,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
    }));
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Falling snowflakes */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute"
          style={{
            left: `${flake.left}%`,
            top: "-20px",
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.animationDelay}s`,
            ["--drift" as string]: `${flake.drift}px`,
          }}
        >
          {flake.isSymbol ? (
            <span
              style={{
                fontSize: `${flake.size * 1.2}px`,
                color: "white",
                textShadow: "0 0 2px rgba(255,255,255,0.5)",
              }}
            >
              ❄
            </span>
          ) : (
            <div
              className="rounded-full bg-white"
              style={{
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                boxShadow: "0 0 2px rgba(255,255,255,0.3)",
              }}
            />
          )}
        </div>
      ))}

      {/* Realistic snow accumulation at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none overflow-hidden">
        {/* Organic snow drifts with natural curves */}
        <svg
          className="absolute bottom-0 w-full h-24"
          viewBox="0 0 1200 96"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="snowBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>

          {/* Base layer - soft and diffused */}
          <path
            d="M0,80 Q200,75 400,78 Q600,76 800,79 Q1000,77 1200,80 L1200,96 L0,96 Z"
            fill="rgba(255,255,255,0.12)"
            filter="url(#snowBlur)"
          />

          {/* Middle layer - more defined */}
          <path
            d="M0,85 Q150,82 300,84 Q450,81 600,85 Q750,83 900,84 Q1050,82 1200,85 L1200,96 L0,96 Z"
            fill="rgba(255,255,255,0.18)"
            filter="url(#snowBlur)"
          />

          {/* Top layer - most visible with natural peaks */}
          <path
            d="M0,88 Q100,85 200,89 Q300,86 400,90 Q500,87 600,89 Q700,86 800,90 Q900,88 1000,89 Q1100,87 1200,88 L1200,96 L0,96 Z"
            fill="rgba(255,255,255,0.25)"
            filter="url(#snowBlur)"
          />

          {/* Small snow mounds for texture */}
          <ellipse
            cx="150"
            cy="90"
            rx="40"
            ry="8"
            fill="rgba(255,255,255,0.2)"
            filter="url(#snowBlur)"
          />
          <ellipse
            cx="450"
            cy="88"
            rx="35"
            ry="7"
            fill="rgba(255,255,255,0.22)"
            filter="url(#snowBlur)"
          />
          <ellipse
            cx="750"
            cy="89"
            rx="45"
            ry="9"
            fill="rgba(255,255,255,0.2)"
            filter="url(#snowBlur)"
          />
          <ellipse
            cx="1050"
            cy="87"
            rx="38"
            ry="8"
            fill="rgba(255,255,255,0.22)"
            filter="url(#snowBlur)"
          />
        </svg>

        {/* Subtle sparkle effect */}
        {sparkles.map((sparkle) => (
          <div
            key={`sparkle-${sparkle.id}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${sparkle.left}%`,
              bottom: `${sparkle.bottom}px`,
              width: "1.5px",
              height: "1.5px",
              opacity: sparkle.opacity,
              animation: `sparkle ${sparkle.duration}s ease-in-out infinite`,
              animationDelay: `${sparkle.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
