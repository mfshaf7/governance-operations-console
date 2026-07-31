import {
  TerasActionButton,
  TerasMetadataList,
  TerasPanel,
  TerasPanelActionLayout,
  TerasPanelHeader,
  type TerasTone,
} from "@/teras";
import { proposalHandoffRepositoryGateMetadata } from "./proposal-handoff-step-view-model.ts";

export function ProposalHandoffRepositoryGatePanel({
  onOpenRepositorySurface,
  proposalId,
  repositoryCueAction,
  repositoryCueActionTone,
  repositoryCueActionEmphasis,
  repositoryCueBody,
  repositoryCueState,
  repositoryCueTitle,
  repositoryCueTone,
  repositoryGateRef,
  routeHasRepositoryGate,
}: {
  onOpenRepositorySurface?: (proposalId: string) => void;
  proposalId: string;
  repositoryCueAction: string;
  repositoryCueActionTone: TerasTone;
  repositoryCueActionEmphasis: "primary" | "secondary";
  repositoryCueBody: string;
  repositoryCueState: string;
  repositoryCueTitle: string;
  repositoryCueTone: TerasTone;
  repositoryGateRef: string;
  routeHasRepositoryGate: boolean;
}) {
  const repositoryAction =
    routeHasRepositoryGate && onOpenRepositorySurface ? (
      <TerasActionButton
        data-proposal-open-repository-control-action="true"
        emphasis={repositoryCueActionEmphasis}
        onClick={() => onOpenRepositorySurface(proposalId)}
        tone={repositoryCueActionTone === "danger" ? "danger" : "accent"}
      >
        Open Repository Control
      </TerasActionButton>
    ) : null;
  const repositoryFacts = (
    <TerasMetadataList
      items={proposalHandoffRepositoryGateMetadata({
        proposalId,
        repositoryCueAction,
        repositoryCueState,
        repositoryGateRef,
      })}
    />
  );

  return (
    <TerasPanel
      frame="padded"
      treatment="rail"
      spacing="normal"
      tone={repositoryCueTone}
    >
      <TerasPanelHeader
        description={repositoryCueBody}
        kicker="Repository Gate"
        statusLabel={repositoryCueState}
        statusTone={repositoryCueTone}
        title={repositoryCueTitle}
      />
      {repositoryAction ? (
        <TerasPanelActionLayout
          action={repositoryAction}
          header={repositoryFacts}
        />
      ) : (
        repositoryFacts
      )}
    </TerasPanel>
  );
}
