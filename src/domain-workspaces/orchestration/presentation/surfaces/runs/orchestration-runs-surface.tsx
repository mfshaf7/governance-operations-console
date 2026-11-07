"use client";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
  TerasLoadingState,
  TerasSelectedPanel,
  TerasPanelStack,
  TerasTechnicalDetails,
} from "@/teras";

import {
  orchestrationRunPosture,
  orchestrationRunRequiredMove,
} from "../../../read-model/runs/orchestration-run-selectors.ts";
import type { OrchestrationRunRecord } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import { RunDashboardModal } from "./dashboard/run-dashboard-modal.tsx";
import { orchestrationRunSelectedFacts, orchestrationRunTitle, orchestrationRunTechnicalFacts, orchestrationRunSourceLabel } from "./orchestration-runs-view-model.ts";
import { OrchestrationRunsRegister } from "./register/orchestration-runs-register.tsx";
import { useOrchestrationRunsController } from "./use-orchestration-runs-controller.ts";
import type { OrchestrationRunControlInput, OrchestrationRunControlReceipt } from "../../../work-model/run-control/run-control-types.ts";

export function OrchestrationRunsSurface({
  focusRecordId = null,
  live = false,
  onControl,
  records,
}: {
  focusRecordId?: string | null;
  live?:boolean;
  onControl: (runId: string, input: OrchestrationRunControlInput) => Promise<OrchestrationRunControlReceipt>;
  records: OrchestrationRunRecord[];
}) {
  const controller = useOrchestrationRunsController(records, focusRecordId, live);
  const selectedRecord = controller.selectedRecord;


  const selectedPosture = selectedRecord
    ? orchestrationRunPosture(selectedRecord)
    : null;

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-orchestration-runs-surface="true"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            footer={live?<TerasRegisterPagination label="Orchestration runs" offset={controller.page.offset} count={controller.records.filtered.length} page={controller.page.pageNumber}
              pending={controller.page.loading} unavailable={Boolean(controller.page.error)} hasPrevious={controller.page.hasPrevious} hasNext={Boolean(controller.page.nextCursor)} onReset={controller.page.error&&controller.page.hasPrevious?controller.page.first:undefined} onPrevious={controller.page.previous} onNext={controller.page.next} nextLabel={controller.records.filtered.length?"Next page":"Continue search"}/>:undefined}
            bodyProps={{
              "data-orchestration-run-register": "standard",
            }}
            description={controller.page.originalError??"Search covers retained runs through bounded owner pages. This register does not start runs."}
            filterBar={
              <TerasFilterBar
                filters={[
                  {
                    label: "Filter run state",
                    onValueChange: controller.filters.onStateChange,
                    options: controller.filters.stateOptions,
                    value: controller.filters.state,
                  },
                  {
                    label: "Filter definition",
                    onValueChange: controller.filters.onDefinitionChange,
                    options: controller.filters.definitionOptions,
                    value: controller.filters.definitionId,
                  },
                  {
                    label: "Filter source domain",
                    onValueChange: controller.filters.onSourceDomainChange,
                    options: controller.filters.sourceDomainOptions,
                    value: controller.filters.sourceDomain,
                  },
                ]}
                search={{
                  ariaLabel: "Search orchestration runs",
                  onValueChange: controller.filters.onQueryChange,
                  placeholder: "Search run, request, definition, source...",
                  value: controller.filters.query,
                }}
              />
            }
            kicker="Run Register"
            statusLabel={`${controller.records.filtered.length}/${controller.records.all.length} shown`}
            statusTone="info"
            title="Orchestration runs"
          >
            {live&&controller.page.loading ? <TerasLoadingState fill label="Loading matching runs…" /> : live&&controller.page.error ? <TerasEmptyState fill><p role="alert">{controller.page.error}</p><TerasActionButton emphasis="secondary" onClick={()=>void controller.page.refresh()}>Retry run search</TerasActionButton></TerasEmptyState> : controller.records.filtered.length > 0 ? (
              <OrchestrationRunsRegister
                onOpenRun={controller.dashboard.open}
                onSelectRun={controller.selectRecord}
                records={controller.records.filtered}
                selectedRunId={selectedRecord?.id ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                {live&&controller.page.nextCursor?"No matches in this search window. Continue search to check older runs.":"No run records match the current search and filters."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          selectedRecord && selectedPosture ? (
            <TerasPanelStack fill="last" scroll><TerasSelectedPanel
              action={{
                description: selectedPosture.detail,
                kicker: "Current Required Move",
                node: (
                  <TerasActionButton
                    onClick={() => controller.dashboard.open(selectedRecord)}
                    emphasis="primary"
                  >
                    Open Run Dashboard
                  </TerasActionButton>
                ),
                title: orchestrationRunRequiredMove(selectedRecord),
              }}
              description={`${orchestrationRunSourceLabel(selectedRecord)} · ${selectedPosture.detail}`}
              facts={orchestrationRunSelectedFacts(selectedRecord)}
              kicker="Selected Run"
              selected
              status={{
                label: selectedPosture.label,
                tone: selectedPosture.tone,
              }}
              title={orchestrationRunTitle(selectedRecord)}
              tone={selectedPosture.tone}
              variant="rich"
            /><TerasTechnicalDetails items={orchestrationRunTechnicalFacts(selectedRecord)} /></TerasPanelStack>
          ) : (
            <TerasEmptyState fill>
              No run is selected from the current results.
            </TerasEmptyState>
          )
        }
        selectedProps={{
          "data-orchestration-selected-run": "true",
        }}
      />
      <RunDashboardModal
        onControl={async(runId,input)=>{const receipt=await onControl(runId,input);if(live)await controller.page.refresh();return receipt;}}
        onClose={controller.dashboard.close}
        record={controller.dashboard.record}
      />
    </>
  );
}
