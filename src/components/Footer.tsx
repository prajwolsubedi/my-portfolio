"use client";

import React from "react";
import { FaGithub, FaLinkedin, FaYoutube, FaTiktok, FaEnvelope } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="w-full bg-transparent text-[var(--text-secondary)] py-8 px-6 md:px-12">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm order-2 md:order-1">&copy; 2024 Prajwol Subedi</p>
        <div className="flex items-center gap-6 order-1 md:order-2">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-color)] transition-colors">
            <FaGithub size={20} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-color)] transition-colors">
            <FaLinkedin size={20} />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-color)] transition-colors">
            <FaYoutube size={20} />
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-color)] transition-colors">
            <FaTiktok size={20} />
          </a>
          <a href="mailto:prajwolsubedizzz@gmail.com" className="hover:text-[var(--accent-color)] transition-colors">
            <FaEnvelope size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
