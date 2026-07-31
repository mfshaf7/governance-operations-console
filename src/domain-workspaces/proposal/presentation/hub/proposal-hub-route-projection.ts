import {
  proposalRouteSelectionNeedsRepositoryResolution,
  proposalRouteSelectionTone,
  type ProposalRouteSelectionDraft,
} from "../../work-model/proposal-disposition-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";

export function proposalRouteSelectionProjectionTone(
  routeSelectionDraft: ProposalRouteSelectionDraft,
  repositoryGateResolution?: ProposalRepositoryGateResolution | null,
) {
  if (
    repositoryGateResolution &&
    proposalRouteSelectionNeedsRepositoryResolution(routeSelectionDraft)
  ) {
    return "ok" as const;
  }

  return proposalRouteSelectionTone(routeSelectionDraft);
}
