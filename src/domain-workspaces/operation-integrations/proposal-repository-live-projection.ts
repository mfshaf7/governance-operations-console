import type { ProposalLiveSnapshot } from "../proposal/live-runtime/proposal-live-types.ts";
import type { ProposalRepositoryGateRequest } from "../operation-contracts/proposal-repository-live.ts";

export function projectCanonicalRepositoryGateRequests(snapshot: ProposalLiveSnapshot | null): ProposalRepositoryGateRequest[] {
  if (snapshot?.mode !== "live" || snapshot.status !== "current") return [];
  return snapshot.records.flatMap(({ projection }) => {
    if (projection.status !== "accepted" || projection.projection_state !== "current" ||
        projection.route?.source_custody.classification !== "new-repo-required") return [];
    return [{ proposalId: projection.proposal_id, title: projection.title, recordRef: projection.record_ref,
      recordVersion: projection.record_version, resolution: projection.repository_resolution ?? null,
      recovery: projection.repository_resolution_history_pending ? projection.repository_resolution ?? null : null }];
  });
}
