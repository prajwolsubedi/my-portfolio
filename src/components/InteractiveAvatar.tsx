"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring, MotionValue } from "framer-motion";

interface InteractiveAvatarProps {
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export default function InteractiveAvatar({ 
  mouseX: externalMouseX, 
  mouseY: externalMouseY 
}: InteractiveAvatarProps) {
  // Use internal motion values if not provided via props
  const internalMouseX = useMotionValue(0);
  const internalMouseY = useMotionValue(0);

  const mouseX = externalMouseX || internalMouseX;
  const mouseY = externalMouseY || internalMouseY;

  // 1. CONTAINER PHYSICS (3D Tilt)
  // Smooth spring physics for the rotation
  const springConfig = { damping: 20, stiffness: 300 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  // 3. EYES TRACKING
  const eyeX = useTransform(mouseXSpring, [-0.5, 0.5], [-8, 8]);
  const eyeY = useTransform(mouseYSpring, [-0.5, 0.5], [-8, 8]);

  // Handle local mouse move if used standalone
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (externalMouseX && externalMouseY) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const xPct = (e.clientX - rect.left) / width - 0.5;
    const yPct = (e.clientY - rect.top) / height - 0.5;
    
    internalMouseX.set(xPct);
    internalMouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    if (externalMouseX && externalMouseY) return;
    internalMouseX.set(0);
    internalMouseY.set(0);
  };

  return (
    <div 
      className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex items-center justify-center relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="w-[240px] h-[240px] md:w-[320px] md:h-[320px] relative z-10"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover="hover"
        variants={{
          hover: { scale: 1.05 }
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* 5. THE DECORATION (Orbit/Satellite) */}
        <div className="absolute inset-[-40px] z-[-1] pointer-events-none">
          <motion.div
            className="w-full h-full rounded-full border-2 border-[var(--accent-color)] opacity-30"
            style={{
              borderTopColor: "transparent",
              borderRightColor: "transparent",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-0 left-0 w-full h-full rounded-full border border-[var(--accent-color)] opacity-20"
            style={{
              scale: 0.8,
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* 2. THE FACE (Head) */}
        <div 
          className="w-full h-full rounded-[60px] bg-[var(--card-bg)] border-2 border-[var(--accent-color)] flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_40px_-10px_var(--accent-color)]"
        >
          {/* Subtle Shine/Reflection */}
          <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-gradient-to-bl from-white/5 to-transparent rounded-tr-[58px] pointer-events-none" />

          {/* Face Container */}
          <div className="flex flex-col items-center gap-12 md:gap-16 pt-8">
            
            {/* 3. THE EYES */}
            <div className="flex gap-16 md:gap-20">
              <Eye x={eyeX} y={eyeY} />
              <Eye x={eyeX} y={eyeY} />
            </div>

            {/* 4. THE MOUTH */}
            <Mouth />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Sub-component for individual Eye
function Eye({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  // Blinking Animation
  const blinkVariants = {
    blink: { scaleY: 0.1 },
    open: { scaleY: 1 },
  };

  return (
    <motion.div
      className="w-8 h-12 md:w-10 md:h-16 bg-[var(--text-main)] rounded-full"
      style={{ x, y }}
      animate="open"
      variants={blinkVariants}
      // Random blink loop setup would ideally be done via a custom hook or useEffect
      // implementing a simple random blink here via `animate` prop transitions is tricky
      // so we use a keyframe animation in the animate prop
    >
      <motion.div 
        className="w-full h-full bg-[var(--text-main)] rounded-full"
        animate={{ scaleY: [1, 1, 0.1, 1, 1, 1] }} 
        transition={{
          duration: 4,
          ease: "easeInOut",
          times: [0, 0.9, 0.95, 1, 1, 1], // Quick blink at the end of the cycle
          repeat: Infinity,
          repeatDelay: Math.random() * 2 + 1, // Add some randomness
        }}
      />
    </motion.div>
  );
}

// Sub-component for Mouth
function Mouth() {
  return (
    <div className="w-16 h-8 md:w-20 md:h-10 flex justify-center items-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-[var(--text-main)] stroke-[6px] stroke-linecap-round stroke-linejoin-round group-hover:fill-[var(--text-main)]/10"
      >
        <motion.path
          d="M 10 20 Q 50 40 90 20" // Default subtle smile
          variants={{
            initial: { d: "M 10 20 Q 50 40 90 20" },
            hover: { d: "M 10 10 Q 50 80 90 10" }, // Wide "D" smile
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        {/* 
           Fix: Motion variants propagate from parent motion components.
           We need to ensure the parent container sets the "hover" state.
           The main head container has `whileHover={{ scale: 1.05 }}`. 
           We can define the variant names there: `whileHover="hover"`.
        */}
      </svg>
    </div>
  );
}
