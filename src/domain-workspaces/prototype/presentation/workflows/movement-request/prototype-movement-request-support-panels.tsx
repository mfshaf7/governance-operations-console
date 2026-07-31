import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasList,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";
import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeMovementRequestStepId } from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import type {
  MovementGateFactStatus,
  MovementStatus,
} from "./prototype-movement-request-panel-types.ts";
import {
  movementIntentChecklistRows,
  movementReturnInstructionProjection,
  movementReviewChecklistRows,
  type PrototypeMovementRequestLocalDraft,
} from "./prototype-movement-request-view-model.ts";

export function PrototypeMovementRequestSupportPanels({
  activeStep,
  authorityStatus,
  draft,
  draftStatus,
  gateBlocked,
  gateFactStatus,
  gatesClear,
  gateTone,
  movementRequestRecorded,
  onOpenReadiness,
  record,
  reviewStatus,
}: {
  activeStep: PrototypeMovementRequestStepId;
  authorityStatus: MovementStatus;
  draft: PrototypeMovementRequestLocalDraft;
  draftStatus: MovementStatus;
  gateBlocked: boolean;
  gateFactStatus: MovementGateFactStatus;
  gatesClear: boolean;
  gateTone: TerasTone;
  movementRequestRecorded: boolean;
  onOpenReadiness: () => void;
  record: PrototypeRecord;
  reviewStatus: MovementStatus;
}) {
  if (activeStep === "intent") {
    const returnInstruction = movementReturnInstructionProjection(record);

    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={draftStatus.tone}>
              {draftStatus.label}
            </TerasStatusPill>
          }
          description="Check the fields authored in this request draft."
          treatment="rail"
          fit="content"
          kicker="Request Check"
          title="Movement request fields"
          tone={draftStatus.tone}
        >
          <TerasList frame="contained">
            {movementIntentChecklistRows(draft, record).map((row, index) => (
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
            <TerasStatusPill tone={returnInstruction ? "warn" : gateTone}>
              {returnInstruction ? "Returned" : gatesClear ? "Ready" : "Review"}
            </TerasStatusPill>
          }
          description={
            returnInstruction?.description ??
            "Gate facts stay available without crowding the request step."
          }
          treatment="rail"
          fit="content"
          kicker={returnInstruction ? "Movement Return" : "Movement Readiness"}
          title={returnInstruction ? "Returned request" : "Gate snapshot"}
          tone={returnInstruction ? "warn" : gateTone}
        >
          <TerasList frame="contained">
            {returnInstruction ? (
              returnInstruction.rows.map((row, index) => (
                <TerasStatusItem
                  tone={row.tone}
                  detail={row.detail}
                  index={String(index + 1).padStart(2, "0")}
                  key={row.id}
                  label={row.label}
                  status={row.status}
                />
              ))
            ) : (
              <TerasStatusItem
                tone={gateTone}
                detail="Readiness facts are retained for Movement Control inspection."
                label="Gate facts"
                status={gateFactStatus.status}
              />
            )}
          </TerasList>
          <TerasActionRow spacing="normal">
            <TerasActionButton onClick={onOpenReadiness} emphasis="secondary">
              {returnInstruction
                ? "View All Readiness"
                : "View Readiness Facts"}
            </TerasActionButton>
          </TerasActionRow>
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  if (activeStep === "request") {
    return (
      <TerasTrayStack align="start" spacing="wide">
        <TerasWizardPanel
          actions={
            <TerasStatusPill tone={reviewStatus.tone}>
              {reviewStatus.label}
            </TerasStatusPill>
          }
          description={
            movementRequestRecorded
              ? "Local request receipt exists. Movement Control still owns the outcome."
              : "Check current Movement request readiness before recording."
          }
          treatment="rail"
          fit="content"
          kicker="Review Check"
          title="Movement review state"
          tone={reviewStatus.tone}
        >
          <TerasList frame="contained">
            {movementReviewChecklistRows(draft, record, {
              gateBlocked,
              gatesClear,
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
            <TerasStatusPill tone={authorityStatus.tone}>
              {authorityStatus.label}
            </TerasStatusPill>
          }
          description="This records a local request record only. Movement Control still owns queueing, decision, outcome, and durable receipt truth."
          treatment="rail"
          fit="content"
          kicker="Authority"
          title="Preparation only"
          tone={authorityStatus.tone}
        >
          <TerasList frame="contained">
            <TerasStatusItem
              tone="info"
              detail="Prototype prepares the request packet."
              index="01"
              label="Prototype"
              status="prepare"
            />
            <TerasStatusItem
              tone="info"
              detail="Movement Control owns the actual decision and durable receipt."
              index="02"
              label="Movement Control"
              status="external"
            />
          </TerasList>
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  return null;
}
