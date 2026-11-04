import { TerasContentTray } from "@/teras";

// Guidance for the current owner adapter, not an admission or permission decision.
// Actual eligibility is read from OOS before preparing a source change.
export function RepositoryDevelopmentScope({ visibility }: { visibility?: "internal" | "private" | "public" }) {
  const restricted = visibility === "private" || visibility === "internal";
  return <TerasContentTray
    kicker="Development availability"
    title={restricted ? "Private source requires approved access" : "Current repository setup scope"}
    description={restricted
      ? "Create or link this repository without changing its visibility. Setup and verification changes require approved access to this repository on main. The service checks availability before preparing changes."
      : "Repository setup uses source on main with eligible source-only registration. The service verifies approved source access and existing controls before preparing changes."}
  />;
}
