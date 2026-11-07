"use client";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasLoadingState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
} from "@/teras";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";

import { PrototypeControlDialogStack } from "./prototype-control-dialog-stack.tsx";
import { PrototypeControlOverviewPanel } from "./prototype-control-overview-panel.tsx";
import { PrototypeControlSelectedPanel } from "./prototype-control-selected-panel.tsx";
import { PrototypeWorkspaceRegisterTable } from "./prototype-workspace-register-table.tsx";
import { usePrototypeControlController } from "./use-prototype-control-controller.ts";
import { prototypeDialogRouteForCurrentMove } from "./use-prototype-control-state.ts";

export function PrototypeControlSurface({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
}) {
  const controller = usePrototypeControlController({ entryIntent });
  const selectedRecord = controller.selectedRecord;

  if (!selectedRecord) {
    return (
      <TerasRecordControlLayout
        composition="compact-control"
        data-prototype-control="true"
        data-prototype-control-surface="unavailable"
        mode="overview-register-selected"
        overview={
          <PrototypeControlOverviewPanel
            canRequestPrototype={controller.overview.canRequestPrototype}
            onOpenPrototypeRequest={controller.overview.onOpenPrototypeRequest}
            requestSubmittedAt={controller.overview.requestSubmittedAt}
            summary={controller.overview.summary}
            unavailable={controller.overview.unavailable}
            workspaceStatus={controller.overview.workspaceStatus}
          />
        }
        register={
          controller.sourceAvailability.loading ? <TerasLoadingState fill label="Loading prototypes…" /> : <TerasEmptyState fill>
            {controller.entryError ?? controller.sourceAvailability.error ?? (controller.sourceAvailability.unavailable ? "Canonical Prototype records are unavailable. Fixtures are not used as fallback in live mode." : "No canonical Prototype records yet. Capture and route a Proposal to Prototype.")}
            <TerasActionButton emphasis="secondary" onClick={() => void controller.sourceAvailability.refresh()}>Refresh canonical records</TerasActionButton>
          </TerasEmptyState>
        }
        selected={
          controller.sourceAvailability.loading ? <TerasLoadingState fill label="Preparing prototype details…" skeleton="details" /> : <TerasEmptyState fill>
            {controller.entryError ? "The requested record has not been resolved. No unrelated record actions are available." : "No canonical Prototype record is available to select."}
          </TerasEmptyState>
        }
      />
    );
  }

  return (
    <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-prototype-control="true"
        data-prototype-control-surface="true"
        mode="overview-register-selected"
        overview={
          <PrototypeControlOverviewPanel
            canRequestPrototype={controller.overview.canRequestPrototype}
            onOpenPrototypeRequest={controller.overview.onOpenPrototypeRequest}
            requestSubmittedAt={controller.overview.requestSubmittedAt}
            summary={controller.overview.summary}
            unavailable={controller.overview.unavailable}
            workspaceStatus={controller.overview.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-prototype-register": "standard",
            }}
            footer={controller.page?<TerasRegisterPagination label="Prototype" offset={controller.page.offset} count={controller.records.filtered.length} page={controller.page.pageNumber}
              pending={controller.sourceAvailability.loading} unavailable={Boolean(controller.sourceAvailability.error)} hasPrevious={controller.page.hasPrevious} hasNext={Boolean(controller.page.nextCursor)} onReset={controller.sourceAvailability.error&&controller.page.hasPrevious?controller.page.first:undefined} onPrevious={controller.page.previous} onNext={controller.page.next} nextLabel={controller.records.filtered.length?"Next page":"Continue search"}/>:undefined}
            density="compact-control"
            description="Prototype records before landing, baseline promotion, preview proof, movement preparation, or retirement."
            filterBar={
              <TerasFilterBar
                data-prototype-filter-bar="true"
                filters={[
                  {
                    label: "Filter prototype lifecycle",
                    onValueChange: controller.filters.onLifecycleChange,
                    options: controller.filters.lifecycleOptions,
                    value: controller.filters.lifecycle,
                  },
                  {
                    label: "Filter prototype baseline",
                    onValueChange: controller.filters.onBaselineChange,
                    options: controller.filters.baselineOptions,
                    value: controller.filters.baseline,
                  },
                ]}
                search={{
                  ariaLabel: "Search prototype records",
                  onValueChange: controller.filters.onSearchChange,
                  placeholder: "Search prototype, source, responsibility, issue...",
                  value: controller.filters.search,
                }}
              />
            }
            kicker="Prototype Register"
            statusLabel={`${controller.records.filtered.length}/${controller.records.all.length} shown`}
            statusTone="info"
            title="Prototype register"
          >
            {controller.sourceAvailability.loading ? <TerasLoadingState fill label="Loading matching prototypes…" /> : controller.sourceAvailability.error ? <TerasEmptyState fill><p role="alert">{controller.sourceAvailability.error}</p><TerasActionButton emphasis="secondary" onClick={()=>void controller.sourceAvailability.refresh()}>Retry prototype search</TerasActionButton></TerasEmptyState> : controller.records.filtered.length > 0 ? (
              <PrototypeWorkspaceRegisterTable
                onOpenRecord={(record) =>
                  controller.openDialog("dashboard", record)
                }
                onSelectRecord={controller.selectRecord}
                rowOffset={controller.page?.offset??0}
                records={controller.records.filtered}
                selectedRecordId={selectedRecord?.id??null}
              />
            ) : (
              <TerasEmptyState fill>
                {controller.page?.nextCursor?"No matches in this search window. Continue search to check remaining prototypes.":"No prototypes match the current search and filters."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={selectedRecord ? (
          <PrototypeControlSelectedPanel
            onOpenSourceAuthoring={(record) => controller.openDialog("source-authoring", record)}
            onOpenCurrentAction={(record) =>
              controller.openDialog(
                prototypeDialogRouteForCurrentMove(record),
                record,
              )
            }
            onOpenDashboard={(record) =>
              controller.openDialog("dashboard", record)
            }
            selectedRecord={selectedRecord}
          />
        ) : <TerasEmptyState fill>Select a Prototype to inspect its current source and actions.</TerasEmptyState>}
        selectedProps={{
          "data-prototype-selected-panel": "true",
        }}
      />
      <PrototypeControlDialogStack
        activeDialog={controller.activeDialog}
        activeRecord={controller.activeRecord}
        canSubmitRequest={controller.request.canSubmit}
        previewReceipts={controller.selectedPreviewReceipts}
        previewOwnerMode={controller.selectedPreviewOwnerMode}
        receipts={controller.selectedReceipts}
        closure={controller.selectedClosure}
        closureActions={controller.workflowActions.closure}
        closureOwnerEvidence={controller.selectedClosureOwnerEvidence}
        landingProjection={controller.selectedLandingProjection}
        maturityProgress={controller.selectedMaturity}
        sourceDeliveryPacket={controller.selectedSourceDeliveryPacket}
        onBackToDashboard={controller.workflowActions.backToDashboard}
        onCancelLanding={controller.workflowActions.cancelLanding}
        onCloseDialog={controller.closeDialog}
        onDraftChange={controller.request.onDraftChange}
        onLandPrototype={controller.workflowActions.landPrototypeRequest}
        onRunLanding={controller.workflowActions.runLandingSimulation}
        onOpenDialog={controller.openDialog}
        onPreviewCheck={controller.workflowActions.recordPreviewCheck}
        onPreviewProfileAction={
          controller.workflowActions.recordPreviewProfileAction
        }
        onPreviewRuntimeAction={
          controller.workflowActions.recordPreviewRuntimeAction
        }
        onRecordBaselinePromotion={
          controller.workflowActions.recordBaselinePromotion
        }
        onRecordCandidatePromotion={
          controller.workflowActions.recordCandidatePromotion
        }
        onRecordMovementRequest={
          controller.workflowActions.recordMovementRequest
        }
        onRequestClose={controller.request.close}
        onRequestSubmit={controller.request.onSubmit}
        requestDraft={controller.request.draft}
        requestOpen={controller.request.open}
      />
    </>
  );
}
