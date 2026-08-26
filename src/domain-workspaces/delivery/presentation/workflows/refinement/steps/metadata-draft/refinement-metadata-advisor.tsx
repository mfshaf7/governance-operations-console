"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { TerasAdvisorPanel } from "@/teras";

import { refinementAdvisorDraft } from "../../view-model/refinement-advisor-draft.ts";
import type {
  RefinementMetadataTarget,
  RefinementSharedMetadataTargetGroup,
} from "../../view-model/refinement-metadata-model.ts";
import type { DeliveryRefinementModalStep } from "../../model/refinement-model.ts";
import type {
  RefinementAssistCommand,
  RefinementLiveMode,
} from "../../../../../live-runtime/refinement-live-types.ts";

type RefinementAdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function RefinementMetadataAdvisor({
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
    result: {
      suggestion: { rationale: string; summary: string; value: string };
    } | null;
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
      const live = await requestMetadataAdvice({
        allowedValues: activeTarget.field.allowed_values ?? [],
        draftValue,
        fieldKey:
          activeTarget.field.field_key ?? activeTarget.field.backend_field,
        fieldKind: activeTarget.field.field_kind,
        fieldLabel: activeTarget.field.label,
        operatorPrompt: prompt,
        required: activeTarget.field.required,
        selectedNodeIds: selectedSharedMetadataGroup
          ? selectedSharedMetadataGroup.targets.map((target) => target.node.id)
          : [activeTarget.node.id],
        sourceValue: activeTarget.sourceValue,
      });
      const advisorDraft = live.result
        ? {
            reply: `${live.result.suggestion.summary} ${live.result.suggestion.rationale}`.trim(),
            value: live.result.suggestion.value,
          }
        : refinementAdvisorDraft({
            deliveryPackageName,
            draftValue,
            selectedTarget: activeTarget,
            sharedTargetCount: selectedSharedMetadataGroup?.targets.length,
          });

      if (selectedSharedMetadataGroup && advisorDraft.value !== null) {
        const fieldKeys = selectedSharedMetadataGroup.targets.map(
          (target) => target.key,
        );

        updateMetadataDraftValues(fieldKeys, advisorDraft.value);
        markMetadataFieldResolutions(fieldKeys, "ai_drafted");
      } else if (advisorDraft.value !== null) {
        updateMetadataDraftValue(activeTarget.key, advisorDraft.value);
        markMetadataFieldResolution(activeTarget.key, "ai_drafted");
      }

      setAdvisorExchange((current) => [
        ...current,
        {
          id: `refinement-advisor-${timestamp}`,
          role: "advisor",
          text: advisorDraft.reply,
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
          ? "Disconnected preview uses local advisor fixtures and cannot mutate backend truth."
          : runtimeStatus === "current"
            ? "Advice is admitted and routed through the OOS Refinement contract."
            : "Canonical Refinement advice is unavailable and does not fall back locally."
      }
      statusTone={runtimeStatus === "offline" ? "danger" : "warn"}
      transcript={advisorLines}
    />
  );
}
