"use client";

import {
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasEmptyState,
  TerasLoadingState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRecordMetaText,
  TerasRegisterPanel,
  TerasRegisterPagination,
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
  proposalOverviewContext,
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

  const sourceFailure = controller.source.pageError ?? controller.source.error;
  const sourceErrorContent = sourceFailure ? <TerasContentTray kicker={controller.source.pageError ? "Page unavailable" : "Unable to load proposals"} description={sourceFailure}
    actions={<TerasActionButton emphasis="secondary" onClick={controller.source.onRefresh}>{controller.source.pageError ? "Refresh first page" : "Retry"}</TerasActionButton>} /> : null;

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
            previewMode={controller.capture.previewMode}
            summary={controller.summary}
        paged={Boolean(controller.source.page)}
            workspaceStatus={controller.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-proposal-register": "standard",
            }}
            density="compact-control"
            footer={controller.source.page ? <div data-proposal-pagination="true"><TerasRegisterPagination label="Proposal" offset={controller.source.pageOffset} count={controller.proposals.filtered.length} page={controller.source.pageNumber}
              pending={controller.source.pagePending} unavailable={Boolean(controller.source.pageError)} hasPrevious={controller.source.hasPrevious} hasNext={Boolean(controller.source.page.next_cursor)} onPrevious={()=>void controller.source.onPrevious()} onNext={()=>void controller.source.onNext()} nextLabel={controller.proposals.filtered.length?"Next page":"Continue search"}/></div> : undefined}
            description={controller.source.page ? `Search covers all proposals. ${controller.source.page.source_total} proposals in the backlog; this page shows ${controller.proposals.filtered.length}.` : "Review ideas, decide a direction and follow their handoff."}
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
                    label: "Filter proposal source",
                    onValueChange: controller.filters.onIngressChange,
                    options: proposalIngressFilterOptions,
                    value: controller.filters.ingress,
                  },
                ]}
                search={{
                  ariaLabel: "Search proposals",
                  onValueChange: controller.filters.onSearchChange,
                  placeholder: "Search ideas, routes or repositories…",
                  value: controller.filters.search,
                }}
              />
            }
            kicker="Proposal Register"
            statusLabel={controller.source.loading ? "Loading" : sourceFailure && !controller.proposals.filtered.length ? "Unavailable" : `${controller.proposals.filtered.length} shown`}
            statusTone="info"
            title="Proposal register"
          >

            {controller.source.result ? <TerasContentTray kicker="Proposal saved" description={controller.source.result} /> : null}
            {controller.source.loading ? <TerasLoadingState fill label="Loading proposals…" /> : controller.proposals.filtered.length > 0 ? (
              <ProposalWorkspaceRegisterTable
                onInspectProposal={controller.register.inspect}
                onSelectProposal={controller.register.select}
                proposals={controller.proposals.filtered}
                rowOffset={controller.source.pageOffset}
                selectedProposalId={selectedProposal?.id ?? ""}
              />
            ) : (
              <TerasEmptyState fill>
                {sourceErrorContent ?? "No proposal records match the current search and filters."}
              </TerasEmptyState>
            )}
            {controller.proposals.filtered.length > 0 ? sourceErrorContent : null}
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
            description={proposalOverviewContext(selectedProposal.bodyPreview)}
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
        ) : controller.source.loading ? <TerasLoadingState fill label="Preparing proposal details…" skeleton="details" /> : (
          <TerasEmptyState fill>
            No proposal is available to select. Load the register or adjust your search.
          </TerasEmptyState>
        )}
        selectedProps={{
          "data-proposal-selected-launcher": "true",
        }}
      />
      <ProposalHubModal
        previewMode={controller.hub.previewMode}
        sourceLoading={controller.hub.sourceLoading} sourceError={controller.hub.sourceError} onRetrySource={controller.hub.onRetrySource}
        sourceHistory={controller.hub.sourceHistory} historyPending={controller.hub.historyPending} historyError={controller.hub.historyError} onLoadHistory={controller.hub.onLoadHistory}
        decisionDraft={controller.hub.decisionDraft}
        onApplyDispositionDraft={controller.hub.onApplyDispositionDraft}
        onApplyHandoffDraft={controller.hub.onApplyHandoffDraft}
        onCancelTargetApplication={controller.hub.onCancelTargetApplication}
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
        targetApplication={controller.hub.targetApplication}
        targetApplicationError={controller.hub.targetApplicationError}
        targetApplicationPending={controller.hub.targetApplicationPending}
        workflowReceipts={controller.hub.workflowReceipts}
      />
      <ProposalDetailModal
        onClose={controller.details.close}
        proposal={controller.details.proposal}
      />
      <ProposalCaptureModal
        pending={controller.capture.pending}
        outcomeUnknown={controller.capture.outcomeUnknown} canRetry={controller.capture.canRetry}
        error={controller.capture.error}
        previewMode={controller.capture.previewMode}
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
