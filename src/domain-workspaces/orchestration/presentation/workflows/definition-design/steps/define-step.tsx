import { TerasSelectField, TerasStatusPill, TerasWizardPanel } from "@/teras";

import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignSection,
} from "../../../../work-model/definition-design/definition-design-types.ts";
import type { DefinitionDesignDraftEditor } from "../use-definition-design-controller.ts";
import {
  definitionDesignSectionLabel,
  definitionDesignSectionOptions,
  definitionSectionFindingCount,
} from "../definition-design-view-model.ts";
import { DefinitionSectionEditor } from "../support/definition-section-editor.tsx";

type DefineSection = Exclude<
  OrchestrationDefinitionDesignSection,
  "qualification"
>;

export function DefinitionDefineStep({
  addExecutionNode,
  draft,
  editDraft,
  findings,
  removeSelectedExecutionNode,
  selectedNodeId,
  setSection,
  setSelectedNodeId,
}: {
  addExecutionNode: () => void;
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
  findings: ReturnType<
    typeof import("../../../../work-model/definition-design/definition-design-model.ts").orchestrationDefinitionDesignReadiness
  >["findings"];
  removeSelectedExecutionNode: () => void;
  selectedNodeId: string;
  setSection: (section: OrchestrationDefinitionDesignSection) => void;
  setSelectedNodeId: (nodeId: string) => void;
}) {
  const activeSection =
    draft.activeSection === "qualification"
      ? "identity-ownership"
      : draft.activeSection;
  const findingCount = definitionSectionFindingCount(findings, activeSection);

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={findingCount > 0 ? "warn" : "ok"}>
          {findingCount > 0 ? `${findingCount} required` : "Section ready"}
        </TerasStatusPill>
      }
      description={sectionGuide[activeSection]}
      kicker="Definition Work"
      title={definitionDesignSectionLabel(activeSection)}
    >
      <TerasSelectField
        label="Definition section"
        onValueChange={(section) => setSection(section)}
        options={definitionDesignSectionOptions}
        treatment="highlighted"
        value={activeSection as DefineSection}
      />
      <DefinitionSectionEditor
        activeSection={activeSection as DefineSection}
        addExecutionNode={addExecutionNode}
        draft={draft}
        editDraft={editDraft}
        removeSelectedExecutionNode={removeSelectedExecutionNode}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
      />
    </TerasWizardPanel>
  );
}

const sectionGuide: Record<DefineSection, string> = {
  "identity-ownership": "Name the workflow and its responsible workspace and execution component. Use the existing domain and repository names; these fields do not create services or repositories.",
  "trigger-result": "Describe what starts the workflow and what proves completion. Define how repeated requests are recognized and which source versions must stay fixed.",
  "execution-plan": "Break execution into named steps. Each step needs a responsible component, inputs, outputs and dependencies. Use an existing adapter name; this draft does not provision an adapter.",
  "failure-controls": "Describe retries, time limits and operator recovery. State what happens to effects already made when a run fails or is cancelled.",
  "evidence-security": "Specify required evidence, access and approval boundaries. Reference the responsible component’s rules; drafting them here does not grant permission.",
  "delivery-versioning": "Explain implementation tests, rollout and rollback. Identify the proposed work home; recording this draft does not create that work item.",
};
