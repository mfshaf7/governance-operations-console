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
}: {
  focusRecordId?: string | null;
  records: OrchestrationDefinitionRecord[];
}) {
  const controller = useOrchestrationDefinitionsController(
    records,
    focusRecordId,
  );
  const selectedRecord = controller.selectedRecord;

  if (records.length === 0) {
    return (
      <TerasEmptyState fill>
        No definition records are available in the current projection.
      </TerasEmptyState>
    );
  }

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
            description="Qualification records and immutable definition versions from contract-derived or synthetic source truth."
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
                No definition records match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          selectedRecord && selectedPosture ? (
            <TerasPanelStack fill="last">
              <TerasPanel
                frame="padded"
                treatment="rail"
                fit="content"
                tone="warn"
              >
                <TerasPanelHeader
                  description="Start with execution-boundary qualification before creating a durable definition."
                  kicker="Definition Entry"
                  statusLabel="Prototype local"
                  statusTone="info"
                  title="Qualify a backend operation"
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

              <TerasSelectedPanel
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
              />
            </TerasPanelStack>
          ) : (
            <TerasEmptyState fill>
              No definition is selected from the current results.
            </TerasEmptyState>
          )
        }
        selectedProps={{
          "data-orchestration-selected-definition": "true",
        }}
      />
      <DefinitionDashboardModal
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
