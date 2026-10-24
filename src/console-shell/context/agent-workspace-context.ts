import { createAgentContextCandidate, type AgentContextCandidate } from "./agent-context-candidate.ts";
import type { ConsoleWorkspaceId } from "../../console-architecture.ts";

// Read only the already validated same-origin projections. Never copy arbitrary
// owner payloads, credentials, prompts, drafts, endpoints or source bytes.
export const agentContextSources = {
  continuity: "/api/workspace-continuity",
  registry: "/api/workspace-registry",
  proposals: "/api/proposals",
  prototypes: "/api/prototypes/records",
  delivery: "/api/delivery/workspace",
  orchestration: "/api/orchestration",
  lifecycle: "/api/lifecycle-transitions",
  platform: "/api/environment-operations",
  models: "/api/model-operations/runtime/registry",
} as const;
export type AgentContextSource = keyof typeof agentContextSources;
export type AgentOwnerSnapshot = { state: "current" | "unavailable" | "preview"; detail: string; revision: string | null; capturedAt: string };
export type AgentOwnerSnapshots = Partial<Record<AgentContextSource, AgentOwnerSnapshot>>;
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const list = (v: unknown): unknown[] => { if (!Array.isArray(v)) throw new Error("Missing owner collection"); return v; };
const label = (v: unknown) => typeof v === "string" ? v.replace(/[\r\n\t]/g, " ").slice(0, 50) : "unspecified";
const examples = (rows: unknown[], id: string, title: string) => rows.slice(0, 2).map(row => `${label(object(row)[id]).slice(0, 24)}: ${label(object(row)[title]).slice(0, 32)}`).join("; ");
const revision = (v: unknown) => typeof v === "string" && /^(sha256:)?[0-9a-f]{40,64}$/.test(v) ? v : null;
const tally = (rows: unknown[], key: string) => {
  const counts = new Map<string, number>();
  for (const row of rows) { const state = label(object(row)[key]); counts.set(state, (counts.get(state) ?? 0) + 1); }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).slice(0, 5).map(([key, count]) => `${key}=${count}`).join(", ");
};
export function projectAgentOwnerSnapshot(source: AgentContextSource, value: unknown, capturedAt: string): AgentOwnerSnapshot {
  const body = object(value);
  if (body.mode === "disconnected-preview") return { state: "preview", detail: "Disconnected preview; excluded from live context", revision: null, capturedAt };
  if (body.error || ["offline", "stale", "unavailable"].includes(String(body.status))) throw new Error("Owner not current");
  let detail: string; let sourceRevision: string | null = null;
  if (source === "continuity") {
    if (body.artifact_type !== "workspace-continuity-projection" || body.projection_state !== "current") throw new Error("Continuity not current");
    const products = list(body.products);
    detail = `${list(body.inventory).length} inventory entries; ${list(body.intake).length} intake entries; ${products.length} products (${tally(products, "posture")}). Products: ${products.slice(0, 3).map(p => label(object(p).name)).join(", ")}`;
    sourceRevision = revision(object(body.authority).revision);
  } else if (source === "registry") {
    if (body.workflow_id !== "workspace-inventory-registry" || !revision(body.authority_revision)) throw new Error("Registry not current");
    const rows = list(body.records); detail = `${rows.length} Registry entries (${tally(rows, "posture")}); ${examples(rows, "id", "name")}`; sourceRevision = revision(body.authority_revision);
  } else if (source === "models") {
    const configuration = object(body.configuration); const settings = object(configuration.configuration);
    const selected = object(object(settings.default).primary);
    const model = object(object(settings.models)[String(selected.model_id)]);
    const assistant = object(object(object(settings.overrides)["agent-console-assistant-v1/assistant_response"]).primary);
    const assistantModel = object(object(settings.models)[String(assistant.model_id)]);
    detail = `${list(body.backends).length} backends; ${list(body.tasks).length} tasks; configuration revision ${label(String(configuration.current_revision))}; default ${label(model.backend_id)}/${label(model.model)} (${label(selected.effort)}); Agent ${label(assistantModel.model)} (${label(assistant.effort)})`;
    sourceRevision = revision(configuration.digest);
  } else {
    if (body.mode !== "live") throw new Error("Live owner projection required");
    if (source === "proposals") {
      const rows = list(body.records);
      if (rows.some(r => object(object(r).projection).projection_state !== "current")) throw new Error("Proposal not current");
      detail = `${rows.length} proposals (${tally(rows.map(r => object(r).projection), "status")}); ${examples(rows.map(r => object(r).projection), "proposal_id", "title")}`;
    } else if (source === "prototypes") {
      const projection = object(body.projection); const rows = list(object(projection.readModel).records);
      detail = `${rows.length} prototypes (${tally(rows, "lifecycle")}); ${rows.slice(0, 2).map(r => label(object(r).name)).join(", ")}`;
      sourceRevision = revision(projection.sourceRevision);
    } else if (source === "delivery") {
      const projection = object(body.projection); const state = object(projection.projection_state);
      if (state.status !== "fresh") throw new Error("Delivery not fresh");
      const rows = list(projection.packages); detail = `${rows.length} open Delivery initiatives (${tally(rows, "backend_status")}); ${examples(rows, "delivery_package_id", "display_name")}; done excluded`;
      sourceRevision = revision(state.source_revision);
    } else if (source === "orchestration") {
      const rows = list(body.runs); detail = `${list(body.definitions).length} definitions; ${rows.length} runs (${tally(rows, "state")})`;
    } else if (source === "lifecycle") {
      const rows = list(body.transitions); detail = `${rows.length} lifecycle transitions (${tally(rows, "state")}); ${body.truncated ? "truncated collection" : "complete collection"}`;
    } else {
      const catalog = object(body.catalog);
      if (catalog.freshness !== "current") throw new Error("Platform catalog not current");
      const rows = list(body.operations); detail = `${list(catalog.subjects).length} admitted Platform subjects; ${rows.length} retained operations (${tally(rows, "state")}). Legacy environment cards are preview-only.`;
      sourceRevision = revision(catalog.source_version);
    }
  }
  return { state: "current", detail: detail.slice(0, 160), revision: sourceRevision, capturedAt };
}
const titles = { "dev-integration": "Dev Integration", "governed-releases": "Governed Releases", "lifecycle-transitions": "Lifecycle Transitions", "workspace-registry": "Workspace Registry" } satisfies Record<ConsoleWorkspaceId, string>;
const pageSources = { "dev-integration": "platform", "governed-releases": "platform", "lifecycle-transitions": "lifecycle", "workspace-registry": "registry" } satisfies Record<ConsoleWorkspaceId, AgentContextSource>;
export function buildAgentWorkspaceContext(snapshots: AgentOwnerSnapshots, now = new Date().toISOString(), workspaceId?: ConsoleWorkspaceId): AgentContextCandidate {
  const sources: AgentContextSource[] = workspaceId ? [pageSources[workspaceId]] : ["continuity", "proposals", "prototypes", "delivery", "orchestration", "lifecycle", "platform", "models"];
  let current = 0;
  const signals = sources.map(source => {
    const snapshot = snapshots[source]; const age = snapshot ? Date.parse(now) - Date.parse(snapshot.capturedAt) : Infinity;
    if (!snapshot || snapshot.state !== "current" || !Number.isFinite(age) || age < 0 || age > 120_000) return `${source}: ${snapshot?.state === "preview" ? "preview only" : "unavailable or expired"}; no live facts attached`;
    current += 1;
    return `${source}: ${snapshot.detail}; ${snapshot.revision ? `revision ${snapshot.revision.slice(0, 19)}` : `read ${snapshot.capturedAt}`}`.slice(0, 225);
  });
  return createAgentContextCandidate({
    id: workspaceId ? `page:${workspaceId}` : "workspace:console", scope: workspaceId ? "page" : "workspace",
    title: workspaceId ? titles[workspaceId] : "Console workspace", surfaceKind: workspaceId ?? "console-workspace",
    sourceMode: current ? "source-projected" : "unavailable", sourceAuthority: "Console composition of validated OOS, WGCF and Platform reads",
    status: `${current}/${sources.length} sources current`, displayTone: current === sources.length ? "info" : "warn",
    summary: workspaceId ? `${titles[workspaceId]} page context. ${workspaceId === "dev-integration" || workspaceId === "governed-releases" ? "Platform coverage does not establish live status for legacy preview cards or a selected profile." : "Page collection summary; individual record details require the owning view."}` : "Current cross-Console overview: Registry/Portfolio, Proposal, Prototype, Delivery, Orchestration, Lifecycle, Platform and Models. Coverage below is explicit; omitted records and private details are not known.",
    freshness: "Owner read snapshots expire after 120 seconds; unavailable sources have no attached facts", projectedAt: now, observedAt: current ? now : null,
    boundary: "Read-only operator context; CGG admission required. No approval, mutation, source authoring or release authority. Preview fixtures, raw source, logs, secrets and host telemetry excluded. Open the owner view for full evidence.",
    refs: sources.map(source => `console:${agentContextSources[source]}`), signals,
    safeActions: ["Explain the visible current facts and coverage limits", "Direct the operator to the owning surface for missing details"],
  });
}
