"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProjectDetailPage() {
  const params = useParams();
  const { slug } = params;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-color)] px-6">
      <h1 className="text-4xl font-bold text-[var(--text-main)] mb-4">
        Project Details
      </h1>
      <p className="text-lg text-[var(--text-secondary)] mb-8">
        This is the detail page for project: <span className="font-semibold text-[var(--accent-color)]">{slug}</span>
      </p>
      <Link href="/" passHref>
        <div className="text-[var(--accent-color)] hover:underline cursor-pointer">
          &larr; Go Back to Home
        </div>
      </Link>
    </div>
  );
}
