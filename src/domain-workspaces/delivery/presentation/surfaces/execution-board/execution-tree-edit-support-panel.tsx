"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useDraftAdvisor, advisorWorkContext } from "@/agent-console";

import type { DeliveryPackageSummary } from "../../../read-model/index.ts";
import { inheritedExecutionTreePI, type ExecutionCreationPlanningChoices } from "../../../work-model/execution/execution-tree-change-plan.ts";

import {
  TerasAdvisorPanel,
  TerasInspectionSection,
  TerasPanel,
  TerasPanelHeader,
  TerasRecordMetaText,
  TerasPanelStack,
  TerasActionButton,
  TerasLoadingState,
  TerasSelectField,
  TerasContentTray,
} from "@/teras";
import type { ExecutionTreeDraftNode } from "./execution-board-view-model.ts";
import { executionAdvisorUpstreamContext } from "./execution-advisor-context.ts";
import { ExecutionTreeDependencyEditor } from "./execution-tree-dependency-editor.tsx";

type AdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function ExecutionTreeEditSupportPanel({
  sourceTree,
  draftTree,
  packageSummary,
  selectedNode,
  planningChoices,
  planningLoading,
  onRetryPlanning,
  onUpdatePlanningInputs,
  onUpdateText,
  onUpdateDependencies,
  disabled = false,
}: {
  sourceTree: ExecutionTreeDraftNode | null;
  draftTree?: ExecutionTreeDraftNode;
  packageSummary: DeliveryPackageSummary;
  selectedNode: ExecutionTreeDraftNode;
  planningChoices?: ExecutionCreationPlanningChoices;
  planningLoading: boolean;
  onRetryPlanning: () => void;
  onUpdatePlanningInputs?: (values: { targetPi?: string; iteration?: string }) => void;
  onUpdateText?: (values: { title?: string; draftBody?: string; remark?: string }) => void;
  onUpdateDependencies?: (ids:string[])=>void;
  disabled?: boolean;
}) {
  const [advisorPrompt, setAdvisorPrompt] = useState("");
  const [advisorTurns, setAdvisorTurns] = useState<AdvisorLine[]>([]);
  const advisor = useDraftAdvisor({
    conversation: { role: "execution-tree", ref: packageSummary.delivery_package_id, sourceRef: packageSummary.source_ref },
    disabled: disabled || !onUpdateText,
    getScope: () => ({ role: "execution-tree", ref: `${packageSummary.delivery_package_id}:${selectedNode.id}`,
      sourceRef: packageSummary.source_ref, sourceRevision: "local-execution-tree-draft",
      context: advisorWorkContext({ package: packageSummary.display_name, packageSummary: packageSummary.summary,
        sourceRef: packageSummary.source_ref, selectedNode: { id: selectedNode.id, kind: selectedNode.kind,
          title: selectedNode.title, draftBody: selectedNode.draftBody, remark: selectedNode.remark,
          backendStatus: selectedNode.backendStatus, legacyWorkPackageId: selectedNode.legacyWorkPackageId },
        sourceNarratives: executionAdvisorUpstreamContext(sourceTree, selectedNode.id),
        contextOrigin: "Original work-tree source snapshot captured for this edit, separate from the selected local draft. Includes applied scope/architectural narrative when recorded; separate diagrams and linked proof are not loaded.",
        boundary: "Local selected node narrative only; no backend status or workflow action." },
        { provided: ["Selected execution node and its current narrative", "Package scope summary and source identity", "Available original selected-node and ancestor narratives, separate from current local edits"],
          unavailable: ["Unprovided implementation files, tests and runtime results", "Other work-item contents not supplied here"] }),
      fields: ["title", "draftBody", "remark"].map((key) => ({ key, label: key, value: selectedNode[key as "title" | "draftBody" | "remark"] ?? "" })),
    }),
    apply: (edits) => { onUpdateText?.(Object.fromEntries(edits.map((edit) => [edit.field, edit.value]))); return edits; },
  });
  const parentPi = draftTree ? inheritedExecutionTreePI(draftTree, selectedNode.id) : "";
  const selectedPi = selectedNode.targetPi || parentPi;
  const iterations = planningChoices?.get(selectedPi) ?? [];
  const advisorTranscript: AdvisorLine[] = [
    {
      id: `execution-tree-advisor-opening-${selectedNode.id}`,
      role: "advisor",
      text: "Ask for help with the selected item’s title, description, or remark. Changes stay in the draft until you review and apply them.",
    },
    ...advisorTurns,
  ];

  async function submitAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const turnId = Date.now();
    setAdvisorPrompt("");
    let reply: string;
    try { reply = (await advisor.run(prompt)).message; }
    catch (error) { reply = error instanceof Error ? error.message : "Governed advisor unavailable."; }

    setAdvisorTurns((current) => [
      ...current,
      {
        id: `execution-tree-operator-${turnId}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `execution-tree-advisor-${turnId}`,
        role: "advisor",
        text: reply,
      },
    ]);
    setAdvisorPrompt("");
  }

  return (
    <TerasPanelStack fill="last" minimumFillHeight="medium" scroll>
      <TerasPanel
        frame="padded"
        treatment="rail"
        fit="content"
        spacing="compact"
        tone="warn"
      >
        <TerasPanelHeader kicker="Work Tree" title="Editing tools" />

        {selectedNode.kind === "Epic" && selectedPi ? <TerasInspectionSection title="Feature Changes">
          <TerasRecordMetaText>Adding a Feature to a committed PI requires a reviewed initiative plan.</TerasRecordMetaText>
        </TerasInspectionSection> : null}
        {selectedNode.legacyWorkPackageId === null && onUpdatePlanningInputs ? (
          <TerasInspectionSection title="New Item Planning">
            {selectedNode.kind === "Feature" ? (
              <TerasContentTray title="Backlog Feature creation">
                {selectedPi ? "Adding a Feature to a committed PI requires a reviewed initiative plan." :
                  "Add the Feature to the backlog. Set its delivery target in PI Planning."}
              </TerasContentTray>
            ) : !planningChoices ? (
              planningLoading ? <TerasLoadingState label="Reading PI calendars…" /> :
                <TerasContentTray title="PI calendars unavailable"
                  actions={<TerasActionButton emphasis="secondary" onClick={onRetryPlanning}>Retry</TerasActionButton>}>
                  Saved calendars are required to select an iteration.
                </TerasContentTray>
            ) : (
              <>
                <TerasSelectField
                  label="Target PI" ariaLabel="New item Target PI"
                  disabled={disabled}
                  value={selectedNode.targetPi ?? ""}
                  options={[
                    { label: parentPi ? `Use parent PI · ${parentPi}` : "Choose a PI", value: "" },
                    ...[...planningChoices.keys()].map(pi => ({ label: pi, value: pi })),
                  ]}
                  onValueChange={targetPi => onUpdatePlanningInputs({ targetPi, iteration: "" })}
                />
                <TerasSelectField
                  label="Iteration" ariaLabel="New item Iteration"
                  disabled={disabled || !iterations.length}
                  value={selectedNode.iteration ?? ""}
                  options={[{ label: "Choose an iteration", value: "" }, ...iterations]}
                  helper={selectedPi && !iterations.length ? "Set up this PI’s calendar in PI Planning." : undefined}
                  onValueChange={iteration => onUpdatePlanningInputs({ iteration })}
                />
              </>
            )}
          </TerasInspectionSection>
        ) : null}
        {draftTree&&onUpdateDependencies?<ExecutionTreeDependencyEditor key={selectedNode.id} tree={draftTree} node={selectedNode} disabled={disabled} onChange={onUpdateDependencies}/>:null}
      </TerasPanel>

      <TerasAdvisorPanel
        draftControls={advisor.panelControls}
        density="compact"
        fill
        profileLabel="Execution Tree Advisor"
        prompt={{
          ariaLabel: "Execution tree advisor prompt",
          onChange: setAdvisorPrompt,
          onSubmit: submitAdvisorPrompt,
          placeholder: "Ask about the selected item…",
          rows: 2,
          value: advisorPrompt,
        }}
        statusLabel="draft assistance"
        statusTitle="Explicit requests can edit the selected local node text. Review and Apply remain operator actions."
        statusTone="info"
        transcript={advisorTranscript}
      />
    </TerasPanelStack>
  );
}
