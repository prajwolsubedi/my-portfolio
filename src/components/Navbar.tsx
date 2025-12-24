"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Projects", href: "#projects" },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 h-16 sm:h-20 flex items-center justify-center bg-(--bg-color)/90 backdrop-blur-md">
      <div className="w-[90%] max-w-[1200px] flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-3 font-serif font-bold text-xl sm:text-2xl tracking-tight hover:opacity-80 transition-opacity"
          onClick={closeMenu}
        >
          <Image
            src="/avatar-christmas.png"
            alt="Prajwol avatar"
            width={36}
            height={36}
            className="rounded-full border border-(--accent-color)/40 shadow-sm sm:w-12 sm:h-12"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex gap-10 list-none">
          {navLinks.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="text-(--text-secondary) font-normal text-base hover:text-[#a8d4f0] hover:-translate-y-0.5 transition-all inline-block"
                style={{
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-(--text-secondary) hover:text-[#a8d4f0] transition-colors p-2"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-16 right-0 h-auto w-64 bg-(--bg-color) border-l border-(--text-secondary)/20 shadow-xl md:hidden z-50 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ul className="flex flex-col py-6">
          {navLinks.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                onClick={closeMenu}
                className="block px-6 py-4 text-(--text-secondary) font-normal text-lg hover:text-[#a8d4f0] hover:bg-(--text-secondary)/5 transition-all"
                style={{
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
