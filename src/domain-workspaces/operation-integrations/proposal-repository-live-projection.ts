import type { ProposalLiveSnapshot } from "../proposal/live-runtime/proposal-live-types.ts";
import type { ProposalRepositoryGateRequest } from "../operation-contracts/proposal-repository-live.ts";
import { proposalCollectionComplete } from "../proposal/live-runtime/proposal-collection-read.ts";

export function projectCanonicalRepositoryGateRequests(snapshot: ProposalLiveSnapshot | null,
  { retainStale = false }: { retainStale?: boolean } = {}): ProposalRepositoryGateRequest[] {
  if (snapshot?.mode !== "live" || (!retainStale && snapshot.status !== "current")) return [];
  return snapshot.records.flatMap(({ projection }) => {
    const sourceCurrent = snapshot.status === "current" && projection.projection_state === "current";
    const gate = projection.route?.source_custody;
    const eligible = projection.status === "accepted" ||
      (projection.status === "implemented" && Boolean(projection.repository_resolution || gate?.repository_gate_state === "resolved"));
    if (!eligible || (!retainStale && !sourceCurrent) ||
        projection.route?.source_custody.classification !== "new-repo-required") return [];
    return [{ proposalId: projection.proposal_id, title: projection.title, recordRef: projection.record_ref,
      recordVersion: projection.record_version, sourceCurrent, resolution: projection.repository_resolution ?? null,
      gateState: gate!.repository_gate_state, resolvedRepositoryRef: gate!.repository_gate_state === "resolved" ? gate!.source_ref : null,
      recovery: projection.repository_resolution_history_pending ? projection.repository_resolution ?? null : null }];
  });
}

export function repositoryRequestState(request: ProposalRepositoryGateRequest) {
  return request.recovery ? "confirmation" : request.gateState === "resolved" || request.resolution ? "resolved" : "repository";
}
export function repositoryRequestStateLabel(request: ProposalRepositoryGateRequest) {
  return { confirmation: "Finish confirmation", resolved: "Resolved", repository: "Needs repository" }[repositoryRequestState(request)];
}
export function repositoryRequestAttentionCount(snapshot: ProposalLiveSnapshot | null): number | null {
  if (snapshot?.mode !== "live" || !proposalCollectionComplete(snapshot) ||
      snapshot.records.some(({projection}) => projection.projection_state !== "current")) return null;
  return projectCanonicalRepositoryGateRequests(snapshot).filter(request => repositoryRequestState(request) !== "resolved").length;
}
