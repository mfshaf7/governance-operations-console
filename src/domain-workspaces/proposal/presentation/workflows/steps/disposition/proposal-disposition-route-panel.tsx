import {
  TerasChoiceGroup,
  TerasFieldGrid,
  TerasContentRegion,
  TerasContentTray,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasReadoutField,
  TerasSelectField,
} from "@/teras";

import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
  ProposalRouteSelectionRepoMode,
  ProposalRouteSelectionTarget,
} from "../../../../work-model/proposal-disposition-model.ts";
import {
  proposalDispositionRepoModeChoiceOptions,
  proposalDispositionRouteChoiceOptions,
  proposalDispositionRoutePanelProjection,
  proposalRegisteredRepoSelectOptions,
  type ProposalRegisteredRepoOption,
} from "./proposal-disposition-step-view-model.ts";

export function ProposalDispositionRoutePanel({
  accepting,
  decisionDraft,
  dispositionCompleted,
  onRegisteredRepoSelect,
  onRepoModeSelect,
  onRouteDraftPatch,
  onRouteTargetSelect,
  routeHasRepositoryGate,
  routeSelectionDraft,
  routeSupportsRepository,
  selectedRepo,
}: {
  accepting: boolean;
  decisionDraft: ProposalDecisionDraft;
  dispositionCompleted: boolean;
  onRegisteredRepoSelect: (repoRef: string) => void;
  onRepoModeSelect: (repoMode: ProposalRouteSelectionRepoMode) => void;
  onRouteDraftPatch: (patch: Partial<ProposalRouteSelectionDraft>) => void;
  onRouteTargetSelect: (routeTarget: ProposalRouteSelectionTarget) => void;
  routeHasRepositoryGate: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
  routeSupportsRepository: boolean;
  selectedRepo: ProposalRegisteredRepoOption | null;
}) {
  const routePanelProjection =
    proposalDispositionRoutePanelProjection(accepting);

  return (
    <TerasPanel
      frame="padded"
      treatment="state"
      layout="header-body"
      overflow="hidden"
      tone="info"
    >
      <TerasPanelHeader
        description={routePanelProjection.description}
        kicker="Disposition Route"
        title={routePanelProjection.title}
      />
      <TerasContentRegion gap="normal" scroll>
        {accepting ? (
          <>
            <TerasFieldGrid columns={2} spacing="loose">
              <TerasChoiceGroup
                ariaLabel="Proposal route target"
                frame="tray"
                label="Route target"
                onSelect={onRouteTargetSelect}
                options={proposalDispositionRouteChoiceOptions({
                  dispositionCompleted,
                  routeSelectionDraft,
                })}
                readOnly={dispositionCompleted}
                selectedId={routeSelectionDraft.routeTarget}
              />
              <TerasChoiceGroup
                ariaLabel="Proposal repository requirement"
                frame="tray"
                label="Repository requirement"
                onSelect={onRepoModeSelect}
                options={proposalDispositionRepoModeChoiceOptions({
                  dispositionCompleted,
                  routeSelectionDraft,
                })}
                readOnly={dispositionCompleted || !routeSupportsRepository}
                selectedId={
                  routeSupportsRepository
                    ? routeSelectionDraft.repoMode
                    : "not-required"
                }
              />
            </TerasFieldGrid>

            {routeHasRepositoryGate &&
            routeSelectionDraft.repoMode === "existing" ? (
              <TerasSelectField
                disabled={dispositionCompleted}
                helper={
                  selectedRepo
                    ? `${selectedRepo.owner} / ${selectedRepo.value}`
                    : "Select a registered owner repository."
                }
                label="Existing owner repo"
                onValueChange={onRegisteredRepoSelect}
                options={proposalRegisteredRepoSelectOptions()}
                value={routeSelectionDraft.repoRef}
              />
            ) : routeHasRepositoryGate &&
              routeSelectionDraft.repoMode === "new" ? (
              <TerasReadoutField
                label="Repository request"
                value={routeSelectionDraft.repoRef}
              />
            ) : (
              <TerasContentTray
                description="This selected route does not require an owner repository reference before handoff review."
                kicker="Repository Requirement"
              />
            )}

            <TerasNoteField
              fill
              label="Route rationale"
              onValueChange={(rationale) => onRouteDraftPatch({ rationale })}
              placeholder="Explain the route target, repository handling, and handoff condition."
              readOnly={dispositionCompleted}
              value={routeSelectionDraft.rationale}
            />
          </>
        ) : (
          <TerasContentTray
            description={
              decisionDraft.outcome === "parked"
                ? "Parking keeps this proposal in the proposal backlog until the operator reopens it."
                : "Rejecting closes this proposal path and keeps handoff locked."
            }
            kicker="Routing Closed"
          />
        )}
      </TerasContentRegion>
    </TerasPanel>
  );
}
