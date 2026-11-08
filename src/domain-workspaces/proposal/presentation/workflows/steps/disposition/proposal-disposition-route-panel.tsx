import { proposalWorkflowTextLabel, proposalWorkflowTextLength, proposalWorkflowTextLimit } from "../../../../work-model/proposal-text-limits.ts";
import {
  TerasActionButton,
  TerasChoiceGroup,
  TerasFieldGrid,
  TerasEmptyState,
  TerasContentRegion,
  TerasContentTray,
  TerasNoteField,
  TerasLoadingState,
  TerasPanel,
  TerasPanelHeader,
  TerasReadoutField,
  TerasSelectField,
  TerasTextField,
} from "@/teras";

import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
  ProposalRepositoryChoice,
  ProposalRouteSelectionTarget,
} from "../../../../work-model/proposal-disposition-model.ts";
import { proposalUsesPrototypeStudio, prototypeStudioRepositoryRef } from "../../../../work-model/proposal-disposition-model.ts";
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
  selectedRepo, registeredRepositories, repositorySearch, repositoriesCurrent = true, repositoriesLoading = false, onRefreshRepositories,
}: {
  accepting: boolean;
  decisionDraft: ProposalDecisionDraft;
  dispositionCompleted: boolean;
  onRegisteredRepoSelect: (repoRef: string) => void;
  onRepoModeSelect: (repoMode: ProposalRepositoryChoice) => void;
  onRouteDraftPatch: (patch: Partial<ProposalRouteSelectionDraft>) => void;
  onRouteTargetSelect: (routeTarget: ProposalRouteSelectionTarget) => void;
  historicalRouteMissing?: boolean;
  routeHasRepositoryGate: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
  routeSupportsRepository: boolean;
  selectedRepo: ProposalRegisteredRepoOption | null;
  registeredRepositories?: ProposalRegisteredRepoOption[];
  repositorySearch?: {query: string; onQueryChange: (value: string) => void; more: boolean; error: string | null};
  repositoriesCurrent?: boolean;
  repositoriesLoading?: boolean;
  onRefreshRepositories?: () => void;
}) {
  const routePanelProjection =
    proposalDispositionRoutePanelProjection(accepting);
  const studio = proposalUsesPrototypeStudio(routeSelectionDraft);

  return (
    <TerasPanel spacing="normal"
      frame="padded"
      treatment="state"
      layout="header-body"
      overflow="hidden"
      tone="info"
    >
      <TerasPanelHeader
        description={historicalRouteMissing ? "The completed source has no retained route details."
          : accepting && routeSelectionDraft.routeTarget === "Prototype"
            ? "Choose where to incubate this idea. Prototype Studio holds experimental source without a separate project repository."
            : routePanelProjection.description}
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
                readOnly={dispositionCompleted || decisionDraft.sourceHomeCorrection}
                selectedId={routeSelectionDraft.routeTarget}
              />
              <TerasChoiceGroup
                ariaLabel="Proposal repository requirement"
                frame="tray"
                label={routeSelectionDraft.routeTarget === "Prototype" ? "Prototype source home" : "Repository requirement"}
                onSelect={onRepoModeSelect}
                options={proposalDispositionRepoModeChoiceOptions({
                  dispositionCompleted,
                  routeSelectionDraft,
                })}
                readOnly={dispositionCompleted || !routeSupportsRepository}
                selectedId={
                  routeSupportsRepository
                    ? studio ? "studio" : routeSelectionDraft.repoMode
                    : "not-required"
                }
              />
            </TerasFieldGrid>

            {studio && repositoriesLoading && !dispositionCompleted ? <TerasLoadingState inline label="Checking repository list…" /> : studio ? <TerasContentTray kicker="Incubate in Prototype Studio"
              description={dispositionCompleted ? "The recorded source home is Prototype Studio. This choice did not request a separate project repository."
                : repositoriesCurrent && selectedRepo ? "Explore in Studio's existing repository. A dedicated product repository can wait until the idea progresses. Studio's repository visibility applies to the source stored there."
                : "Prototype Studio is not available in the current repository list. Refresh the list before recording this choice; no repository is created automatically."}
              actions={!dispositionCompleted && (!repositoriesCurrent || !selectedRepo) && onRefreshRepositories
                ? <TerasActionButton emphasis="secondary" onClick={onRefreshRepositories}>Refresh repository list</TerasActionButton> : undefined} /> : routeHasRepositoryGate &&
            routeSelectionDraft.repoMode === "existing" ? (
              dispositionCompleted ? <TerasReadoutField label="Existing responsible repository" value={routeSelectionDraft.repoRef} /> : <>
              {repositorySearch ? <TerasTextField label="Search onboarded repositories" value={repositorySearch.query} onValueChange={repositorySearch.onQueryChange} placeholder="Search by repository name" /> : null}
              {repositorySearch?.error ? <TerasContentTray kicker="Repository search unavailable" description={repositorySearch.error} /> : null}
              {repositorySearch?.more ? <TerasContentTray kicker="More repositories available" description="Narrow the search to find the repository you want. Only the current result page is shown." /> : null}
              <TerasSelectField
                disabled={!repositoriesCurrent}
                helper={
                  selectedRepo
                    ? `${selectedRepo.owner} / ${selectedRepo.value}`
                    : repositoriesCurrent ? "Use an existing repository for this work. Reuse does not create a new-repository request." : "Current repository Inventory is unavailable. Refresh before selecting a repository."
                }
                label="Existing implementation repository"
                onValueChange={onRegisteredRepoSelect}
                options={proposalRegisteredRepoSelectOptions(routeSelectionDraft.routeTarget === "Prototype"
                  ? registeredRepositories?.filter(repo => repo.value !== prototypeStudioRepositoryRef && (!repositorySearch?.query || repo.label.includes(repositorySearch.query))) : registeredRepositories?.filter(repo => !repositorySearch?.query || repo.label.includes(repositorySearch.query)))}
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
                description={routeSelectionDraft.routeTarget === "Prototype"
                  ? "Choose Prototype Studio or another repository before handoff. The recorded no-repository choice does not identify an incubation source home."
                  : "This work does not require a repository before handoff review."}
                kicker="Repository Requirement"
              />
            )}

            <TerasNoteField
              fill
              aria-label="Route rationale"
            aria-invalid={proposalWorkflowTextLength(routeSelectionDraft.rationale) > proposalWorkflowTextLimit}
            label={proposalWorkflowTextLabel("Route rationale", routeSelectionDraft.rationale)}
              onValueChange={(rationale) => onRouteDraftPatch({ rationale })}
              placeholder="Why is this the right destination, and what repository arrangement does it need?"
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
