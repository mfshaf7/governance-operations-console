"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

export function ConsoleShellPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={`glass-panel rounded-[28px] p-5 ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

export function ConsoleShellSectionTitle({
  kicker,
  title,
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <div>
      {kicker ? (
        <p className="section-kicker mono mb-2 text-[11px] uppercase tracking-[0.28em]">
          {kicker}
        </p>
      ) : null}
      <h2 className="section-heading text-xl font-bold tracking-[-0.035em]">
        {title}
      </h2>
    </div>
  );
}
