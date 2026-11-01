"use client";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasFilterBar,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
} from "@/teras";

import {
  orchestrationDefinitionPosture,
  orchestrationDefinitionRequiredMove,
} from "../../../read-model/definitions/orchestration-definition-selectors.ts";
import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import { DefinitionDashboardModal } from "./dashboard/definition-dashboard-modal.tsx";
import { DefinitionDesignWorkflow } from "../../workflows/definition-design/definition-design-workflow.tsx";
import { orchestrationDefinitionSelectedFacts } from "./orchestration-definitions-view-model.ts";
import { OrchestrationDefinitionsRegister } from "./register/orchestration-definitions-register.tsx";
import { useOrchestrationDefinitionsController } from "./use-orchestration-definitions-controller.ts";

export function OrchestrationDefinitionsSurface({
  focusRecordId = null,
  records,
  onStartRun,
}: {
  focusRecordId?: string | null;
  records: OrchestrationDefinitionRecord[];
  onStartRun?: () => void;
}) {
  const controller = useOrchestrationDefinitionsController(
    records,
    focusRecordId,
  );
  const selectedRecord = controller.selectedRecord;

  const selectedPosture = selectedRecord
    ? orchestrationDefinitionPosture(selectedRecord)
    : null;

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-orchestration-definitions-surface="true"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-orchestration-definition-register": "standard",
            }}
            description="Workflow definitions and decisions about which operations need restart-safe execution."
            filterBar={
              <TerasFilterBar
                filters={[
                  {
                    label: "Filter definition state",
                    onValueChange: controller.filters.onRecordStateChange,
                    options: controller.filters.recordStateOptions,
                    value: controller.filters.recordState,
                  },
                  {
                    label: "Filter definition classification",
                    onValueChange: controller.filters.onClassificationChange,
                    options: controller.filters.classificationOptions,
                    value: controller.filters.classification,
                  },
                  {
                    label: "Filter source domain",
                    onValueChange: controller.filters.onSourceDomainChange,
                    options: controller.filters.sourceDomainOptions,
                    value: controller.filters.sourceDomain,
                  },
                ]}
                search={{
                  ariaLabel: "Search orchestration definitions",
                  onValueChange: controller.filters.onQueryChange,
                  placeholder: "Search definition, source, owner, repo...",
                  value: controller.filters.query,
                }}
              />
            }
            kicker="Definition Register"
            statusLabel={`${controller.records.filtered.length}/${controller.records.all.length} shown`}
            statusTone="info"
            title="Orchestration definitions"
          >
            {controller.records.filtered.length > 0 ? (
              <OrchestrationDefinitionsRegister
                onOpenDefinition={controller.dashboard.open}
                onSelectDefinition={controller.selectRecord}
                records={controller.records.filtered}
                selectedDefinitionId={selectedRecord?.id ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                {records.length ? "No definitions match these filters." : "No definitions are available. You can prepare a definition draft; approval and implementation remain separate."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
            <TerasPanelStack fill="last" scroll>
              <TerasPanel spacing="normal"
                frame="padded"
                treatment="rail"
                fit="content"
                tone="warn"
              >
                <TerasPanelHeader
                  description="Decide whether an operation needs restart-safe execution, then draft its workflow contract. This prepares a draft; it does not deploy a workflow or submit Delivery work."
                  kicker="Definition Entry"
                  statusLabel="Drafting"
                  statusTone="info"
                  title="Design a workflow"
                />
                <TerasActionRow spacing="tight">
                  <TerasActionButton
                    onClick={() => controller.design.open()}

                    emphasis="primary"
                  >
                    Design Orchestration
                  </TerasActionButton>
                </TerasActionRow>
              </TerasPanel>

              {selectedRecord && selectedPosture ? <TerasSelectedPanel
                action={{
                  description: selectedPosture.detail,
                  kicker: "Current Required Move",
                  node: (
                    <TerasActionButton
                      onClick={() => controller.dashboard.open(selectedRecord)}
                      emphasis="primary"
                    >
                      Open Definition
                    </TerasActionButton>
                  ),
                  title: orchestrationDefinitionRequiredMove(selectedRecord),
                }}
                description={selectedRecord.purpose}
                facts={orchestrationDefinitionSelectedFacts(selectedRecord)}
                kicker="Selected Definition"
                selected
                status={{
                  label: selectedPosture.label,
                  tone: selectedPosture.tone,
                }}
                title={selectedRecord.title}
                tone={selectedPosture.tone}
                variant="rich"
              /> : <TerasEmptyState>
              No definition is selected from the current results.
            </TerasEmptyState>}
            </TerasPanelStack>
        }
        selectedProps={{
          "data-orchestration-selected-definition": "true",
        }}
      />
      <DefinitionDashboardModal
        onStartRun={onStartRun ? () => { controller.dashboard.close(); onStartRun(); } : undefined}
        onDesignDefinition={controller.design.open}
        onClose={controller.dashboard.close}
        record={controller.dashboard.record}
      />
      {controller.design.session ? (
        <DefinitionDesignWorkflow
          key={controller.design.session.key}
          onClose={controller.design.close}
          record={controller.design.session.record}
        />
      ) : null}
    </>
  );
}
