"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";

import {
  consoleToneClass,
  type ConsoleTone,
} from "../../console-shell/console-shell-status";

type CommandCenterScenarioOption = {
  description: string;
  id: string;
  label: string;
  tone: ConsoleTone;
};

export function CommandCenterDevScenarioSwitch({
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
  options: CommandCenterScenarioOption[];
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
              activeId === scenario.id
                ? "system-mood-design-button-active"
                : ""
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

export function CommandCenterStateIcon({ tone }: { tone: ConsoleTone }) {
  if (tone === "danger") {
    return <CircleDot className="h-4 w-4 text-[var(--red)]" />;
  }

  if (tone === "warn") {
    return <AlertTriangle className="h-4 w-4 text-[var(--amber)]" />;
  }

  if (tone === "ok") {
    return <CheckCircle2 className="h-4 w-4 text-[var(--green)]" />;
  }

  if (tone === "muted") {
    return <CircleDot className="h-4 w-4 text-[var(--subtle)]" />;
  }

  if (tone === "stale") {
    return <CircleDot className="h-4 w-4 text-[#9ab0c5]" />;
  }

  return <CircleDot className="h-4 w-4 text-[var(--blue)]" />;
}

export function CommandCenterStatusDot({
  pulse = false,
  tone = "ok",
}: {
  pulse?: boolean;
  tone?: ConsoleTone;
}) {
  return (
    <span
      className={[
        "status-dot inline-block h-2.5 w-2.5 rounded-full",
        consoleToneClass[tone],
        pulse ? "pulse-orb" : "",
      ].join(" ")}
      style={{ backgroundColor: "currentColor" }}
    />
  );
}
