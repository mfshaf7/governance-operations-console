"use client";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
} from "@/teras";

import {
  orchestrationRunPosture,
  orchestrationRunRequiredMove,
} from "../../../read-model/runs/orchestration-run-selectors.ts";
import type { OrchestrationRunRecord } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import { RunDashboardModal } from "./dashboard/run-dashboard-modal.tsx";
import { orchestrationRunSelectedFacts } from "./orchestration-runs-view-model.ts";
import { OrchestrationRunsRegister } from "./register/orchestration-runs-register.tsx";
import { useOrchestrationRunsController } from "./use-orchestration-runs-controller.ts";

export function OrchestrationRunsSurface({
  focusRecordId = null,
  records,
}: {
  focusRecordId?: string | null;
  records: OrchestrationRunRecord[];
}) {
  const controller = useOrchestrationRunsController(records, focusRecordId);
  const selectedRecord = controller.selectedRecord;

  if (records.length === 0) {
    return (
      <TerasEmptyState fill>
        No run records are available in the current projection.
      </TerasEmptyState>
    );
  }

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
            bodyProps={{
              "data-orchestration-run-register": "standard",
            }}
            description="Aggregate run projections from approved source-domain commands. This register does not start runs."
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
            {controller.records.filtered.length > 0 ? (
              <OrchestrationRunsRegister
                onOpenRun={controller.dashboard.open}
                onSelectRun={controller.selectRecord}
                records={controller.records.filtered}
                selectedRunId={selectedRecord?.id ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                No run records match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          selectedRecord && selectedPosture ? (
            <TerasSelectedPanel
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
              description={`Source-domain state: ${selectedRecord.businessState.label}.`}
              facts={orchestrationRunSelectedFacts(selectedRecord)}
              kicker="Selected Run"
              selected
              status={{
                label: selectedPosture.label,
                tone: selectedPosture.tone,
              }}
              title={selectedRecord.runId}
              tone={selectedPosture.tone}
              variant="rich"
            />
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
        onClose={controller.dashboard.close}
        record={controller.dashboard.record}
      />
    </>
  );
}
