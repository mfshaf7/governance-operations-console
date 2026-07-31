"use client";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
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
        data-prototype-control-surface="empty"
        mode="register-only"
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
            onOpenPrototypeRequest={controller.overview.onOpenPrototypeRequest}
            requestSubmittedAt={controller.overview.requestSubmittedAt}
            summary={controller.overview.summary}
            workspaceStatus={controller.overview.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-prototype-register": "standard",
            }}
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
                  placeholder: "Search prototype, source, owner, issue...",
                  value: controller.filters.search,
                }}
              />
            }
            kicker="Prototype Register"
            statusLabel={`${controller.records.filtered.length}/${controller.records.all.length} shown`}
            statusTone="info"
            title="Prototype register"
          >
            {controller.records.filtered.length > 0 ? (
              <PrototypeWorkspaceRegisterTable
                onOpenRecord={(record) =>
                  controller.openDialog("dashboard", record)
                }
                onSelectRecord={controller.selectRecord}
                records={controller.records.filtered}
                selectedRecordId={selectedRecord.id}
              />
            ) : (
              <TerasEmptyState fill>
                No prototype records match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <PrototypeControlSelectedPanel
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
        }
        selectedProps={{
          "data-prototype-selected-panel": "true",
        }}
      />
      <PrototypeControlDialogStack
        activeDialog={controller.activeDialog}
        activeRecord={controller.activeRecord}
        canSubmitRequest={controller.request.canSubmit}
        previewReceipts={controller.selectedPreviewReceipts}
        receipts={controller.selectedReceipts}
        onBackToDashboard={controller.workflowActions.backToDashboard}
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
        onRecordCloseoutRetirement={
          controller.workflowActions.recordCloseoutRetirement
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
