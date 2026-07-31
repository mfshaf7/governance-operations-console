import type { FormEvent } from "react";

import {
  TerasAdvisorPanel,
  TerasStatusItem,
  TerasChoiceGroup,
  TerasList,
  TerasPanelStack,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeBaselinePromotionStepId } from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import type { BaselineDraftPatchHandler } from "./prototype-baseline-promotion-panel-types.ts";
import {
  baselineDecisionOptions,
  baselineDraftStatus,
  baselineFieldCheckRow,
  baselinePromotionAdvisorTranscript,
  baselineReadyTone,
  type PrototypeBaselinePromotionDraft,
} from "./prototype-baseline-promotion-view-model.ts";

export function PrototypeBaselinePromotionSupportPanels({
  activeStep,
  advisorPromptMutable,
  baselineStateClear,
  boundaryClear,
  boundaryDetail,
  boundaryTone,
  currentEvidenceClear,
  currentEvidenceDetail,
  currentEvidenceTone,
  draft,
  draftComplete,
  draftMutable,
  onDraftChange,
  onRunAdvisor,
  packetDefinitionReady,
  packetDispositionsReady,
  packetReady,
  packetScopeReady,
  record,
  reviewDispositionsReady,
  reviewReady,
  decisionTone,
}: {
  activeStep: PrototypeBaselinePromotionStepId;
  advisorPromptMutable: boolean;
  baselineStateClear: boolean;
  boundaryClear: boolean;
  boundaryDetail: string;
  boundaryTone: ReturnType<typeof baselineReadyTone>;
  currentEvidenceClear: boolean;
  currentEvidenceDetail: string;
  currentEvidenceTone: ReturnType<typeof baselineReadyTone>;
  draft: PrototypeBaselinePromotionDraft;
  draftComplete: boolean;
  draftMutable: boolean;
  onDraftChange: BaselineDraftPatchHandler;
  onRunAdvisor: (event: FormEvent<HTMLFormElement>) => void;
  packetDefinitionReady: boolean;
  packetDispositionsReady: boolean;
  packetReady: boolean;
  packetScopeReady: boolean;
  record: PrototypeRecord;
  reviewDispositionsReady: boolean;
  reviewReady: boolean;
  decisionTone: ReturnType<typeof baselineReadyTone>;
}) {
  if (activeStep === "packet") {
    const packetStatus = baselineDraftStatus(packetReady);
    const advisorTranscript = baselinePromotionAdvisorTranscript({
      draft,
      draftComplete,
      record,
    });

    return (
      <TerasPanelStack fill="last">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={baselineReadyTone(packetReady)}>
              {packetReady ? "Packet ready" : "Needs fields"}
            </TerasStatusPill>
          }
          description="Check only fields authored in this packet step."
          treatment="rail"
          fit="content"
          kicker="Packet Check"
          title="Baseline packet fields"
          tone={baselineReadyTone(packetReady)}
        >
          <TerasList frame="contained">
            {[
              baselineFieldCheckRow({
                id: "baseline-definition",
                index: "01",
                label: "Definition",
                missingDetail: "Title + statement required.",
                ready: packetDefinitionReady,
                readyDetail: "Title + statement present.",
              }),
              baselineFieldCheckRow({
                id: "baseline-candidate-scope",
                index: "02",
                label: "Candidate scope",
                missingDetail: "Candidate Promotion scope is missing.",
                ready: packetScopeReady,
                readyDetail:
                  "Accepted and excluded scope inherit from Candidate Promotion.",
              }),
              baselineFieldCheckRow({
                id: "baseline-disposition",
                index: "03",
                label: "Disposition",
                missingDetail: "Disposition required.",
                ready: packetDispositionsReady,
                readyDetail: "Disposition present.",
              }),
            ].map((row) => (
              <TerasStatusItem
                tone={row.dataTone}
                detail={row.detail}
                index={row.indexLabel}
                key={row.id}
                label={row.label}
                status={row.status}
              />
            ))}
          </TerasList>
        </TerasWizardPanel>
        <TerasAdvisorPanel
          density="compact"
          fill
          profileLabel="Baseline Advisor"
          prompt={
            advisorPromptMutable
              ? {
                  ariaLabel: "Baseline Promotion advisor prompt",
                  onChange: (advisorPrompt) => onDraftChange({ advisorPrompt }),
                  onSubmit: onRunAdvisor,
                  placeholder:
                    "Ask the advisor to challenge packet wording, scope, or disposition...",
                  rows: 2,
                  value: draft.advisorPrompt,
                }
              : undefined
          }
          statusLabel={packetStatus.label}
          statusTitle="Local mock advisor only. Future live support must run through CGG admission and OOS-owned workflow tooling."
          statusTone={packetStatus.tone}
          transcript={advisorTranscript}
        />
      </TerasPanelStack>
    );
  }

  if (activeStep === "decision") {
    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={baselineReadyTone(reviewReady)}>
              {reviewReady ? "Review clear" : "Needs review"}
            </TerasStatusPill>
          }
          description="Review current evidence, boundary posture, and disposition before recording the baseline outcome."
          treatment="rail"
          fit="content"
          kicker="Review Check"
          title="Baseline review state"
          tone={baselineReadyTone(reviewReady)}
        >
          <TerasTrayStack spacing="loose">
            <TerasList frame="contained">
              <TerasStatusItem
                tone={baselineReadyTone(packetDefinitionReady)}
                detail={
                  packetDefinitionReady
                    ? "Title + statement present."
                    : "Definition incomplete."
                }
                index="01"
                label="Definition"
                status={packetDefinitionReady ? "ready" : "needed"}
              />
              <TerasStatusItem
                tone={currentEvidenceTone}
                detail={currentEvidenceDetail}
                index="02"
                label="Evidence"
                status={currentEvidenceClear ? "current" : "review"}
              />
              <TerasStatusItem
                tone={boundaryTone}
                detail={boundaryDetail}
                index="03"
                label="Boundary"
                status={boundaryClear ? "clear" : "review"}
              />
              <TerasStatusItem
                tone={baselineReadyTone(reviewDispositionsReady)}
                detail={
                  reviewDispositionsReady
                    ? "Disposition present."
                    : "Disposition required."
                }
                index="04"
                label="Disposition"
                status={reviewDispositionsReady ? "ready" : "needed"}
              />
              {!baselineStateClear ? (
                <TerasStatusItem
                  tone="danger"
                  detail="Baseline blocker is recorded."
                  index="05"
                  label="State"
                  status="blocked"
                />
              ) : null}
            </TerasList>
          </TerasTrayStack>
        </TerasWizardPanel>
        <TerasWizardPanel
          description="Choose the outcome first; the footer records the selected decision."
          treatment="rail"
          fit="content"
          kicker="Decision Action"
          title="Select baseline outcome"
          tone={decisionTone}
        >
          <TerasChoiceGroup
            ariaLabel="Baseline Promotion decision"
            frame="none"
            disabled={!draftMutable}
            onSelect={(decision) => onDraftChange({ decision })}
            options={baselineDecisionOptions}
            selectedId={draft.decision}
          />
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  return null;
}
