"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasList,
  TerasContentFrame,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSelectedPanel,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import {
  getOrchestrationRunScenarioOverlay,
  getOrchestrationRunControlSimulationSnapshot,
  simulateOrchestrationRunControl,
  subscribeOrchestrationRunControlSimulation,
} from "../../../../local-runtime/run-control/run-control-simulator.ts";
import {
  getOrchestrationRunControlReceiptSnapshot,
  subscribeOrchestrationRunControlReceipts,
} from "../../../../local-runtime/run-control/run-control-receipt-store.ts";
import { orchestrationRunAvailableControls } from "../../../../read-model/runs/orchestration-run-selectors.ts";
import type {
  OrchestrationRunControl,
  OrchestrationRunNode,
  OrchestrationRunRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import type { OrchestrationRunControlInput } from "../../../../work-model/run-control/run-control-types.ts";
import { RunControlDialog } from "../dialogs/run-control-dialog.tsx";
import { RunEvidenceDialog } from "../dialogs/run-evidence-dialog.tsx";
import { RunNodeDialog } from "../dialogs/run-node-dialog.tsx";
import {
  formatOrchestrationRunTimestamp,
  orchestrationRunNodeDetail,
  orchestrationRunNodeStateLabel,
  orchestrationRunNodeStateTone,
  orchestrationRunStateLabel,
  orchestrationRunStateTone,
} from "../orchestration-runs-view-model.ts";
import {
  orchestrationRunConditionProjection,
  orchestrationRunDashboardFacts,
  orchestrationRunEvidenceInspectorRows,
  orchestrationRunLocalOverlayFacts,
  type OrchestrationRunEvidenceInspectorId,
} from "./run-dashboard-view-model.ts";

export function RunDashboardModal({
  onClose,
  record,
}: {
  onClose: () => void;
  record: OrchestrationRunRecord | null;
}) {
  const [activeControl, setActiveControl] =
    useState<OrchestrationRunControl | null>(null);
  const [activeInspector, setActiveInspector] =
    useState<OrchestrationRunEvidenceInspectorId | null>(null);
  const [activeNode, setActiveNode] = useState<OrchestrationRunNode | null>(
    null,
  );
  const receiptSnapshot = useSyncExternalStore(
    subscribeOrchestrationRunControlReceipts,
    getOrchestrationRunControlReceiptSnapshot,
    getOrchestrationRunControlReceiptSnapshot,
  );
  const simulationSnapshot = useSyncExternalStore(
    subscribeOrchestrationRunControlSimulation,
    getOrchestrationRunControlSimulationSnapshot,
    getOrchestrationRunControlSimulationSnapshot,
  );

  useEffect(() => {
    if (!record) {
      setActiveControl(null);
      setActiveInspector(null);
      setActiveNode(null);
      return;
    }

    setActiveControl(null);
    setActiveInspector(null);
    setActiveNode(null);
  }, [record]);

  if (!record) {
    return null;
  }

  const activeRecord = record;
  const controlReceipts = receiptSnapshot.receipts.filter(
    (receipt) => receipt.runId === activeRecord.runId,
  );
  const overlay =
    simulationSnapshot.overlays[activeRecord.runId] ??
    getOrchestrationRunScenarioOverlay(activeRecord.runId);
  const condition = orchestrationRunConditionProjection(activeRecord);
  const availableControls = orchestrationRunAvailableControls(activeRecord);
  const inspectors = orchestrationRunEvidenceInspectorRows(
    activeRecord,
    controlReceipts,
  );

  function closeDashboard() {
    setActiveControl(null);
    setActiveInspector(null);
    setActiveNode(null);
    onClose();
  }

  function applyControl(input: OrchestrationRunControlInput) {
    const result = simulateOrchestrationRunControl({
      input,
      requestedAt: new Date().toISOString(),
      run: activeRecord,
    });

    return result.receipt;
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        description="Aggregate run state, bounded execution progress, current condition, focused evidence, structured events, and projected controls."
        kicker="Orchestration"
        onClose={closeDashboard}
        height="fill"
        surfaceId="orchestration-run-dashboard"
        title="Run Dashboard"
        width="large"
      >
        <TerasContentFrame fill variant="standard">
          <TerasZoneLayout variant="main-support">
            <TerasZone fit="fill">
              <TerasPanelStack fill="last">
                <TerasSelectedPanel
                  description={`Source-domain state: ${record.businessState.label}.`}
                  facts={orchestrationRunDashboardFacts(record)}
                  kicker="Selected Run"
                  selected
                  status={{
                    label: orchestrationRunStateLabel(record.state),
                    tone: orchestrationRunStateTone(record.state),
                  }}
                  title={record.runId}
                  tone={orchestrationRunStateTone(record.state)}
                  variant="rich"
                />

                <TerasPanel
                  frame="padded"
                  treatment="neutral"
                  fit="fill"
                  overflow="hidden"
                >
                  <TerasPanelHeader
                    description="Select a completed, current, waiting, or future node to inspect its inputs, outputs, attempts, and evidence references."
                    kicker="Execution Progress"
                    statusLabel={`${record.nodes.length} nodes`}
                    statusTone="info"
                    title="Run nodes"
                  />
                  <TerasList fit="fill">
                    {record.nodes.map((node, index) => (
                      <TerasStatusItem
                        ariaLabel={`Inspect ${node.label}`}
                        tone={orchestrationRunNodeStateTone(node.state)}
                        detail={orchestrationRunNodeDetail(node)}
                        index={String(index + 1).padStart(2, "0")}
                        key={node.id}
                        label={node.label}
                        onSelect={() => setActiveNode(node)}
                        status={orchestrationRunNodeStateLabel(node.state)}
                        treatment="rail"
                      />
                    ))}
                  </TerasList>
                </TerasPanel>
              </TerasPanelStack>
            </TerasZone>

            <TerasZone fit="fill">
              <TerasPanelStack bounded="last" fill="middle">
                <TerasPanel
                  frame="padded"
                  treatment="rail"
                  fit="content"
                  tone={condition.tone}
                >
                  <TerasPanelHeader
                    description={condition.description}
                    kicker="Current Run Condition"
                    statusLabel={condition.statusLabel}
                    statusTone={condition.tone}
                    title={condition.title}
                  />
                  <TerasMetadataList
                    items={condition.facts}
                    topOffset="normal"
                  />
                  {overlay ? (
                    <TerasContentTray
                      description="This local receipt does not rewrite the immutable source run."
                      kicker="Local Simulation"
                      title="Projected control result"
                      tone="muted"
                    >
                      <TerasMetadataList
                        items={orchestrationRunLocalOverlayFacts(
                          record,
                          overlay,
                        )}
                      />
                    </TerasContentTray>
                  ) : null}
                  {availableControls.length > 0 ? (
                    <TerasActionRow spacing="tight">
                      {availableControls.map((control) => (
                        <TerasActionButton
                          emphasis="primary"
                          key={control.id}
                          onClick={() => setActiveControl(control)}
                          tone={control.id === "cancel" ? "danger" : "accent"}
                        >
                          {control.label}
                        </TerasActionButton>
                      ))}
                    </TerasActionRow>
                  ) : null}
                </TerasPanel>

                <TerasPanel
                  frame="padded"
                  treatment="neutral"
                  fit="fill"
                  layout="header-body"
                  overflow="hidden"
                >
                  <TerasPanelHeader
                    description="Open artifacts, logs, receipts, source projection, or runtime diagnostics without mixing their meanings."
                    kicker="Evidence Inspectors"
                    title="Run evidence"
                  />
                  <TerasList fit="fill">
                    {inspectors.map((inspector) => (
                      <TerasStatusItem
                        ariaLabel={`Open ${inspector.label}`}
                        detail={inspector.detail}
                        key={inspector.id}
                        label={inspector.label}
                        onSelect={() => setActiveInspector(inspector.id)}
                        status={inspector.status}
                        tone={inspector.tone}
                      />
                    ))}
                  </TerasList>
                </TerasPanel>

                <TerasPanel
                  frame="padded"
                  treatment="neutral"
                  fit="content"
                  layout="header-body"
                >
                  <TerasPanelHeader
                    description="Material orchestration events explain state changes; they are not execution logs or completion receipts."
                    kicker="Run Events"
                    statusLabel={`${record.events.length} events`}
                    statusTone="info"
                    title="Structured event feed"
                  />
                  <TerasList fit="fill">
                    {record.events.map((event) => {
                      const eventNode = record.nodes.find(
                        (node) => node.id === event.nodeId,
                      );

                      return (
                        <TerasStatusItem
                          tone={orchestrationRunStateTone(event.state)}
                          detail={`${formatOrchestrationRunTimestamp(
                            event.occurredAt,
                          )} / ${eventNode?.label ?? "Run"}`}
                          index={String(event.sequence).padStart(2, "0")}
                          key={event.eventId}
                          label={event.summary}
                          status={orchestrationRunStateLabel(event.state)}
                        />
                      );
                    })}
                  </TerasList>
                </TerasPanel>
              </TerasPanelStack>
            </TerasZone>
          </TerasZoneLayout>
        </TerasContentFrame>
      </TerasModalShell>

      <RunNodeDialog
        node={activeNode}
        onClose={() => setActiveNode(null)}
        record={record}
      />
      <RunEvidenceDialog
        controlReceipts={controlReceipts}
        inspector={activeInspector}
        onClose={() => setActiveInspector(null)}
        record={record}
      />
      <RunControlDialog
        control={activeControl}
        key={`${record.runId}:${activeControl?.id ?? "none"}`}
        onApply={applyControl}
        onClose={() => setActiveControl(null)}
        record={record}
      />
    </>
  );
}
