"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import type { DeliveryPackageSummary } from "../../../read-model/index.ts";

import {
  TerasAdvisorPanel,
  TerasInspectionSection,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasTextField,
  TerasContentTray,
} from "@/teras";
import {
  executionTreeNodeDisplayTitle,
  executionTreeNodeKindLabel,
  type ExecutionTreeDraftNode,
} from "./execution-board-view-model.ts";

type AdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function ExecutionTreeEditSupportPanel({
  packageSummary,
  selectedNode,
  onUpdatePlanningInputs,
}: {
  packageSummary: DeliveryPackageSummary;
  selectedNode: ExecutionTreeDraftNode;
  onUpdatePlanningInputs?: (values: { targetPi?: string; iteration?: string }) => void;
}) {
  const [advisorPrompt, setAdvisorPrompt] = useState("");
  const [advisorTurns, setAdvisorTurns] = useState<AdvisorLine[]>([]);
  const selectedNodeTitle = executionTreeNodeDisplayTitle(selectedNode);
  const advisorTranscript: AdvisorLine[] = [
    {
      id: `execution-tree-advisor-opening-${selectedNode.id}`,
      role: "advisor",
      text: executionTreeAdvisorOpening({
        packageSummary,
        selectedNode,
        selectedNodeTitle,
      }),
    },
    ...advisorTurns,
  ];

  function submitAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const turnId = Date.now();

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
        text: executionTreeAdvisorReply({
          packageSummary,
          prompt,
          selectedNode,
          selectedNodeTitle,
        }),
      },
    ]);
    setAdvisorPrompt("");
  }

  return (
    <TerasPanelStack fill="last">
      <TerasPanel
        frame="padded"
        treatment="rail"
        fit="content"
        spacing="compact"
        tone="warn"
      >
        <TerasPanelHeader
          kicker="Tree Edit Support"
          statusLabel="draft"
          statusTone="warn"
          title={packageSummary.display_name}
          description="Selected node context for the active inline tree edit."
        />

        <TerasInspectionSection title="Selected Node">
          <TerasMetadataList
            items={[
              {
                label: "Node",
                value: selectedNodeTitle,
              },
              {
                label: "Type",
                value: executionTreeNodeKindLabel(selectedNode.kind),
              },
              {
                label: "Backend",
                value: selectedNode.backendStatus,
              },
              {
                label: "Metadata",
                value: selectedNode.metadataStatus.replace("_", " "),
              },
              {
                label: "Source WP",
                value:
                  selectedNode.legacyWorkPackageId === null
                    ? "local draft"
                    : `#${selectedNode.legacyWorkPackageId}`,
              },
              {
                label: "Children",
                value: String(selectedNode.children.length),
              },
            ]}
          />
        </TerasInspectionSection>
        {selectedNode.legacyWorkPackageId === null && onUpdatePlanningInputs ? (
          <TerasInspectionSection title="New Item Planning">
            {selectedNode.kind === "Feature" ? (
              <TerasContentTray title="Backlog Feature creation">
                Feature PI commitment uses coordinated initiative plan/apply.
                This generic create path does not replace that workflow.
              </TerasContentTray>
            ) : (
              <>
                <TerasTextField
                  aria-label="New item Target PI" label="New item Target PI"
                  value={selectedNode.targetPi ?? ""}
                  onValueChange={(targetPi) => onUpdatePlanningInputs({ targetPi })}
                />
                <p>Required for PI Objective, Task and Milestone. Other types may inherit the parent&apos;s PI through the native writer.</p>
                <TerasTextField
                  aria-label="New item Iteration" label="New item Iteration"
                  value={selectedNode.iteration ?? ""}
                  onValueChange={(iteration) => onUpdatePlanningInputs({ iteration })}
                />
                <p>Committed work needs &lt;Target PI&gt; / &lt;iteration&gt; or Program-wide / &lt;label&gt;, including when the PI is inherited. This does not make the item execution-ready.</p>
              </>
            )}
          </TerasInspectionSection>
        ) : null}
      </TerasPanel>

      <TerasAdvisorPanel
        density="compact"
        fill
        profileLabel="Execution Tree Advisor"
        prompt={{
          ariaLabel: "Execution tree advisor prompt",
          onChange: setAdvisorPrompt,
          onSubmit: submitAdvisorPrompt,
          placeholder: "Ask about the selected node...",
          rows: 2,
          value: advisorPrompt,
        }}
        statusLabel="mock only"
        statusTitle="Local prototype advisor. Future live support must use admitted AI tooling and OOS-owned Delivery context."
        statusTone="warn"
        transcript={advisorTranscript}
      />
    </TerasPanelStack>
  );
}

function executionTreeAdvisorOpening({
  packageSummary,
  selectedNode,
  selectedNodeTitle,
}: {
  packageSummary: DeliveryPackageSummary;
  selectedNode: ExecutionTreeDraftNode;
  selectedNodeTitle: string;
}) {
  return [
    `Editing ${selectedNodeTitle} inside ${packageSummary.source_ref}.`,
    `I can help challenge whether this should stay as ${executionTreeNodeKindLabel(selectedNode.kind)}, suggest missing child work, or tighten the draft note.`,
    "I will not change the tree automatically.",
  ].join("\n");
}

function executionTreeAdvisorReply({
  packageSummary,
  prompt,
  selectedNode,
  selectedNodeTitle,
}: {
  packageSummary: DeliveryPackageSummary;
  prompt: string;
  selectedNode: ExecutionTreeDraftNode;
  selectedNodeTitle: string;
}) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("task") || normalizedPrompt.includes("child")) {
    return [
      `For ${selectedNodeTitle}, add child work only when the outcome needs separate proof.`,
      selectedNode.kind === "Feature"
        ? "A User Story should carry the user-visible outcome; a Task should carry implementation work underneath it."
        : "If the work is implementation-only, add a Task. If it changes operator behavior, consider a User Story under the nearest Feature.",
      `Keep ${packageSummary.source_ref} source context visible before finalizing the draft.`,
    ].join("\n");
  }

  if (normalizedPrompt.includes("defect") || normalizedPrompt.includes("bug")) {
    return [
      "Use a Defect when the work is repair against expected behavior, not new scope.",
      "Capture impact and expected repair evidence in the draft note before leaving edit mode.",
    ].join("\n");
  }

  if (normalizedPrompt.includes("risk")) {
    return [
      "Use a Risk only when the uncertainty needs tracked handling or later review.",
      "If the concern is immediate blocking work, use the blocker action instead of hiding it as tree text.",
    ].join("\n");
  }

  return [
    `For ${selectedNodeTitle}, keep the title outcome-oriented and the note evidence-oriented.`,
    "If this edit adds scope, add a child node. If it only clarifies the current item, update the selected node text.",
    "Leave backend status unchanged until live OOS wiring records the accepted write.",
  ].join("\n");
}
