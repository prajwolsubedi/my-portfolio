"use client";

import { Variants, motion } from "framer-motion";
import React from "react";
import Link from "next/link";

export default function Projects() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section
      id="projects"
      className="py-20 md:py-24 px-4 max-w-[1200px] mx-auto"
    >
      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-normal text-[var(--text-main)] text-left mb-10 sm:mb-16"
        initial={{ opacity: 0, y: -50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Projects
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {projects.map((project, index) => {
          const card = (
            <div className="block bg-[var(--card-bg)] p-0 rounded-lg shadow-[var(--shadow)] group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
              <div className="overflow-hidden rounded-lg h-48 sm:h-64 md:h-90">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          );

          return (
            <motion.div key={index} variants={itemVariants}>
              {project.external ? (
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={project.title}
                >
                  {card}
                </a>
              ) : (
                <Link href={project.href} passHref aria-label={project.title}>
                  {card}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

const projects = [
  {
    title: "Project One",
    slug: "project-one",
    image: "/project1.png",
    href: "https://ainews.prajwolsubedi.com.np/#/about",
    external: true,
  },
  {
    title: "Project Two",
    slug: "project-two",
    image: "/project2.png",
    href: "/projects/project-two",
  },
  {
    title: "Project Three",
    slug: "project-three",
    image: "/project3.png",
    href: "/projects/project-three",
  },
  {
    title: "Project Four",
    slug: "project-four",
    image: "/project4.png",
    href: "/projects/project-four",
  },
];
