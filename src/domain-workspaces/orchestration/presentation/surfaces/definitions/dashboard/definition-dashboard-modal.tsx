"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasList,
  TerasContentFrame,
  TerasEmptyState,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSelectedPanel,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import { orchestrationDefinitionPosture } from "../../../../read-model/definitions/orchestration-definition-selectors.ts";
import type {
  OrchestrationAdmissionCheck,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import { DefinitionContractDialog } from "../dialogs/definition-contract-dialog.tsx";
import { DefinitionVersionHistoryDialog } from "../dialogs/definition-version-history-dialog.tsx";
import {
  orchestrationAdmissionAreaLabel,
  orchestrationAdmissionStateLabel,
  orchestrationDefinitionAction,
  orchestrationDefinitionDashboardFacts,
  orchestrationDefinitionInspectorRows,
  orchestrationDefinitionNodeTone,
  orchestrationDefinitionNodeTypeLabel,
  type OrchestrationDefinitionInspectorId,
} from "../orchestration-definitions-view-model.ts";
import {
  orchestrationDefinitionInspectorPosture,
  orchestrationDefinitionNodeDetail,
} from "./definition-dashboard-view-model.ts";

type DefinitionContractInspector = Exclude<
  OrchestrationDefinitionInspectorId,
  "version-history"
>;

export function DefinitionDashboardModal({
  onDesignDefinition,
  onClose,
  record,
}: {
  onDesignDefinition: (record: OrchestrationDefinitionRecord) => void;
  onClose: () => void;
  record: OrchestrationDefinitionRecord | null;
}) {
  const [activeNode, setActiveNode] =
    useState<OrchestrationDefinitionNode | null>(null);
  const [activeAdmissionCheck, setActiveAdmissionCheck] =
    useState<OrchestrationAdmissionCheck | null>(null);
  const [activeInspector, setActiveInspector] =
    useState<DefinitionContractInspector | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  if (!record) {
    return null;
  }

  const posture = orchestrationDefinitionPosture(record);
  const definitionAction = orchestrationDefinitionAction(record);

  function closeDashboard() {
    setActiveNode(null);
    setActiveAdmissionCheck(null);
    setActiveInspector(null);
    setVersionHistoryOpen(false);
    onClose();
  }

  function closeContractDialog() {
    setActiveNode(null);
    setActiveAdmissionCheck(null);
    setActiveInspector(null);
  }

  function openInspector(inspectorId: OrchestrationDefinitionInspectorId) {
    if (inspectorId === "version-history") {
      setVersionHistoryOpen(true);
      return;
    }

    setActiveInspector(inspectorId);
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        description="Definition contract, execution plan, admission posture, focused evidence, and immutable version history."
        kicker="Orchestration"
        onClose={closeDashboard}
        height="fill"
        surfaceId="orchestration-definition-dashboard"
        title="Definition Dashboard"
        width="large"
      >
        <TerasContentFrame fill variant="standard">
          <TerasZoneLayout variant="main-support">
            <TerasZone fit="fill">
              <TerasPanelStack fill="last">
                <TerasSelectedPanel
                  description={record.purpose}
                  facts={orchestrationDefinitionDashboardFacts(record)}
                  kicker="Selected Definition"
                  selected
                  status={{
                    label: posture.label,
                    tone: posture.tone,
                  }}
                  title={record.title}
                  tone={posture.tone}
                  variant="rich"
                />

                <TerasPanel
                  frame="padded"
                  treatment="neutral"
                  fit="fill"
                  overflow="hidden"
                >
                  <TerasPanelHeader
                    description="Select a node to inspect its bounded owner, dependencies, controls, and evidence references."
                    kicker="Execution Plan"
                    statusLabel={`${record.executionNodes.length} nodes`}
                    statusTone="info"
                    title="Definition nodes"
                  />
                  {record.executionNodes.length > 0 ? (
                    <TerasList fit="fill">
                      {record.executionNodes.map((node, index) => (
                        <TerasStatusItem
                          ariaLabel={`Inspect ${node.label}`}
                          tone={orchestrationDefinitionNodeTone(node)}
                          detail={orchestrationDefinitionNodeDetail(node)}
                          index={String(index + 1).padStart(2, "0")}
                          key={node.id}
                          label={node.label}
                          onSelect={() => setActiveNode(node)}
                          status={orchestrationDefinitionNodeTypeLabel(
                            node.type,
                          )}
                          treatment="rail"
                        />
                      ))}
                    </TerasList>
                  ) : (
                    <TerasEmptyState fill>
                      This qualification has no durable execution plan.
                    </TerasEmptyState>
                  )}
                </TerasPanel>
              </TerasPanelStack>
            </TerasZone>

            <TerasZone fit="content">
              <TerasPanel
                frame="padded"
                treatment="rail"
                fit="content"
                tone={definitionAction.tone}
              >
                <TerasPanelHeader
                  description={definitionAction.description}
                  kicker="Definition Action"
                  statusLabel={definitionAction.statusLabel}
                  statusTone={definitionAction.tone}
                  title={definitionAction.title}
                />
                {definitionAction.actionLabel ? (
                  <TerasActionRow spacing="tight">
                    <TerasActionButton
                      disabled={definitionAction.disabled}
                      emphasis="primary"
                      onClick={() => onDesignDefinition(record)}
                      tone={
                        definitionAction.tone === "danger" ? "danger" : "accent"
                      }
                    >
                      {definitionAction.actionLabel}
                    </TerasActionButton>
                  </TerasActionRow>
                ) : null}
              </TerasPanel>

              <TerasPanel frame="padded" treatment="neutral" fit="content">
                <TerasPanelHeader
                  description="Implementation, validation, platform, security, and runtime admission remain separate checks."
                  kicker="Admission Posture"
                  statusLabel={`${record.admissionChecks.length} checks`}
                  statusTone="info"
                  title="Definition admission"
                />
                <TerasList>
                  {record.admissionChecks.map((check) => (
                    <TerasStatusItem
                      ariaLabel={`Inspect ${orchestrationAdmissionAreaLabel(check.area)} admission`}
                      tone={check.tone}
                      detail={check.owner}
                      key={check.area}
                      label={orchestrationAdmissionAreaLabel(check.area)}
                      onSelect={() => setActiveAdmissionCheck(check)}
                      status={orchestrationAdmissionStateLabel(check.state)}
                      treatment="rail"
                    />
                  ))}
                </TerasList>
              </TerasPanel>

              <TerasPanel frame="padded" treatment="neutral" fit="content">
                <TerasPanelHeader
                  description="Open one focused contract area without expanding technical detail across the dashboard."
                  kicker="Inspectors"
                  title="Definition evidence"
                />
                <TerasList>
                  {orchestrationDefinitionInspectorRows.map((inspector) => {
                    const inspectorPosture =
                      orchestrationDefinitionInspectorPosture(
                        record,
                        inspector.id,
                      );

                    return (
                      <TerasStatusItem
                        ariaLabel={`Open ${inspector.label}`}
                        detail={inspector.detail}
                        key={inspector.id}
                        label={inspector.label}
                        onSelect={() => openInspector(inspector.id)}
                        status={inspectorPosture.label}
                        tone={inspectorPosture.tone}
                      />
                    );
                  })}
                </TerasList>
              </TerasPanel>
            </TerasZone>
          </TerasZoneLayout>
        </TerasContentFrame>
      </TerasModalShell>

      <DefinitionContractDialog
        admissionCheck={activeAdmissionCheck}
        inspector={activeInspector}
        node={activeNode}
        onClose={closeContractDialog}
        record={record}
      />
      <DefinitionVersionHistoryDialog
        onClose={() => setVersionHistoryOpen(false)}
        open={versionHistoryOpen}
        record={record}
      />
    </>
  );
}
