"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// === CONSTANTS ===
const NUM_NODES = 45; // Density of the cloud
const CONNECTION_DISTANCE = 70; // Threshold for connecting lines
const ROTATION_SPEED = 0.002; // Auto-rotation speed
const BOUNDS = 120; // 3D Box size (+/-)
const PERSPECTIVE = 300; // Camera distance

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export default function TensorField3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics State
  const rotationVelX = useRef(ROTATION_SPEED);
  const rotationVelY = useRef(ROTATION_SPEED);

  // Drag State
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Angle Refs
  const angleXRef = useRef(0);
  const angleYRef = useRef(0);

  // Mouse Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      angleYRef.current += dx * 0.005;
      angleXRef.current -= dy * 0.005;
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Mouse offset from center
      const dx = e.clientX - rect.left - centerX;
      const dy = e.clientY - rect.top - centerY;

      // Influence rotation velocity based on mouse position
      rotationVelY.current = dx * 0.0001;
      rotationVelX.current = -dy * 0.0001;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    rotationVelX.current = ROTATION_SPEED;
    rotationVelY.current = ROTATION_SPEED;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    rotationVelX.current = ROTATION_SPEED;
    rotationVelY.current = ROTATION_SPEED;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // 1. DATA GENERATION (The Point Cloud)
  // Generate random points in 3D space once
  const initialNodes: Point3D[] = useMemo(() => {
    return Array.from({ length: NUM_NODES }).map(() => ({
      x: (Math.random() - 0.5) * 2 * BOUNDS,
      y: (Math.random() - 0.5) * 2 * BOUNDS,
      z: (Math.random() - 0.5) * 2 * BOUNDS,
    }));
  }, []);

  // Frame Loop State for projected points
  const [projectedNodes, setProjectedNodes] = useState<Point2D[]>([]);

  // Animation Loop
  useEffect(() => {
    let frameId: number;

    const update = () => {
      // 1. Physics Step - Only apply auto-rotation if not dragging
      if (!isDragging.current) {
        angleXRef.current += rotationVelX.current;
        angleYRef.current += rotationVelY.current;
      }

      const cosX = Math.cos(angleXRef.current);
      const sinX = Math.sin(angleXRef.current);
      const cosY = Math.cos(angleYRef.current);
      const sinY = Math.sin(angleYRef.current);

      // 2. Projection Step
      const newProjected: Point2D[] = initialNodes.map((node) => {
        // Rotation Y
        let x = node.x * cosY - node.z * sinY;
        let z = node.z * cosY + node.x * sinY;
        
        // Rotation X
        let y = node.y * cosX - z * sinX;
        z = z * cosX + node.y * sinX;

        // 3D to 2D Projection
        const scale = PERSPECTIVE / (PERSPECTIVE + z);
        
        return {
          x: x * scale,
          y: y * scale,
          scale: scale,
          opacity: Math.max(0.1, Math.min(1, scale * scale)), // Fade distant nodes
        };
      });

      setProjectedNodes(newProjected);
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [initialNodes]);

  // 3. DYNAMIC CONNECTIVITY
  const lines = useMemo(() => {
    const connections: JSX.Element[] = [];
    
    for (let i = 0; i < projectedNodes.length; i++) {
      for (let j = i + 1; j < projectedNodes.length; j++) {
        const a = projectedNodes[i];
        const b = projectedNodes[j];
        
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
          const opacity = Math.min(a.opacity, b.opacity) * (1 - distSq / (CONNECTION_DISTANCE * CONNECTION_DISTANCE));
          
          connections.push(
            <line
              key={`${i}-${j}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#A5B4FC"
              strokeWidth={1} // Kept original thickness
              strokeOpacity={opacity}
            />
          );
        }
      }
    }
    return connections;
  }, [projectedNodes]);

  return (
    <div 
      className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex items-center justify-center relative cursor-grab active:cursor-grabbing scale-115 translate-x-25"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* SVG LAYER for Lines */}
        <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="-200 -200 400 400" // Center 0,0
        >
            {lines}
        </svg>

        {/* DOM LAYER for Nodes (Dots) */}
        {/* Using standard divs for dots allows easy glow/box-shadow which SVG circles handle differently */}
        {projectedNodes.map((node, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 3, // Base size
              height: 3,
              left: "50%",
              top: "50%",
              transform: `translate3d(${node.x}px, ${node.y}px, 0) scale(${node.scale})`,
              opacity: node.opacity,
              boxShadow: `0 0 ${10 * node.scale}px rgba(165, 180, 252, ${node.opacity})` // Glow
            }}
          />
        ))}
        
        {/* Central Core Hint (Optional) */}
        <div className="absolute w-20 h-20 bg-[#A5B4FC] rounded-full opacity-5 blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
