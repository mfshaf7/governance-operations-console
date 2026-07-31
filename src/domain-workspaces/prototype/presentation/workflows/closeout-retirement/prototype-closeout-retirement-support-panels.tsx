import {
  TerasStatusItem,
  TerasChoiceGroup,
  TerasList,
  TerasSignalItem,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";
import type { TerasTone } from "@/teras";

import type { PrototypeCloseoutRetirementStepId } from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import type {
  PrototypeCloseoutDecision,
  prototypeCloseoutImpactRows,
} from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import type {
  CloseoutDraftPatchHandler,
  CloseoutStatus,
} from "./prototype-closeout-retirement-panel-types.ts";
import {
  closeoutDecisionChecklistRows,
  closeoutDecisionOptionsForState,
  closeoutDecisionSignal,
  closeoutDraftAction,
  closeoutImpactChecklistRows,
  closeoutReasonChecklistRows,
  type CloseoutDraft,
} from "./prototype-closeout-retirement-view-model.ts";

export function PrototypeCloseoutRetirementSupportPanels({
  activeStep,
  canRecordCloseout,
  closeoutMoveDescription,
  closeoutMoveTitle,
  closeoutMoveTone,
  decisionAction,
  decisionOptions,
  decisionSignal,
  draft,
  draftComplete,
  draftMutable,
  impactRows,
  impactStatus,
  onDraftChange,
  reasonStatus,
  requiresMovement,
  reviewStatus,
  showSupersededBy,
}: {
  activeStep: PrototypeCloseoutRetirementStepId;
  canRecordCloseout: boolean;
  closeoutMoveDescription: string;
  closeoutMoveTitle: string;
  closeoutMoveTone: TerasTone;
  decisionAction: ReturnType<typeof closeoutDraftAction>;
  decisionOptions: ReturnType<typeof closeoutDecisionOptionsForState>;
  decisionSignal: ReturnType<typeof closeoutDecisionSignal>;
  draft: CloseoutDraft;
  draftComplete: boolean;
  draftMutable: boolean;
  impactRows: ReturnType<typeof prototypeCloseoutImpactRows>;
  impactStatus: CloseoutStatus;
  onDraftChange: CloseoutDraftPatchHandler;
  reasonStatus: CloseoutStatus;
  requiresMovement: boolean;
  reviewStatus: CloseoutStatus;
  showSupersededBy: boolean;
}) {
  if (activeStep === "impact") {
    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={reasonStatus.tone}>
              {reasonStatus.label}
            </TerasStatusPill>
          }
          description="Check the closeout reason fields authored in this step."
          treatment="rail"
          fit="content"
          kicker="Reason Check"
          title="Closeout reason"
          tone={reasonStatus.tone}
        >
          <TerasList frame="contained">
            {closeoutReasonChecklistRows(draft, {
              draftComplete,
              showSupersededBy,
            }).map((row, index) => (
              <TerasStatusItem
                tone={row.tone}
                detail={row.detail}
                index={String(index + 1).padStart(2, "0")}
                key={row.id}
                label={row.label}
                status={row.status}
              />
            ))}
          </TerasList>
        </TerasWizardPanel>
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={impactStatus.tone}>
              {impactStatus.label}
            </TerasStatusPill>
          }
          description={closeoutMoveDescription}
          treatment="rail"
          fit="content"
          kicker="Impact Check"
          title={closeoutMoveTitle}
          tone={closeoutMoveTone}
        >
          <TerasList frame="contained">
            {closeoutImpactChecklistRows(impactRows).map((row, index) => (
              <TerasStatusItem
                tone={row.tone}
                detail={row.detail}
                index={String(index + 1).padStart(2, "0")}
                key={row.id}
                label={row.label}
                status={row.status}
              />
            ))}
          </TerasList>
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  if (activeStep === "decision") {
    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={reviewStatus.tone}>
              {reviewStatus.label}
            </TerasStatusPill>
          }
          description="Review the selected action, impact route, and retention plan before recording."
          treatment="rail"
          fit="content"
          kicker="Review Check"
          title="Closeout review state"
          tone={reviewStatus.tone}
        >
          <TerasList frame="contained">
            {closeoutDecisionChecklistRows(draft, {
              canRecordCloseout,
              requiresMovement,
              showSupersededBy,
            }).map((row, index) => (
              <TerasStatusItem
                tone={row.tone}
                detail={row.detail}
                index={String(index + 1).padStart(2, "0")}
                key={row.id}
                label={row.label}
                status={row.status}
              />
            ))}
          </TerasList>
        </TerasWizardPanel>
        <TerasWizardPanel
          description="Choose the closeout outcome after reviewing readiness; the footer records the selected decision."
          treatment="rail"
          fit="content"
          kicker="Decision Action"
          title="Select closeout outcome"
          tone={decisionAction.tone}
        >
          <TerasChoiceGroup
            ariaLabel="Closeout decision"
            frame="none"
            onSelect={(decision) =>
              onDraftChange({ decision: decision as PrototypeCloseoutDecision })
            }
            options={decisionOptions}
            readOnly={!draftMutable}
            selectedId={draft.decision}
          />
          <TerasList frame="contained">
            <TerasSignalItem
              detail={decisionSignal.detail}
              label={decisionSignal.label}
              title={decisionSignal.title}
              tone={decisionSignal.tone}
            />
          </TerasList>
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  return null;
}
