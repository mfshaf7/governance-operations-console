import { TerasMetadataList, TerasPanel, TerasPanelHeader } from "@/teras";

import { type ProposalRouteSelectionDraft } from "../../../../work-model/proposal-disposition-model.ts";
import { proposalHandoffRouteStateMetadata } from "./proposal-handoff-step-view-model.ts";

export function ProposalHandoffRouteStatePanel({
  previewMode = true,
  repositoryGateRef,
  repositoryGateLabel,
  repositoryGateOwner,
  repositoryGateResolved,
  routeSelectionDraft,
}: {
  previewMode?:boolean;
  repositoryGateRef?:string;
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
        description="Check the destination and repository before handing this proposal over."
        kicker="Handoff Draft"
        title="Route and repository state"
      />
      <TerasMetadataList
        items={proposalHandoffRouteStateMetadata({
          previewMode, repositoryGateRef,
          repositoryGateLabel,
          repositoryGateOwner,
          repositoryGateResolved,
          routeSelectionDraft,
        })}
      />
    </TerasPanel>
  );
}
