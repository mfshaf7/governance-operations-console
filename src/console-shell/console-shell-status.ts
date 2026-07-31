export type ConsoleTone = "ok" | "warn" | "muted" | "info" | "danger" | "stale";

export const consoleToneClass: Record<ConsoleTone, string> = {
  danger: "text-[var(--red)]",
  info: "text-[var(--blue)]",
  muted: "text-[var(--subtle)]",
  ok: "text-[var(--green)]",
  stale: "text-[#9ab0c5]",
  warn: "text-[var(--amber)]",
};

export const consoleToneStatusLabel: Record<ConsoleTone, string> = {
  danger: "At risk",
  info: "In motion",
  muted: "Quiet",
  ok: "Healthy",
  stale: "Stale",
  warn: "Needs attention",
};

export function consoleStatusCardClass(
  tone: ConsoleTone,
  className = "",
) {
  return `status-card status-card-${tone} ${className}`.trim();
}
