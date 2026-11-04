import type { AgentContextModelProjection } from "@/agent-console";
import type { DeliveryReadModel } from "../../../read-model/index.ts";
export function deliveryHomeAdvisorContext(model: DeliveryReadModel, now: number): AgentContextModelProjection {
  const age = now - Date.parse(model.projection_state.checked_at);
  const fresh = model.source_truth === "OpenProject-backed OOS" && model.projection_state.status === "fresh" && Number.isFinite(age) && age >= 0 && age <= 120_000;
  return {
    schemaVersion: 1, id: "page:DELIVERY", scope: "page", title: "Delivery Home", surfaceKind: "DELIVERY",
    sourceMode: fresh ? "source-projected" : "unavailable", sourceAuthority: "Console projection of validated OOS Delivery reads",
    freshness: "Delivery overview expires after 120 seconds; workflow eligibility requires its own source read",
    observedAt: fresh ? model.projection_state.checked_at : null, projectedAt: new Date(now).toISOString(),
    refs: ["console:/api/delivery/workspace"], status: fresh ? "Current Delivery overview" : "Delivery context unavailable",
    summary: fresh ? `${model.packages.length} packages in the current Delivery scope. Exact work-item details and eligibility remain with their source views.` : "Current workflow context is unavailable. Preview examples are excluded from model context.",
    signals: fresh ? ["intake", "work_design", "refinement", "execution"].map(phase => `${phase}: ${model.packages.filter(p => p.workflow_phase === phase).length} packages`) : [],
    safeActions: ["Explain current Delivery overview facts and coverage", "Guide the operator to the relevant Delivery surface"],
    boundary: "Read-only Delivery guidance through OOS sessions and CGG admission. No final decisions, workflow mutation, source bytes, private drafts or raw logs are attached.",
  };
}
