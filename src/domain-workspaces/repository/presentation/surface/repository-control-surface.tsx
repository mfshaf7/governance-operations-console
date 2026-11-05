"use client";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasLoadingState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
} from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";

import { RepositoryControlOverviewPanel } from "./repository-control-overview-panel.tsx";
import { RepositoryWorkspaceRegisterTable } from "./repository-workspace-register-table.tsx";
import {
  repositoryRecordStatusLabel,
  repositoryRecordTone,
  repositorySelectedPanelMetadata,
} from "../shared/repository-display-model.ts";
import {
  repositorySelectedActionLabel,
  repositorySelectedActionTitle,
} from "../shared/repository-control-projection.ts";
import type { RepositoryControlController } from "./use-repository-control-controller.ts";
import {RepositoryPageControls} from "../shared/repository-page-controls.tsx";

export function RepositoryControlSurface({
  entryIntent = null,
  controller,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  controller: RepositoryControlController;
}) {
  const selectedRepository = controller.selectedRepository;
  const overview =
    <RepositoryControlOverviewPanel
      canOpenRepositoryRequest={controller.overview.canOpenRepositoryRequest}
      partial={controller.overview.partial}
      unavailable={Boolean(controller.sourceAvailability.error)}
      canLinkRepository={controller.standaloneLink.enabled}
      onOpenExistingRepositoryLink={controller.standaloneLink.show}
      onOpenRepositoryRequestDraft={controller.overview.onOpenRepositoryRequestDraft}
      requestSubmittedAt={controller.overview.requestSubmittedAt}
      summary={controller.overview.summary} workspaceStatus={controller.overview.workspaceStatus} />;

  const readFailure = controller.sourceAvailability.error ? <TerasEmptyState fill>
    <div role="alert"><strong>Repositories could not be loaded</strong><p>{controller.sourceAvailability.error}</p>
      <p>Previously loaded records are kept. This does not mean the register is empty.</p>
      <TerasActionButton emphasis="secondary" onClick={() => void controller.sourceAvailability.retry()}>Retry loading repositories</TerasActionButton>
    </div>
  </TerasEmptyState> : null;
  if (!selectedRepository || readFailure) {
    return (
      <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-repository-control-surface="unavailable"
        mode="overview-register-selected"
        overview={overview}
        register={
          readFailure ?? (controller.sourceAvailability.loading ? <TerasLoadingState fill label="Loading repositories…" /> : <TerasEmptyState fill>
            No repository records are available to select. Create a repository
            or link an existing one using the actions above.
          </TerasEmptyState>)
        }
        selected={
          controller.sourceAvailability.loading ? <TerasLoadingState fill label="Preparing repository details…" skeleton="details" /> : <TerasEmptyState fill>
            No canonical Repository record is available to select.
          </TerasEmptyState>
        }
      />
      </>
    );
  }

  return (
    <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-repository-control-entry-subject={entryIntent?.subjectRef ?? ""}
        data-repository-control-surface="true"
        mode="overview-register-selected"
        overview={overview}
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-repository-register": "standard",
            }}
            density="compact-control"
            description={controller.register.page.cursor
              ? `${controller.records.all.length} repositories loaded. Search, filters and summary cover these records; load more to include the next page.`
              : "Repository requests, workspace association, admission status and retained history."}
            actions={controller.register.page.cursor || controller.register.page.continuationError ? <RepositoryPageControls page={controller.register.page} label="repositories" compact /> : undefined}
            filterBar={<RepositoryFilters controller={controller} />}
            kicker="Repository Register"
            statusLabel={`${controller.records.filtered.length}/${controller.records.all.length} shown`}
            statusTone="info"
            title="Repository register"
          >
            {controller.records.filtered.length > 0 ? (
              <RepositoryWorkspaceRegisterTable
                onInspectRepository={controller.register.inspect}
                onSelectRepository={controller.register.select}
                records={controller.records.filtered}
                selectedRepositoryId={selectedRepository.id}
              />
            ) : (
              <TerasEmptyState fill>
                No repository records match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <TerasSelectedPanel
            action={{
              description: controller.intake.required
                ? controller.intake.unavailableReason ?? "Review whether this repository should join the managed workspace, including its responsibilities and checks."
                : selectedRepository.nextAction,
              kicker: selectedRepository.blockers.length ? "Needs attention" : "Available actions",
              node: (<TerasActionRow>
                {controller.intake.required ? <>
                  <TerasActionButton emphasis="primary"
                    data-repository-selected-action="true" data-repository-intake-open="true"
                    disabled={!controller.intake.canPrepare} onClick={controller.intake.open}>
                    Continue onboarding in Registry
                  </TerasActionButton>
                  <TerasActionButton emphasis="secondary" onClick={controller.selectedRepositoryAction.open}>
                    Inspect Repository
                  </TerasActionButton>
                </> : <TerasActionButton
                  data-repository-selected-action="true"
                  onClick={controller.selectedRepositoryAction.open}
                  emphasis="primary"
                >
                  {repositorySelectedActionLabel(
                    selectedRepository,
                    controller.selectedRepositoryCustodyResult,
                  )}
                </TerasActionButton>}
                {controller.verification.available ? <TerasActionButton emphasis="secondary" onClick={controller.verification.show}>Application verification</TerasActionButton> : null}
              </TerasActionRow>),
              title: controller.intake.required ? "Onboarding required" : selectedRepository.admissionState === "admitted" ? "Workspace registration complete" : repositorySelectedActionTitle(
                selectedRepository,
                controller.selectedRepositoryCustodyResult,
              ),
            }}
            description={selectedRepository.purpose}
            kicker="Repository Context"
            meta={repositorySelectedPanelMetadata(selectedRepository)}
            selected
            status={{
              label: repositoryRecordStatusLabel(selectedRepository),
              tone: repositoryRecordTone(selectedRepository),
            }}
            title={selectedRepository.name}
            tone={repositoryRecordTone(selectedRepository)}
            variant="compact"
          />
        }
        selectedProps={{
          "data-repository-selected-launcher": "true",
        }}
      />
    </>
  );
}

function RepositoryFilters({controller}: {controller: RepositoryControlController}) {
  const status = {label: "Filter repository status", onValueChange: controller.filters.onStatusChange,
    options: controller.filters.statusOptions, value: controller.filters.status};
  const account = {label: "Filter GitHub account", onValueChange: controller.filters.onAccountChange,
    options: controller.filters.accountOptions, value: controller.filters.account};
  const search = {ariaLabel: "Search repositories", onValueChange: controller.filters.onSearchChange,
    placeholder: controller.register.page.cursor ? "Search loaded repositories…" : "Search repository, workspace association, route, class...", value: controller.filters.search};
  return controller.filters.accountOptions.length > 2
    ? <TerasFilterBar data-repository-filter-bar="true" filters={[account, status]} search={search} />
    : <TerasFilterBar data-repository-filter-bar="true" filters={[status]} search={search} />;
}
