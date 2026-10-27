"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useDraftAdvisor } from "@/agent-console";
import { effectiveModelLabel } from "@/console-integration/governed-ai/model-selection";

import { TerasAdvisorPanel } from "@/teras";

import type {
  RefinementMetadataTarget,
  RefinementSharedMetadataTargetGroup,
} from "../../view-model/refinement-metadata-model.ts";
import type { DeliveryRefinementModalStep } from "../../model/refinement-model.ts";
import type {
  RefinementAssistCommand,
  RefinementLiveMode,
  RefinementOosAssistResult,
} from "../../../../../live-runtime/refinement-live-types.ts";

type RefinementAdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function RefinementMetadataAdvisor({
  sourceRef, sourceRevision, metadataDraftValues,
  activeStep,
  advisorTranscript,
  collapsed,
  deliveryPackageName,
  draftValue,
  markMetadataFieldResolution,
  markMetadataFieldResolutions,
  onToggleCollapsed,
  requestMetadataAdvice,
  runtimeMode,
  runtimeStatus,
  selectedSharedMetadataGroup,
  selectedTarget,
  updateMetadataDraftValue,
  updateMetadataDraftValues,
}: {
  sourceRef: string;
  sourceRevision: string;
  metadataDraftValues: Record<string, string>;
  activeStep: DeliveryRefinementModalStep;
  advisorTranscript: RefinementAdvisorLine[];
  collapsed: boolean;
  deliveryPackageName: string;
  draftValue: string;
  markMetadataFieldResolution: (
    fieldKey: string,
    resolution: "accepted" | "ai_drafted" | "repaired",
  ) => void;
  markMetadataFieldResolutions: (
    fieldKeys: string[],
    resolution: "accepted" | "ai_drafted" | "repaired",
  ) => void;
  onToggleCollapsed: () => void;
  requestMetadataAdvice: (
    command: RefinementAssistCommand,
  ) => Promise<{
    mode: RefinementLiveMode;
    result: RefinementOosAssistResult | null;
  }>;
  runtimeMode: RefinementLiveMode;
  runtimeStatus: "current" | "offline";
  selectedSharedMetadataGroup: RefinementSharedMetadataTargetGroup | undefined;
  selectedTarget: RefinementMetadataTarget | undefined;
  updateMetadataDraftValue: (fieldKey: string, value: string) => void;
  updateMetadataDraftValues: (fieldKeys: string[], value: string) => void;
}) {
  const [advisorPrompt, setAdvisorPrompt] = useState("");
  const [advisorExchange, setAdvisorExchange] = useState<
    RefinementAdvisorLine[]
  >([]);
  const advisorLines = [...advisorTranscript, ...advisorExchange];
  const targets = selectedSharedMetadataGroup?.targets ?? (selectedTarget ? [selectedTarget] : []);
  const advisor = useDraftAdvisor({
    disabled: activeStep !== "metadata_draft" || runtimeStatus !== "current" || runtimeMode !== "live",
    getScope: () => ({ role: "refinement-metadata", ref: `${sourceRef}:${targets.map((target) => target.key).join(",")}`,
      sourceRef, sourceRevision,
      context: JSON.stringify({ package: deliveryPackageName, targets: targets.map((target) => ({ key: target.key, sourceValue: target.sourceValue, field: target.field })) }),
      fields: targets.map((target) => ({ key: target.key, label: target.field.label,
        value: metadataDraftValues[target.key] ?? target.sourceValue, allowedValues: target.field.allowed_values ?? [] })),
    }),
    apply: (edits) => { for (const edit of edits) { updateMetadataDraftValue(edit.field, String(edit.value)); markMetadataFieldResolution(edit.field, "ai_drafted"); } return edits; },
    restore: (edits) => { for (const edit of edits) updateMetadataDraftValue(edit.field, String(edit.value)); },
    transport: async (scope, prompt) => {
      const target = targets[0];
      if (!target) throw Error("Select a metadata field first.");
      const live = await requestMetadataAdvice({ allowedValues: target.field.allowed_values ?? [],
        draftValue: String(scope.fields[0].value), fieldKey: target.field.field_key ?? target.field.backend_field,
        fieldKind: target.field.field_kind, fieldLabel: target.field.label, operatorPrompt: prompt,
        required: target.field.required, selectedNodeIds: targets.map((item) => item.node.id), sourceValue: target.sourceValue });
      if (!live.result) throw Error("A live governed advisor is required. Manual drafting remains available.");
      const result = live.result;
      const edits = result.required_operator_action === "review" && result.suggestion.value !== null
        ? scope.fields.map((field) => ({ field: field.key, value: result.suggestion.value })) : [];
      return { intent: edits.length ? "draft" : "answer", message: `${result.suggestion.summary}\n${result.suggestion.rationale}`,
        edits, evidence: { profileId: result.evidence.model_profile_id, auditRef: result.evidence.gateway_audit_ref,
          contextRef: result.evidence.cgg_packet_ref,
          ...(result.evidence.effective_selection ? { effectiveModel: effectiveModelLabel(result.evidence.effective_selection) } : {}) } };
    },
  });

  async function submitAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const timestamp = Date.now();
    const activeTarget =
      selectedSharedMetadataGroup?.targets[0] ?? selectedTarget;
    if (!activeTarget) return;

    setAdvisorExchange((current) => [
      ...current,
      {
        id: `refinement-operator-${timestamp}`,
        role: "operator",
        text: prompt,
      },
    ]);
    setAdvisorPrompt("");

    try {
      const reply = await advisor.run(prompt);

      setAdvisorExchange((current) => [
        ...current,
        {
          id: `refinement-advisor-${timestamp}`,
          role: "advisor",
          text: reply.message,
        },
      ]);
    } catch (error) {
      setAdvisorExchange((current) => [
        ...current,
        {
          id: `refinement-advisor-error-${timestamp}`,
          role: "advisor",
          text:
            error instanceof Error
              ? error.message
              : "Governed Refinement advice is unavailable.",
        },
      ]);
    }
  }

  return (
    <TerasAdvisorPanel
      draftControls={advisor.panelControls}
      collapsed={activeStep === "metadata_draft" ? collapsed : false}
      density={activeStep === "metadata_draft" ? "compact" : "standard"}
      fill={activeStep === "metadata_draft"}
      onToggleCollapsed={
        activeStep === "metadata_draft" ? onToggleCollapsed : undefined
      }
      profileLabel="Refinement Advisor"
      prompt={
        activeStep === "metadata_draft"
          ? {
              ariaLabel: "Refinement metadata advisor prompt",
              onChange: setAdvisorPrompt,
              onSubmit: submitAdvisorPrompt,
              placeholder: selectedSharedMetadataGroup
                ? `Ask about shared ${selectedSharedMetadataGroup.field.label}...`
                : selectedTarget
                  ? `Ask about ${selectedTarget.field.label}...`
                  : "Ask about the selected metadata field...",
              rows: 1,
              value: advisorPrompt,
            }
          : undefined
      }
      statusLabel={
        runtimeMode === "disconnected-preview"
          ? "preview"
          : runtimeStatus === "current"
            ? "governed"
            : "offline"
      }
      statusTitle={
        runtimeMode === "disconnected-preview"
          ? "Disconnected preview supports manual drafting. A live governed model is required for advice."
          : runtimeStatus === "current"
            ? "Advice is admitted and routed through the OOS Refinement contract."
            : "Canonical Refinement advice is unavailable and does not fall back locally."
      }
      statusTone={runtimeStatus === "offline" ? "danger" : "warn"}
      transcript={advisorLines}
    />
  );
}
