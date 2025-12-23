"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import React, { useRef } from "react";
import {
  FaGithub,
  FaLinkedin,
  FaYoutube,
  FaTiktok,
  FaEnvelope,
  FaDownload,
  FaArrowDown,
} from "react-icons/fa6";
import TensorField3D from "./TensorField3D";

export default function Hero() {
  // Motion values for the interactive character
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Stagger variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      id="hero"
      className="min-h-screen w-full flex items-center justify-center px-6 md:px-12 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="w-full max-w-[1000px] flex flex-col md:flex-row items-center justify-between gap-12 md:gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Text Content */}
        <div className="flex-1 text-center md:text-left z-10 group md:mt-12">
          <motion.h1
            className="text-3xl sm:text-4xl md:text-[56px] font-bold leading-[1.1] text-[var(--text-main)] font-serif"
            variants={itemVariants}
          >
            Hi! I am Prajwol Subedi
          </motion.h1>
          <motion.p
            className="mt-4 text-lg md:text-xl text-[var(--text-secondary)] font-sans max-w-[600px] md:mx-0 mx-auto"
            variants={itemVariants}
          >
            An AI Engineer passionate about building products and automating
            things.
          </motion.p>

          {/* Social Icons */}
          <motion.div
            className="mt-8 flex items-center justify-center md:justify-start gap-4 sm:gap-6"
            variants={itemVariants}
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[#a8d4f0] transition-colors"
            >
              <FaGithub size={24} />
            </a>
            <a
              href="https://www.linkedin.com/in/prajwol-subedi-506537219/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[#a8d4f0] transition-colors"
            >
              <FaLinkedin size={24} />
            </a>
            <a
              href="https://www.youtube.com/watch?v=FKtBOpiahr8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[#a8d4f0] transition-colors"
            >
              <FaYoutube size={24} />
            </a>
            <a
              href="https://www.tiktok.com/@just_ask_it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[#a8d4f0] transition-colors"
            >
              <FaTiktok size={24} />
            </a>
            <a
              href="mailto:email@example.com"
              className="text-[var(--text-secondary)] hover:text-[#a8d4f0] transition-colors"
            >
              <FaEnvelope size={24} />
            </a>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4 w-full sm:w-auto"
            variants={itemVariants}
          >
            <a
              href="https://drive.google.com/uc?export=download&id=1GpmpOA93jOaIF8zX-VlF23Ba8Y2YwU_z"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-[var(--text-main)] text-[var(--bg-color)] font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto text-sm sm:text-base"
            >
              <FaDownload className="transition-transform duration-300 group-hover:scale-110" />
              Download Resume
            </a>
            <a
              href="#projects"
              className="group flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-transparent border border-[var(--text-secondary)] text-[var(--text-main)] font-semibold rounded-lg hover:bg-[var(--text-main)] hover:text-[var(--bg-color)] hover:border-[var(--text-main)] transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto text-sm sm:text-base"
            >
              View Projects
              <FaArrowDown className="transition-transform duration-300 group-hover:translate-y-1" />
            </a>
          </motion.div>
        </div>

        {/* Visual Content - Interactive Character */}
        <motion.div
          className="flex-1 flex justify-center items-center w-full max-w-[400px]"
          variants={itemVariants}
          style={{
            perspective: 1000,
          }}
        >
          {/* 
              Replaced SentientGlassOrb with TensorField3D as per request.
          */}
          <TensorField3D />
        </motion.div>
      </motion.div>

      {/* Background Decor (Optional Subtle Gradient) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--bg-color)] to-[#000000] pointer-events-none" />
    </section>
  );
}
