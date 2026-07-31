import { TerasMetadataList, TerasPanel, TerasPanelHeader } from "@/teras";

import { type ProposalRouteSelectionDraft } from "../../../../work-model/proposal-disposition-model.ts";
import { proposalHandoffRouteStateMetadata } from "./proposal-handoff-step-view-model.ts";

export function ProposalHandoffRouteStatePanel({
  repositoryGateLabel,
  repositoryGateOwner,
  repositoryGateResolved,
  routeSelectionDraft,
}: {
  repositoryGateLabel: string;
  repositoryGateOwner: string;
  repositoryGateResolved: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  return (
    <TerasPanel
      frame="padded"
      treatment="state"
      layout="header-body"
      overflow="hidden"
      spacing="normal"
      tone="info"
    >
      <TerasPanelHeader
        description="Review route and repository facts. The handoff command lives in the gate panel."
        kicker="Handoff Draft"
        title="Route and repository state"
      />
      <TerasMetadataList
        items={proposalHandoffRouteStateMetadata({
          repositoryGateLabel,
          repositoryGateOwner,
          repositoryGateResolved,
          routeSelectionDraft,
        })}
      />
    </TerasPanel>
  );
}
