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
      description="Author one implementation-ready definition section while the advisor remains locked to the same context."
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
