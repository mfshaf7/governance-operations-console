import type { DeliveryWorkSessionProjection } from "../../../../live-runtime/delivery-work-session-live-types.ts";

// Visibility for the selected scope's supporting action only. OOS still owns
// renewal, source authorization and the primary work-session next action.
export function canContinueApprovedSourceAccess(runtime: {
  mode: "disconnected-preview" | "live" | null;
  projectionStatus: "current" | "loading" | "offline";
  projection: DeliveryWorkSessionProjection | null;
}) {
  return runtime.mode === "live" && runtime.projectionStatus === "current" &&
    Boolean(runtime.projection?.session_id && runtime.projection.session_revision) &&
    runtime.projection?.next_action?.code === "agent-source-credential-required";
}
