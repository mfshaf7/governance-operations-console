import type { WorkspaceContinuityProjection } from "../../../workspace-continuity/workspace-continuity-types.ts";
import type { RepositoryWorkspaceRecord } from "../domain/repository-types.ts";
import type { RepositoryRegistrationLookup } from "../../../workspace-registry/workspace-repository-status.ts";

// Custody receipts describe the completed provider action. Only current canonical
// inventory can establish whether its exact approved workspace owner is admitted.
export function projectRepositoryCurrentInventory(
  records: readonly RepositoryWorkspaceRecord[],
  projection: WorkspaceContinuityProjection | null,
  registrations?: RepositoryRegistrationLookup | null,
): RepositoryWorkspaceRecord[] {
  return records.map((record): RepositoryWorkspaceRecord => {
    const ownerRef = record.custody?.workspaceOwnerRef;
    const matches = projection?.inventory.filter(
      (item) => item.kind === "repo" && item.record_id === ownerRef,
    ) ?? [];
    const native = registrations?.mode === "current" ? registrations.records.find(row => row.record_id === ownerRef) : undefined;
    const provider = record.providerIdentity;
    const identityChanged = Boolean(native && (!provider || native.provider_repository.provider_repository_id !== provider.repositoryId ||
      native.provider_repository.full_name !== `${provider.owner}/${provider.name}`));
    const unconfirmed = !matches.length && registrations !== undefined && (registrations === null || registrations.mode === "current" && !registrations.recordIds.includes(ownerRef ?? ""));
    if (!projection || !ownerRef?.startsWith("repo:") || matches.length > 1 || native && matches.length > 0 || identityChanged || unconfirmed) {
      const detail = !projection
        ? "Current Workspace inventory is unavailable. Custody history does not establish admission."
        : unconfirmed ? "Current repository registration has not been verified. Refresh before preparing another intake."
          : "The workspace association does not match one exact repository inventory identity.";
      return {
        ...record,
        admissionState: "blocked",
        admissionPosture: [...historyPosture(record), {
          description: detail,
          id: "admission",
          items: [{ label: "Workspace inventory", detail, state: "blocked", tone: "danger", value: "unavailable" }],
          kicker: "Admission", title: "Workspace Admission", tone: "danger",
        }],
        blockers: [...record.blockers, {
          id: "current-inventory-unavailable", label: "Current admission unavailable",
          detail, action: "Refresh current Workspace inventory before preparing intake.",
          owner: "workspace-governance", severity: "blocked", sourceRef: "workspace-continuity://inventory",
        }],
        nextAction: "Refresh current Workspace inventory before deciding the next admission action.",
        tone: "danger",
      };
    }
    if (native?.phase === "intake") {
      const detail = `This repository already has an internal ${native.status} registration at version ${native.version}.`;
      return { ...record, admissionState: native.status === "out-of-scope" ? "blocked" : "ready",
        admissionPosture: [...historyPosture(record), { id: "admission", kicker: "Registration", title: "Workspace Registration", tone: "info",
          description: detail, items: [{ label: "Classification", value: native.status, detail, tone: "info", state: "reference" }] }],
        nextAction: native.status === "admitted" ? "Review promotion in Workspace Registry. Registration is already complete."
          : "Continue the existing repository setup and classification; do not create a duplicate registration." };
    }
    const current = native ? { record_id: native.record_id, record_version: native.version, posture: native.status, lifecycle: native.status } : matches[0];
    if (!current) return record;
    const retired = current.posture === "retired";
    const active = current.posture === "active";
    const tone = retired ? "muted" : active ? "ok" : "warn";
    const detail = `Canonical Workspace inventory ${current.record_id} is ${current.posture} at version ${current.record_version}.`;
    return {
      ...record,
      admissionState: retired ? "retired" : active ? "admitted" : "blocked",
      admissionPosture: [...historyPosture(record), {
        description: "Current inventory supersedes the admission handoff in the historical custody receipt.",
        id: "admission",
        items: [{ label: "Workspace inventory", detail, state: retired ? "retired" : active ? "clear" : "blocked", tone, value: current.posture },
          { label: native ? "Internal registration" : "Authority revision", detail: native ? "Installation-private operational record." : "Workspace Governance canonical inventory projected through WGCF.", state: "reference", tone: "info", value: native ? `v${native.version}` : projection.authority.revision }],
        kicker: "Admission", title: "Workspace Admission", tone,
      }],
      blockers: active || retired ? record.blockers : [...record.blockers, {
        id: "workspace-inventory-suspended", label: "Workspace repository suspended", detail,
        action: "Review the existing Workspace Registry lifecycle record.", owner: "workspace-governance",
        severity: "blocked", sourceRef: `workspace-continuity://inventory/${current.record_id}`,
      }],
      lifecycle: current.lifecycle,
      lastValidation: `${record.lastValidation} / inventory ${native ? "internal record" : projection.authority.revision} v${current.record_version}`,
      nextAction: active
        ? "Review the admitted repository and its history. Workspace intake is already complete."
        : "Review the existing Workspace Registry lifecycle record; do not prepare duplicate intake.",
      routeSource: `${record.routeSource} / current Workspace inventory`,
      runtimeLane: { decision: "pending", detail: "Inventory admission does not establish runtime readiness. Consult the Platform record.", status: "platform-authority", tone: "info" },
      securityBinding: { detail: "Inventory admission does not establish Security acceptance. Consult the Security review record.", required: false, status: "not-evaluated", subject: false, tone: "info" },
      tone,
    } satisfies RepositoryWorkspaceRecord;
  });
}

function historyPosture(record: RepositoryWorkspaceRecord) {
  return record.admissionPosture.filter((group) => group.id !== "admission");
}
