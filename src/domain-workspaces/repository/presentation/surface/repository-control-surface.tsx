"use client";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
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
import { RepositoryControlDialogStack } from "./repository-control-dialog-stack.tsx";
import { useRepositoryControlController } from "./use-repository-control-controller.ts";
import { RepositoryProposalGatePanel } from "./repository-proposal-gate-panel.tsx";

export function RepositoryControlSurface({
  entryIntent = null,
  onOpenDeliveryCatalog,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onOpenDeliveryCatalog?: (repositoryId: string) => void;
}) {
  const controller = useRepositoryControlController({
    entryIntent,
    onOpenDeliveryCatalog,
  });
  const selectedRepository = controller.selectedRepository;
  const overview = <>
    <RepositoryControlOverviewPanel
      canProvisionRepository={controller.overview.canProvisionRepository}
      onOpenRepositoryRequestDraft={controller.overview.onOpenRepositoryRequestDraft}
      requestSubmittedAt={controller.overview.requestSubmittedAt}
      summary={controller.overview.summary} workspaceStatus={controller.overview.workspaceStatus} />
    <RepositoryProposalGatePanel subjectRef={entryIntent?.subjectRef}
      custodyCurrent={controller.proposalGate.custodyCurrent} custodyResults={controller.proposalGate.custodyResults} />
  </>;

  if (!selectedRepository) {
    return (
      <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-repository-control-surface="unavailable"
        mode="overview-register-selected"
        overview={overview}
        register={
          <TerasEmptyState fill>
            No canonical Repository records are available to select. Provision
            a repository above when required; live mode never substitutes fixtures.
          </TerasEmptyState>
        }
        selected={
          <TerasEmptyState fill>
            No canonical Repository record is available to select.
          </TerasEmptyState>
        }
      />
      <RepositoryControlDialogStack controller={controller} />
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
            description="Contract-shaped repository records for request, admission, blocked-path inspection, and retirement requests."
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
              description: selectedRepository.nextAction,
              kicker: "Required Action",
              node: (<TerasActionRow>
                <TerasActionButton
                  data-repository-selected-action="true"
                  onClick={controller.selectedRepositoryAction.open}
                  emphasis="primary"
                >
                  {repositorySelectedActionLabel(
                    selectedRepository,
                    controller.selectedRepositoryCustodyResult,
                  )}
                </TerasActionButton>
                <TerasActionButton emphasis="secondary" disabled={!controller.intake.canPrepare}
                  data-repository-intake-open="true" onClick={controller.intake.open}>
                  Prepare Workspace Intake
                </TerasActionButton>
              </TerasActionRow>),
              title: repositorySelectedActionTitle(
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
      <RepositoryControlDialogStack controller={controller} />
    </>
  );
}
