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
      canProvisionRepository={controller.overview.canProvisionRepository}
      onOpenRepositoryRequestDraft={controller.overview.onOpenRepositoryRequestDraft}
      requestSubmittedAt={controller.overview.requestSubmittedAt}
      summary={controller.overview.summary} workspaceStatus={controller.overview.workspaceStatus} />;

  if (!selectedRepository) {
    return (
      <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-repository-control-surface="unavailable"
        mode="overview-register-selected"
        overview={overview}
        register={
          controller.sourceAvailability.loading ? <TerasLoadingState fill label="Loading repositories…" /> : <TerasEmptyState fill>
            No canonical Repository records are available to select. Provision
            a repository above when required; live mode never substitutes fixtures.
          </TerasEmptyState>
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
            description="Repository requests, ownership, admission status and retained history."
            filterBar={
              <TerasFilterBar
                data-repository-filter-bar="true"
                filters={[
                  {
                    label: "Filter repository status",
                    onValueChange: controller.filters.onStatusChange,
                    options: controller.filters.statusOptions,
                    value: controller.filters.status,
                  },
                ]}
                search={{
                  ariaLabel: "Search repositories",
                  onValueChange: controller.filters.onSearchChange,
                  placeholder: "Search repository, owner, route, class...",
                  value: controller.filters.search,
                }}
              />
            }
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
                ? controller.intake.unavailableReason ?? "Review whether this repository should join the managed workspace, including its ownership and checks."
                : selectedRepository.nextAction,
              kicker: selectedRepository.blockers.length ? "Needs attention" : "Available actions",
              node: (<TerasActionRow>
                {controller.intake.required ? <>
                  <TerasActionButton emphasis="primary"
                    data-repository-selected-action="true" data-repository-intake-open="true"
                    disabled={!controller.intake.canPrepare} onClick={controller.intake.open}>
                    Review workspace registration
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
              title: controller.intake.required ? "Workspace registration" : selectedRepository.admissionState === "admitted" ? "Workspace registration complete" : repositorySelectedActionTitle(
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
