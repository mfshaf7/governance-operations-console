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

  function submitAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const timestamp = Date.now();
    const advisorDraft = refinementAdvisorDraft({
      deliveryPackageName,
      draftValue,
      selectedTarget: selectedSharedMetadataGroup?.targets[0] ?? selectedTarget,
      sharedTargetCount: selectedSharedMetadataGroup?.targets.length,
    });

    if (selectedSharedMetadataGroup && advisorDraft.value !== null) {
      const fieldKeys = selectedSharedMetadataGroup.targets.map(
        (target) => target.key,
      );

      updateMetadataDraftValues(fieldKeys, advisorDraft.value);
      markMetadataFieldResolutions(fieldKeys, "ai_drafted");
    } else if (selectedTarget && advisorDraft.value !== null) {
      updateMetadataDraftValue(selectedTarget.key, advisorDraft.value);
      markMetadataFieldResolution(selectedTarget.key, "ai_drafted");
    }

    setAdvisorExchange((current) => [
      ...current,
      {
        id: `refinement-operator-${timestamp}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `refinement-advisor-${timestamp}`,
        role: "advisor",
        text: advisorDraft.reply,
      },
    ]);
    setAdvisorPrompt("");
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
      statusLabel="mock only"
      statusTitle="Local mock advisor only. Future live support must run through CGG admission and OOS-owned Refinement tooling."
      statusTone="warn"
      transcript={advisorLines}
    />
  );
}
