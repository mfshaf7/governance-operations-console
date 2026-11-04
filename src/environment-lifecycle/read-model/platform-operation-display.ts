import type { PlatformOperationAction, PlatformOperationRecord, PlatformOperationSubject } from "../live-runtime/platform-operation-types.ts";

export type EnvironmentWorkspaceKind = "dev-integration" | "governed-releases";
export const workspaceSubjectKinds = (kind: EnvironmentWorkspaceKind): readonly PlatformOperationSubject["kind"][] => kind === "dev-integration"
  ? ["dev-integration-profile", "profile-request"] : ["product-release", "product-runtime-lifecycle"];

const labels: Record<PlatformOperationAction, string> = {
  "agent-source.issue": "Authorize source work", "agent-source.renew": "Renew source access", "agent-source.revoke": "Revoke source access",
  "dev-integration.request-profile": "Request profile", "dev-integration.start": "Start profile", "dev-integration.status": "Check status",
  "dev-integration.access": "Connection details", "dev-integration.smoke": "Run checks", "dev-integration.stop": "Stop profile",
  "dev-integration.reset": "Reset profile", "dev-integration.promote-check": "Check stage handoff",
  "governed-release.execute-step": "Run release action", "governed-release.change-runtime-lifecycle": "Change runtime state",
};
export const platformActionLabel = (action: PlatformOperationAction) => labels[action];
export const platformSubjectLabel = (ref: string) => ref.replace(/^(profile|product|request):/, "");
export function platformActionContext(action: PlatformOperationAction): string | null {
  if (action.startsWith("agent-source.")) return "Use the project's Source authoring workflow. Source access must be bound to its repository, approved intent and source session.";
  if (action === "dev-integration.reset") return "Use the profile's reset workflow to review its retained data and declared reset inputs.";
  if (action === "dev-integration.request-profile") return "A profile request needs its implementation repository, purpose and runtime contract. This catalog action does not provide that form.";
  if (action === "governed-release.execute-step" || action === "governed-release.change-runtime-lifecycle") return "Open the product's action form to supply its declared inputs and review the change.";
  return null;
}
export const workspaceOperations = (operations: readonly PlatformOperationRecord[], kind: EnvironmentWorkspaceKind) =>
  operations.filter(operation => workspaceSubjectKinds(kind).includes(operation.command.subject.kind));
export const operationStateLabel = (state: PlatformOperationRecord["state"]) => ({ requested: "Request received", queued: "Queued", running: "In progress", succeeded: "Completed", failed: "Failed", blocked: "Blocked", cancelled: "Cancelled" })[state];
export const operationTime = (value: string) => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
export const operationTone = (state: PlatformOperationRecord["state"]) => state === "succeeded" ? "ok" as const : state === "failed" || state === "blocked" ? "danger" as const : "info" as const;
