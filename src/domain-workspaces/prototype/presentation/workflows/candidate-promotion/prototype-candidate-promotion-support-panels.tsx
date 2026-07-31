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
import type { PrototypeCandidatePromotionStepId } from "../../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import type { CandidateDraftPatchHandler } from "./prototype-candidate-promotion-panel-types.ts";
import {
  candidateDecisionOptions,
  candidatePromotionAdvisorTranscript,
  candidatePromotionDraftStatus,
  candidatePromotionFieldRow,
  candidatePromotionReadyTone,
  candidateScopeItemsReady,
  type PrototypeCandidatePromotionDraft,
} from "./prototype-candidate-promotion-view-model.ts";

export function PrototypeCandidatePromotionSupportPanels({
  actionTone,
  activeStep,
  blockedIssue,
  boundaryDetail,
  boundaryReady,
  boundaryTone,
  draft,
  draftComplete,
  draftMutable,
  issueDetail,
  issueTone,
  onDraftChange,
  onRunAdvisor,
  record,
  reviewReady,
  reviewTone,
}: {
  actionTone: ReturnType<typeof candidatePromotionReadyTone>;
  activeStep: PrototypeCandidatePromotionStepId;
  blockedIssue: boolean;
  boundaryDetail: string;
  boundaryReady: boolean;
  boundaryTone: ReturnType<typeof candidatePromotionReadyTone>;
  draft: PrototypeCandidatePromotionDraft;
  draftComplete: boolean;
  draftMutable: boolean;
  issueDetail: string;
  issueTone: ReturnType<typeof candidatePromotionReadyTone>;
  onDraftChange: CandidateDraftPatchHandler;
  onRunAdvisor: (event: FormEvent<HTMLFormElement>) => void;
  record: PrototypeRecord;
  reviewReady: boolean;
  reviewTone: ReturnType<typeof candidatePromotionReadyTone>;
}) {
  if (activeStep === "interview") {
    const draftStatus = candidatePromotionDraftStatus(draftComplete);
    const advisorTranscript = candidatePromotionAdvisorTranscript({
      draft,
      draftComplete,
      record,
    });

    return (
      <TerasPanelStack fill="last">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={candidatePromotionReadyTone(draftComplete)}>
              {draftComplete ? "Ready" : "Needs fields"}
            </TerasStatusPill>
          }
          description="Check only fields authored in this interview step."
          treatment="rail"
          fit="content"
          kicker="Candidate Check"
          title="Candidate fields"
          tone={candidatePromotionReadyTone(draftComplete)}
        >
          <TerasList frame="contained">
            {[
              candidatePromotionFieldRow({
                id: "candidate-objective",
                index: "01",
                label: "Objective",
                missingDetail: "Objective required.",
                ready: Boolean(draft.objective.trim()),
                readyDetail: "Objective present.",
              }),
              candidatePromotionFieldRow({
                id: "candidate-audience",
                index: "02",
                label: "Audience",
                missingDetail: "Audience type and role required.",
                ready:
                  draft.audience.kind !== "unassigned" &&
                  Boolean(draft.audience.label.trim()),
                readyDetail: "Audience classified.",
              }),
              candidatePromotionFieldRow({
                id: "candidate-proof",
                index: "03",
                label: "Proof",
                missingDetail: "Proof method and criterion required.",
                ready:
                  draft.proof.method !== "unassigned" &&
                  Boolean(draft.proof.criterion.trim()),
                readyDetail: "Success proof structured.",
              }),
              candidatePromotionFieldRow({
                id: "candidate-scope",
                index: "04",
                label: "Included",
                missingDetail: "Included scope required.",
                ready: candidateScopeItemsReady(draft.scope.included),
                readyDetail: "Included scope present.",
              }),
              candidatePromotionFieldRow({
                id: "candidate-exclusions",
                index: "05",
                label: "Excluded",
                missingDetail: "Excluded scope required.",
                ready: candidateScopeItemsReady(draft.scope.excluded),
                readyDetail: "Excluded scope present.",
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
          profileLabel="Candidate Advisor"
          prompt={
            draftMutable
              ? {
                  ariaLabel: "Candidate Promotion advisor prompt",
                  onChange: (advisorPrompt) => onDraftChange({ advisorPrompt }),
                  onSubmit: onRunAdvisor,
                  placeholder:
                    "Ask the advisor to challenge scope, evidence, or boundary readiness...",
                  rows: 2,
                  value: draft.advisorPrompt,
                }
              : undefined
          }
          statusLabel={draftStatus.label}
          statusTitle="Local mock advisor only. Future live support must run through CGG admission and OOS-owned workflow tooling."
          statusTone={draftStatus.tone}
          transcript={advisorTranscript}
        />
      </TerasPanelStack>
    );
  }

  if (activeStep === "review") {
    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={reviewTone}>
              {reviewReady ? "Review clear" : "Needs review"}
            </TerasStatusPill>
          }
          description="Check current candidate prerequisites before recording the outcome."
          treatment="rail"
          fit="content"
          kicker="Review Check"
          title="Candidate review state"
          tone={reviewTone}
        >
          <TerasList frame="contained">
            <TerasStatusItem
              tone={candidatePromotionReadyTone(draftComplete)}
              detail={
                draftComplete
                  ? "Candidate fields present."
                  : "Candidate fields required."
              }
              index="01"
              label="Fields"
              status={draftComplete ? "ready" : "needed"}
            />
            <TerasStatusItem
              tone={boundaryTone}
              detail={boundaryDetail}
              index="02"
              label="Boundary"
              status={boundaryReady ? "clear" : "review"}
            />
            <TerasStatusItem
              tone={issueTone}
              detail={issueDetail}
              index="03"
              label="Issues"
              status={blockedIssue ? "blocked" : "visible"}
            />
          </TerasList>
        </TerasWizardPanel>
        <TerasWizardPanel
          description="Choose the outcome first; the footer records the selected decision."
          treatment="rail"
          fit="content"
          kicker="Decision Action"
          title="Select candidate outcome"
          tone={actionTone}
        >
          <TerasChoiceGroup
            ariaLabel="Candidate Promotion decision"
            frame="none"
            disabled={!draftMutable}
            onSelect={(decision) => onDraftChange({ decision })}
            options={candidateDecisionOptions}
            selectedId={draft.decision}
          />
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  return null;
}
