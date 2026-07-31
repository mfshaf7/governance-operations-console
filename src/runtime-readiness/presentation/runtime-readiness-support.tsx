import React from "react";
import {
  Activity,
  Bot,
  Boxes,
  Gauge,
  GitBranch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type {
  DevScenarioOption,
  RuntimeComponentObservation,
  Tone,
} from "../model/runtime-readiness-model";

const componentIconMap: Record<string, LucideIcon> = {
  "Argo CD": GitBranch,
  "CGG API": LockKeyhole,
  "Devint Access": Boxes,
  Grafana: Gauge,
  Headlamp: Boxes,
  MinIO: Boxes,
  "OOS API": MessageSquareText,
  OpenProject: Layers3,
  "OpenClaw Dashboard": Bot,
  Prometheus: Activity,
  Vault: LockKeyhole,
  "WGCF API": ShieldCheck,
};

export function getComponentIcon(label: string) {
  return componentIconMap[label] ?? Boxes;
}

export function ComponentIcon({
  component,
}: {
  component: RuntimeComponentObservation;
}) {
  const Icon = getComponentIcon(component.label);

  return <Icon aria-hidden="true" className="component-icon" strokeWidth={2.2} />;
}

const toneClass: Record<Tone, string> = {
  danger: "text-[var(--red)]",
  info: "text-[var(--blue)]",
  muted: "text-[var(--subtle)]",
  ok: "text-[var(--green)]",
  stale: "text-[#9ab0c5]",
  warn: "text-[var(--amber)]",
};

export function statusCardClass(tone: Tone, className = "") {
  return `status-card status-card-${tone} ${className}`.trim();
}

export function StatusDot({ tone = "ok", pulse = false }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span
      className={[
        "status-dot inline-block h-2.5 w-2.5 rounded-full",
        toneClass[tone],
        pulse ? "pulse-orb" : "",
      ].join(" ")}
      style={{ backgroundColor: "currentColor" }}
    />
  );
}

export function SectionTitle({
  kicker,
  title,
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <div className="min-w-0">
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

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
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

export function DevScenarioSwitch({
  activeId,
  className = "",
  devMode,
  label,
  onChange,
  options,
}: {
  activeId: string;
  className?: string;
  devMode: boolean;
  label: string;
  onChange: (scenarioId: string) => void;
  options: DevScenarioOption[];
}) {
  if (!devMode) {
    return null;
  }

  return (
    <div className={`console-dev-switcher mt-5 rounded-2xl p-2 ${className}`}>
      <p className="console-dev-switcher-label mono mb-2 px-1 text-[9px] font-black uppercase tracking-[0.2em]">
        Dev State: {label}
      </p>
      <div className="grid gap-2 md:grid-cols-5">
        {options.map((scenario) => (
          <button
            key={scenario.id}
            aria-pressed={activeId === scenario.id}
            className={`system-mood-design-button status-card-${scenario.tone} rounded-xl px-3 py-2 text-left ${
              activeId === scenario.id ? "system-mood-design-button-active" : ""
            }`}
            type="button"
            onClick={() => onChange(scenario.id)}
          >
            <span className="block text-xs font-black uppercase tracking-[0.16em]">
              {scenario.label}
            </span>
            <span className="mt-1 block text-[10px] leading-4 opacity-75">
              {scenario.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
