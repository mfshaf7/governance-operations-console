"use client";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
} from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import { ProposalCaptureModal } from "../dialogs/capture/proposal-capture-modal.tsx";
import { ProposalDetailModal } from "../dialogs/details/proposal-detail-modal.tsx";
import { ProposalHubModal } from "../hub/proposal-hub-modal.tsx";
import { ProposalControlOverviewPanel } from "./proposal-control-overview-panel.tsx";
import { ProposalWorkspaceRegisterTable } from "./proposal-workspace-register-table.tsx";
import {
  proposalIngressFilterOptions,
  proposalSelectedPanelMetadata,
} from "../shared/proposal-display-model.ts";
import { useProposalControlController } from "./use-proposal-control-controller.ts";

export function ProposalControlSurface({
  entryIntent = null,
  onOpenRepositorySurface,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onOpenRepositorySurface?: (proposalId: string) => void;
}) {
  const controller = useProposalControlController({ entryIntent });
  const selectedProposal = controller.selectedProposal;
  const selectedProposalHubProjection =
    controller.selectedProposalHubProjection;
  const selectedProposalMove = selectedProposalHubProjection?.currentMove;

  return (
    <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-proposal-control-surface="true"
        mode="overview-register-selected"
        overview={
          <ProposalControlOverviewPanel
            canCapture={controller.capture.available}
            onCaptureProposal={controller.capture.openModal}
            summary={controller.summary}
            workspaceStatus={controller.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-proposal-register": "standard",
            }}
            density="compact-control"
            description="Read-model and console-captured proposal records before triage, disposition, or handoff."
            filterBar={
              <TerasFilterBar
                data-proposal-filter-bar="true"
                filters={[
                  {
                    label: "Filter proposal status",
                    onValueChange: controller.filters.onStatusChange,
                    options: controller.filters.statusOptions,
                    value: controller.filters.status,
                  },
                  {
                    label: "Filter proposal ingress",
                    onValueChange: controller.filters.onIngressChange,
                    options: proposalIngressFilterOptions,
                    value: controller.filters.ingress,
                  },
                ]}
                search={{
                  ariaLabel: "Search proposals",
                  onValueChange: controller.filters.onSearchChange,
                  placeholder: "Search proposal, route, repo gate, owner...",
                  value: controller.filters.search,
                }}
              />
            }
            kicker="Proposal Register"
            statusLabel={`${controller.proposals.filtered.length}/${controller.proposals.all.length} shown`}
            statusTone="info"
            title="Proposal register"
          >
            {controller.proposals.filtered.length > 0 ? (
              <ProposalWorkspaceRegisterTable
                onInspectProposal={controller.register.inspect}
                onSelectProposal={controller.register.select}
                proposals={controller.proposals.filtered}
                selectedProposalId={selectedProposal?.id ?? ""}
              />
            ) : (
              <TerasEmptyState fill>
                No proposal records match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={selectedProposal && selectedProposalHubProjection && selectedProposalMove ? (
          <TerasSelectedPanel
            action={{
              description: selectedProposalMove.description,
              kicker: "Required Action",
              node: (
                <TerasActionButton
                  data-proposal-open-hub-action="true"
                  onClick={controller.hub.openSelected}
                  emphasis="primary"
                >
                  Open Proposal Hub
                </TerasActionButton>
              ),
              title: selectedProposalMove.title,
            }}
            description={selectedProposal.bodyPreview}
            kicker="Selected Proposal"
            meta={proposalSelectedPanelMetadata(selectedProposal)}
            selected
            status={{
              label: selectedProposalHubProjection.status.pillLabel,
              tone: selectedProposalHubProjection.status.tone,
            }}
            title={selectedProposal.title}
            tone={selectedProposalHubProjection.status.tone}
            variant="compact"
          />
        ) : (
          <TerasEmptyState fill>
            No canonical proposal record is available. Check Workspace Status for source health.
          </TerasEmptyState>
        )}
        selectedProps={{
          "data-proposal-selected-launcher": "true",
        }}
      />
      <ProposalHubModal
        decisionDraft={controller.hub.decisionDraft}
        onApplyDispositionDraft={controller.hub.onApplyDispositionDraft}
        onApplyHandoffDraft={controller.hub.onApplyHandoffDraft}
        onApplyTriageDraft={controller.hub.onApplyTriageDraft}
        onClose={controller.hub.close}
        onChangeDecisionDraft={controller.hub.onChangeDecisionDraft}
        onChangeHandoffDraft={controller.hub.onChangeHandoffDraft}
        onChangeRouteSelectionDraft={controller.hub.onChangeRouteSelectionDraft}
        onChangeTriageDraft={controller.hub.onChangeTriageDraft}
        onInspectProposal={controller.details.inspect}
        onOpenRepositorySurface={onOpenRepositorySurface}
        proposal={controller.hub.proposal}
        repositoryGateResolution={controller.hub.repositoryGateResolution}
        handoffDraft={controller.hub.handoffDraft}
        routeSelectionDraft={controller.hub.routeSelectionDraft}
        triageDraft={controller.hub.triageDraft}
        workflowReceipts={controller.hub.workflowReceipts}
      />
      <ProposalDetailModal
        onClose={controller.details.close}
        proposal={controller.details.proposal}
      />
      <ProposalCaptureModal
        canSubmit={controller.capture.canSubmit}
        context={controller.capture.context}
        onClose={controller.capture.close}
        onContextChange={controller.capture.onContextChange}
        onSubmit={controller.capture.submit}
        onTitleChange={controller.capture.onTitleChange}
        open={controller.capture.open}
        title={controller.capture.title}
      />
    </>
  );
}
