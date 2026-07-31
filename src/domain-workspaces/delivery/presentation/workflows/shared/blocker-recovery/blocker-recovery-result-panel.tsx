"use client";

import {
  TerasStatusItem,
  TerasList,
  TerasContentTray,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type { DeliveryBlockerRecoveryDialogProps } from "./blocker-recovery-dialog-types.ts";
import {
  deliveryBlockerRecordedResultMetadata,
  deliveryBlockerWaitingResultMetadata,
} from "./blocker-recovery-model.ts";

type DeliveryBlockerRecoveryResultPanelProps = Pick<
  DeliveryBlockerRecoveryDialogProps,
  | "blockerDispositionRecordedCopy"
  | "blockerDispositionReceiptRecordedAt"
  | "blockerResultRecoveryAction"
  | "blockerResultVisualTone"
  | "copy"
  | "matchingBlockerDispositionReceipt"
  | "selectedBlockerRecoveryAction"
  | "selectedBlockerRecoveryBlockerLabel"
  | "selectedBlockerRecoveryStatusLabel"
>;

export function DeliveryBlockerRecoveryResultPanel({
  blockerDispositionRecordedCopy,
  blockerDispositionReceiptRecordedAt,
  blockerResultRecoveryAction,
  blockerResultVisualTone,
  copy,
  matchingBlockerDispositionReceipt,
  selectedBlockerRecoveryAction,
  selectedBlockerRecoveryBlockerLabel,
  selectedBlockerRecoveryStatusLabel,
}: DeliveryBlockerRecoveryResultPanelProps) {
  return (
    <TerasPanel
      frame="padded"
      treatment="state"
      fit="content"
      spacing="compact"
      tone={blockerResultVisualTone}
    >
      {matchingBlockerDispositionReceipt && blockerDispositionRecordedCopy ? (
        <>
          <TerasPanelHeader
            description={matchingBlockerDispositionReceipt.justification}
            kicker="Recovery Result"
            statusLabel={blockerDispositionRecordedCopy.resultLabel}
            statusTone={blockerResultVisualTone}
            title={
              blockerResultRecoveryAction?.receiptTitle ??
              blockerDispositionRecordedCopy.title
            }
          />
          <TerasMetadataList
            columns={1}
            items={deliveryBlockerRecordedResultMetadata({
              blockerDispositionReceiptRecordedAt,
              blockerDispositionRecordedCopy,
              copy,
              matchingBlockerDispositionReceipt,
            })}
            shape="list"
          />
          {matchingBlockerDispositionReceipt.evidenceLines?.length ? (
            <TerasContentTray kicker="Evidence Lines" title="Recorded Proof">
              <TerasList>
                {matchingBlockerDispositionReceipt.evidenceLines.map(
                  (line, index) => (
                    <TerasStatusItem
                      key={`${line}-${index}`}
                      tone="ok"
                      detail={line}
                      label={`Proof ${index + 1}`}
                      status="proof"
                    />
                  ),
                )}
              </TerasList>
            </TerasContentTray>
          ) : null}
        </>
      ) : (
        <>
          <TerasPanelHeader
            description="Run the selected recovery action to record proof here. Use Action Info when you need the diagnosis, evidence, and check locations before applying."
            kicker="Recovery Result"
            statusLabel="waiting"
            statusTone="warn"
            title="No Result Recorded"
          />
          <TerasMetadataList
            columns={1}
            items={deliveryBlockerWaitingResultMetadata({
              selectedBlockerRecoveryAction,
              selectedBlockerRecoveryBlockerLabel,
              selectedBlockerRecoveryStatusLabel,
            })}
            shape="list"
          />
        </>
      )}
    </TerasPanel>
  );
}
