"use client";

import {
  TerasChoiceGroup,
  TerasActionRow,
  TerasDetailGrid,
  TerasActionButton,
  TerasContentRegion,
  TerasMetadataList,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import {
  deliveryBlockerEditorFieldProps,
  type DeliveryBlockerRecoveryDialogProps,
} from "./blocker-recovery-dialog-types.ts";
import { deliveryBlockerSelectedActionMetadata } from "./blocker-recovery-model.ts";

type DeliveryBlockerRecoveryActionPanelProps = Pick<
  DeliveryBlockerRecoveryDialogProps,
  | "blockerDispositionJustification"
  | "blockerRecoveryActions"
  | "blockerRecoveryNoteLabel"
  | "blockerRecoveryNotePlaceholder"
  | "matchingBlockerDispositionReceipt"
  | "onChangeBlockerDispositionJustification"
  | "onOpenActionInfo"
  | "onRecordBlockerDisposition"
  | "onSelectBlockerRecoveryAction"
  | "selectedBlockerRecoveryAction"
  | "selectedBlockerRecoveryActionRecorded"
  | "selectedBlockerRecoveryBlockerLabel"
  | "selectedBlockerRecoveryCanRun"
  | "selectedBlockerRecoveryDispositionLabel"
  | "selectedBlockerRecoveryRequiresNote"
  | "selectedBlockerRecoveryStatusLabel"
  | "selectedBlockerRecoveryVisualTone"
>;

export function DeliveryBlockerRecoveryActionPanel({
  blockerDispositionJustification,
  blockerRecoveryActions,
  blockerRecoveryNoteLabel,
  blockerRecoveryNotePlaceholder,
  matchingBlockerDispositionReceipt,
  onChangeBlockerDispositionJustification,
  onOpenActionInfo,
  onRecordBlockerDisposition,
  onSelectBlockerRecoveryAction,
  selectedBlockerRecoveryAction,
  selectedBlockerRecoveryActionRecorded,
  selectedBlockerRecoveryBlockerLabel,
  selectedBlockerRecoveryCanRun,
  selectedBlockerRecoveryDispositionLabel,
  selectedBlockerRecoveryRequiresNote,
  selectedBlockerRecoveryStatusLabel,
  selectedBlockerRecoveryVisualTone,
}: DeliveryBlockerRecoveryActionPanelProps) {
  return (
    <TerasContentRegion fill gap="normal" scroll>
      <TerasPanel
        frame="padded"
        treatment="rail"
        layout="header-body"
        spacing="compact"
        tone="warn"
      >
        <TerasPanelHeader
          description="Choose the recovery route that records how this blocker should be handled."
          kicker="Recovery Actions"
          title="Choose Recovery Path"
        />
        <TerasDetailGrid variant="balanced">
          <TerasChoiceGroup
            ariaLabel="Blocker recovery actions"
            frame="none"
            onSelect={onSelectBlockerRecoveryAction}
            options={blockerRecoveryActions.map((action) => ({
              id: action.id,
              label: action.label,
              confirmed:
                matchingBlockerDispositionReceipt?.recoveryActionId ===
                action.id,
              tone: action.tone,
            }))}
            selectedId={selectedBlockerRecoveryAction.id}
          />

          <TerasPanel
            frame="padded"
            treatment="state"
            layout="header-body-footer"
            spacing="compact"
            tone={selectedBlockerRecoveryVisualTone}
          >
            <TerasPanelHeader
              description={selectedBlockerRecoveryAction.description}
              kicker="Selected Action"
              statusLabel={selectedBlockerRecoveryStatusLabel}
              statusTone={selectedBlockerRecoveryVisualTone}
              title={selectedBlockerRecoveryAction.label}
            />
            <TerasMetadataList
              columns={3}
              items={deliveryBlockerSelectedActionMetadata({
                selectedBlockerRecoveryBlockerLabel,
                selectedBlockerRecoveryDispositionLabel,
                selectedBlockerRecoveryRequiresNote,
              })}
            />
            <TerasActionRow spacing="compact">
              <TerasActionButton
                onClick={onOpenActionInfo}
                emphasis="secondary"
              >
                Action Info
              </TerasActionButton>
              {!selectedBlockerRecoveryActionRecorded ? (
                <TerasActionButton
                  disabled={!selectedBlockerRecoveryCanRun}
                  onClick={() =>
                    onRecordBlockerDisposition(selectedBlockerRecoveryAction)
                  }
                  title={
                    selectedBlockerRecoveryRequiresNote &&
                    !blockerDispositionJustification.trim()
                      ? "Add a decision rationale before recording this recovery action."
                      : selectedBlockerRecoveryAction.primaryLabel
                  }
                  emphasis="primary"
                  tone={
                    selectedBlockerRecoveryVisualTone === "danger"
                      ? "danger"
                      : "accent"
                  }
                >
                  {selectedBlockerRecoveryAction.primaryLabel}
                </TerasActionButton>
              ) : null}
            </TerasActionRow>
          </TerasPanel>
        </TerasDetailGrid>
      </TerasPanel>

      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasNoteField
          {...deliveryBlockerEditorFieldProps}
          aria-label="Blocker recovery operator note"
          label={blockerRecoveryNoteLabel}
          onValueChange={onChangeBlockerDispositionJustification}
          placeholder={blockerRecoveryNotePlaceholder}
          value={blockerDispositionJustification}
        />
      </TerasPanel>
    </TerasContentRegion>
  );
}
