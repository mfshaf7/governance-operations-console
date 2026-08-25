import {
  TerasStatusItem,
  TerasChoiceGroup,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasList,
  TerasStatusPill,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeMovementRequestStepId } from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import {
  type PrototypeMovementIntentId,
  prototypeMovementIntentTarget,
} from "../../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import type {
  MovementDraftPatchHandler,
  MovementStatus,
} from "./prototype-movement-request-panel-types.ts";
import {
  movementIntentChoiceOptions,
  movementRequestPacketRows,
  type PrototypeMovementRequestLocalDraft,
} from "./prototype-movement-request-view-model.ts";

export function PrototypeMovementRequestStepPanel({
  activeStep,
  draft,
  draftMutable,
  intentOptions,
  intentStatus,
  movementRequestRecorded,
  movementTarget,
  onDraftChange,
  onMovementIntentChange,
  packetStatus,
  record,
  sourceDeliveryPacket,
}: {
  activeStep: PrototypeMovementRequestStepId;
  draft: PrototypeMovementRequestLocalDraft;
  draftMutable: boolean;
  intentOptions: ReturnType<typeof movementIntentChoiceOptions>;
  intentStatus: MovementStatus;
  movementRequestRecorded: boolean;
  movementTarget: ReturnType<typeof prototypeMovementIntentTarget>;
  onDraftChange: MovementDraftPatchHandler;
  onMovementIntentChange: (movementIntent: PrototypeMovementIntentId) => void;
  packetStatus: MovementStatus;
  record: PrototypeRecord;
  sourceDeliveryPacket: boolean;
}) {
  if (activeStep === "intent") {
    const returnedCorrection = record.movementRequest.state === "returned";

    return (
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={intentStatus.tone}>
            {intentStatus.label}
          </TerasStatusPill>
        }
        description={
          sourceDeliveryPacket
            ? "Review the fixed Delivery intent supplied by the source-authoritative packet."
            : returnedCorrection
            ? "Update the returned request reason using Movement Control's correction instruction."
            : "Confirm the Movement Control intent. Prototype prepares the request; it does not choose the final movement outcome."
        }
        kicker="Movement Work"
        title="Movement Intent"
      >
        <TerasFieldStack spacing="loose">
          <TerasChoiceGroup
            ariaLabel="Movement intent"
            frame="tray"
            label="Movement intent"
            onSelect={onMovementIntentChange}
            options={intentOptions}
            readOnly={!draftMutable}
            selectedId={draft.movementIntent}
          />
          <TerasFieldGrid columns={2} spacing="compact">
            <TerasContentTray
              description="Generated from selected intent."
              kicker="Target route"
              title={movementTarget.targetLane}
            />
            <TerasContentTray
              description="Generated from selected intent."
              kicker="Target owner"
              title={movementTarget.targetOwner}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label={
              returnedCorrection ? "Corrected request reason" : "Request reason"
            }
            minimumHeight="short"
            onValueChange={(requestReason) => onDraftChange({ requestReason })}
            placeholder={
              sourceDeliveryPacket
                ? "Source-authoritative Delivery rationale"
                : returnedCorrection
                ? "Explain the durable-delivery need and expected governed outcome."
                : "Why should Movement Control review this movement request?"
            }
            readOnly={!draftMutable}
            value={draft.requestReason}
          />
        </TerasFieldStack>
      </TerasWizardPanel>
    );
  }

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={packetStatus.tone}>
          {packetStatus.label}
        </TerasStatusPill>
      }
      description={
        sourceDeliveryPacket
          ? "Review the exact source packet before OOS applies the Delivery handoff."
          : movementRequestRecorded
          ? "Review the locally recorded request before opening the receipt trail."
          : "Review the prepared request before recording the local Prototype receipt."
      }
      kicker="Movement Work"
      title="Request Review"
    >
      <TerasFieldStack spacing="loose">
        <TerasList frame="contained">
          {movementRequestPacketRows(draft, record).map((row, index) => (
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
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
