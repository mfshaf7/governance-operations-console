import {
  TerasActionButton,
  TerasChoiceGroup,
  TerasFieldGrid,
  TerasEmptyState,
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
  historicalRouteMissing = false,
  routeHasRepositoryGate,
  routeSelectionDraft,
  routeSupportsRepository,
  selectedRepo, registeredRepositories, repositoriesCurrent = true, onRefreshRepositories,
}: {
  accepting: boolean;
  decisionDraft: ProposalDecisionDraft;
  dispositionCompleted: boolean;
  onRegisteredRepoSelect: (repoRef: string) => void;
  onRepoModeSelect: (repoMode: ProposalRouteSelectionRepoMode) => void;
  onRouteDraftPatch: (patch: Partial<ProposalRouteSelectionDraft>) => void;
  onRouteTargetSelect: (routeTarget: ProposalRouteSelectionTarget) => void;
  historicalRouteMissing?: boolean;
  routeHasRepositoryGate: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
  routeSupportsRepository: boolean;
  selectedRepo: ProposalRegisteredRepoOption | null;
  registeredRepositories?: ProposalRegisteredRepoOption[];
  repositoriesCurrent?: boolean;
  onRefreshRepositories?: () => void;
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
        description={historicalRouteMissing ? "The completed source has no retained route details." : routePanelProjection.description}
        kicker="Disposition Route"
        title={historicalRouteMissing ? "Historical route" : routePanelProjection.title}
      />
      <TerasContentRegion gap="normal" scroll>
        {historicalRouteMissing ? (
          <TerasEmptyState>
            No route details were recorded for this completed proposal. No new route is required.
          </TerasEmptyState>
        ) : accepting ? (
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
              dispositionCompleted ? <TerasReadoutField label="Existing owner repository" value={routeSelectionDraft.repoRef} /> : <>
              <TerasSelectField
                disabled={!repositoriesCurrent}
                helper={
                  selectedRepo
                    ? `${selectedRepo.owner} / ${selectedRepo.value}`
                    : repositoriesCurrent ? "Use an existing repository for this work. Reuse does not create a new-repository request." : "Current repository Inventory is unavailable. Refresh before selecting an owner."
                }
                label="Existing owner repo"
                onValueChange={onRegisteredRepoSelect}
                options={proposalRegisteredRepoSelectOptions(registeredRepositories)}
                value={routeSelectionDraft.repoRef}
              />
              {!repositoriesCurrent && onRefreshRepositories ? <TerasActionButton emphasis="secondary" onClick={onRefreshRepositories}>Refresh repository list</TerasActionButton> : null}
              </>
            ) : routeHasRepositoryGate &&
              routeSelectionDraft.repoMode === "new" ? (
              <TerasContentTray kicker="New repository request"
                description="Accepting this Proposal creates a request in Repository Control. Create it there or attach one already created for that request, then confirm its result before handoff." />
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
