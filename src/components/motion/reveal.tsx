"use client";

import { motion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds (use for staggering siblings). */
  delay?: number;
  /** Vertical offset to slide up from. */
  y?: number;
}

/** Fade + slide-up when scrolled into view (once). Peaceful, gentle easing. */
export function Reveal({ children, className, delay = 0, y = 22 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
