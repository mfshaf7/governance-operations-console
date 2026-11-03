import type { RepositoryWorkspaceRecord } from "../domain/repository-types.ts";
import type { RepositoryLifecycleLiveSnapshot } from "./repository-lifecycle-live-types.ts";
import type { RepositoryProviderObservationSnapshot } from "./use-repository-provider-observations.ts";

// Creation receipts and lifecycle audit state are recorded evidence. A separate
// matching provider lookup supplies the GitHub observation. Neither replaces
// Workspace Inventory or authorizes a lifecycle action.
export function repositoryProviderObservation(
  record: RepositoryWorkspaceRecord,
  snapshot?: RepositoryLifecycleLiveSnapshot,
  error?: string,
  refreshing = false,
  providerRead?: RepositoryProviderObservationSnapshot,
) {
  const identity = record.providerIdentity, audit = snapshot?.audit, readback = providerRead?.readback;
  const boundAudit = Boolean(audit && identity && audit.repository_identity.provider === identity.provider && audit.repository_identity.provider_repository_id === identity.repositoryId);
  const boundProvider = Boolean(readback && identity && readback.provider === identity.provider && readback.provider_repository_id === identity.repositoryId);
  const current = boundProvider && !providerRead?.loading && !providerRead?.error;
  const value = readback?.provider_lifecycle_state === "archived" ? "Archived" : "Active";
  const unavailable = Boolean(providerRead?.error || (readback && !boundProvider));
  const label = current ? value : providerRead?.loading ? "Refreshing" : unavailable ? "Unavailable" : "Not checked";
  const detail = current ? "GitHub status from the latest identity-checked lookup. Workspace registration is separate."
    : unavailable ? "Current GitHub status could not be confirmed. Earlier evidence remains available."
    : providerRead?.loading ? "Reading GitHub status. Earlier evidence remains visible."
    : "Open History to check GitHub status. Creation and link receipts describe their original actions.";
  return {
    current, label, detail,
    tone: current ? readback!.provider_lifecycle_state === "active" ? "ok" as const : "warn" as const : unavailable ? "warn" as const : "info" as const,
    retained: boundProvider && !current ? value : null,
    observedAt: boundProvider ? readback!.observed_at : null,
    audit: boundAudit ? audit! : null,
    recordedProvider: boundAudit ? audit!.current_state.provider_lifecycle_state : null,
    recordedAt: boundAudit ? audit!.projected_at : null,
    lifecycleReadState: error || snapshot?.status === "offline" || (audit && !boundAudit) ? "Unavailable" : refreshing ? "Refreshing"
      : boundAudit ? "Recorded" : snapshot?.status === "not-initialized" ? "Not recorded" : "Not checked",
  };
}

export function projectRepositoryProviderObservations(
  records: readonly RepositoryWorkspaceRecord[],
  providerReads: Readonly<Record<string, RepositoryProviderObservationSnapshot>>,
): RepositoryWorkspaceRecord[] {
  return records.map(record => {
    if (!record.providerIdentity) return record;
    const observation = repositoryProviderObservation(record, undefined, undefined, false, providerReads[record.id]);
    return { ...record, admissionPosture: [...record.admissionPosture.filter(group => group.id !== "provider-state"), {
      id: "provider-state", title: "Provider status", kicker: "GitHub observation", description: observation.detail,
      tone: observation.tone, statusLabel: observation.label,
      items: [{ label: "GitHub status", value: observation.current ? observation.label : "Not confirmed",
        detail: observation.detail, state: "reference" as const, tone: observation.tone, statusLabel: observation.label },
        ...(observation.retained ? [{ label: "Earlier lookup", value: observation.retained,
          detail: `Retained from ${observation.observedAt}; this is not a current confirmation.`, state: "reference" as const, tone: "info" as const, statusLabel: "Retained" }] : []),
        ...(observation.current ? [{ label: "Checked at", value: observation.observedAt!, detail: "Time GitHub returned the matching repository status.", state: "reference" as const, tone: "info" as const }] : [])],
    }] };
  });
}
