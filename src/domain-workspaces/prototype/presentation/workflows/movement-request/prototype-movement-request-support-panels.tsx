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
  sourceDeliveryPacket,
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
  sourceDeliveryPacket: boolean;
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
                detail={
                  sourceDeliveryPacket
                    ? "Readiness facts remain available for OOS validation."
                    : "Readiness facts remain available with the local source intent."
                }
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
            authorityStatus.description ??
            (sourceDeliveryPacket
              ? "OOS validates and applies the exact source packet; only its durable receipt completes the handoff."
              : movementRequestRecorded
                ? "The local source-intent receipt is recorded without claiming target application."
                : "Check current request readiness before recording the local preview.")
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
          description={
            sourceDeliveryPacket
              ? "The Console submits the source-owned packet through its server-only OOS adapter."
              : "This records a Prototype-local source intent only; live validation and target application remain unavailable."
          }
          treatment="rail"
          fit="content"
          kicker="Authority"
          title={
            sourceDeliveryPacket ? "Application boundary" : "Preparation only"
          }
          tone={authorityStatus.tone}
        >
          <TerasList frame="contained">
            <TerasStatusItem
              tone="info"
              detail={
                sourceDeliveryPacket
                  ? "Workspace Prototype Studio owns the exact packet."
                  : "Prototype prepares the local source intent."
              }
              index="01"
              label="Prototype"
              status={sourceDeliveryPacket ? "source" : "prepare"}
            />
            <TerasStatusItem
              tone="info"
              detail={
                sourceDeliveryPacket
                  ? "OOS owns target application and the durable receipt."
                  : "No live target application is claimed."
              }
              index="02"
              label={
                sourceDeliveryPacket ? "Orchestration" : "Target application"
              }
              status={sourceDeliveryPacket ? "apply" : "unavailable"}
            />
          </TerasList>
        </TerasWizardPanel>
      </TerasTrayStack>
    );
  }

  return null;
}
