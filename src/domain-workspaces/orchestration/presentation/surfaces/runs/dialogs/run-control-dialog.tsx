"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasContentTray,
  TerasDialog,
  TerasFieldGrid,
  TerasFieldStack,
  TerasMetadataList,
  TerasNoteField,
  TerasTextField,
} from "@/teras";

import type {
  OrchestrationRunControl,
  OrchestrationRunRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import { orchestrationRunControlValidation } from "../../../../work-model/run-control/run-control-model.ts";
import type {
  OrchestrationRunControlInput,
  OrchestrationRunControlReceipt,
} from "../../../../work-model/run-control/run-control-types.ts";
import {
  orchestrationRunEffectPostureLabel,
  orchestrationRunStateLabel,
} from "../orchestration-runs-view-model.ts";

export function RunControlDialog({
  control,
  onApply,
  onClose,
  record,
}: {
  control: OrchestrationRunControl | null;
  onApply: (
    input: OrchestrationRunControlInput,
  ) => OrchestrationRunControlReceipt;
  onClose: () => void;
  record: OrchestrationRunRecord;
}) {
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState("");
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<OrchestrationRunControlReceipt | null>(
    null,
  );
  const [resumeCondition, setResumeCondition] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [signalName, setSignalName] = useState("");
  const [signalRef, setSignalRef] = useState("");

  if (!control) {
    return null;
  }

  const input = buildInput({
    control,
    note,
    owner,
    reason,
    resumeCondition,
    reviewAt,
    signalName,
    signalRef,
  });
  const validation = orchestrationRunControlValidation(record, input);

  function applyControl() {
    try {
      const recordedReceipt = onApply(input);

      setError("");
      setReceipt(recordedReceipt);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The run control could not be recorded.",
      );
    }
  }

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      actions={
        receipt ? (
          <TerasActionButton onClick={onClose}>Done</TerasActionButton>
        ) : (
          <>
            <TerasActionButton onClick={onClose} emphasis="secondary">
              Back
            </TerasActionButton>
            <TerasActionButton
              disabled={!validation.available}
              emphasis="primary"
              onClick={applyControl}
              tone={control.id === "cancel" ? "danger" : "accent"}
            >
              {control.label}
            </TerasActionButton>
          </>
        )
      }
      closeLabel={`Close ${control.label.toLowerCase()} run control`}
      description={control.expectedEffect}
      kicker={control.label}
      onClose={onClose}
      open
      width="standard"
      title="Run Control"
    >
      <TerasMetadataList
        items={[
          { label: "Authority", value: control.owner },
          {
            label: "Availability",
            value: control.available ? "Available" : "Unavailable",
          },
          {
            label: "Idempotency",
            value: control.idempotencyPosture,
          },
          {
            label: "Effect Posture",
            value: orchestrationRunEffectPostureLabel(record.effectPosture),
          },
        ]}
      />

      {receipt ? (
        <TerasContentTray
          description="The immutable source projection is unchanged. This receipt records only the prototype-local control simulation."
          kicker="Local Receipt"
          title={receipt.receiptId}
        >
          <TerasMetadataList
            items={[
              { label: "Control", value: receipt.controlId },
              {
                label: "Projected State",
                value: orchestrationRunStateLabel(receipt.resultingRunState),
              },
              { label: "Recorded", value: receipt.recordedAt },
              { label: "Result", value: receipt.resultState },
            ]}
          />
        </TerasContentTray>
      ) : (
        <RunControlFields
          control={control}
          note={note}
          onNoteChange={setNote}
          onOwnerChange={setOwner}
          onReasonChange={setReason}
          onResumeConditionChange={setResumeCondition}
          onReviewAtChange={setReviewAt}
          onSignalNameChange={setSignalName}
          onSignalRefChange={setSignalRef}
          owner={owner}
          reason={reason}
          resumeCondition={resumeCondition}
          reviewAt={reviewAt}
          signalName={signalName}
          signalRef={signalRef}
        />
      )}

      {error ? (
        <TerasContentTray
          description={error}
          kicker="Control Result"
          title="Request not recorded"
          tone="muted"
        />
      ) : null}
    </TerasDialog>
  );
}

function RunControlFields({
  control,
  note,
  onNoteChange,
  onOwnerChange,
  onReasonChange,
  onResumeConditionChange,
  onReviewAtChange,
  onSignalNameChange,
  onSignalRefChange,
  owner,
  reason,
  resumeCondition,
  reviewAt,
  signalName,
  signalRef,
}: {
  control: OrchestrationRunControl;
  note: string;
  onNoteChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onResumeConditionChange: (value: string) => void;
  onReviewAtChange: (value: string) => void;
  onSignalNameChange: (value: string) => void;
  onSignalRefChange: (value: string) => void;
  owner: string;
  reason: string;
  resumeCondition: string;
  reviewAt: string;
  signalName: string;
  signalRef: string;
}) {
  switch (control.id) {
    case "retry":
    case "resume":
      return (
        <TerasNoteField
          label={`${control.label} reason`}
          minimumHeight="short"
          onValueChange={onReasonChange}
          placeholder={`Explain why this run should ${control.label.toLowerCase()}.`}
          value={reason}
        />
      );
    case "provide-signal":
      return (
        <TerasFieldStack spacing="compact">
          <TerasFieldGrid columns={2} spacing="compact">
            <TerasTextField
              label="Signal name"
              onValueChange={onSignalNameChange}
              placeholder="dependency-ready"
              value={signalName}
            />
            <TerasTextField
              label="Signal reference"
              onValueChange={onSignalRefChange}
              placeholder="signal://approved-input"
              value={signalRef}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Signal note"
            minimumHeight="short"
            onValueChange={onNoteChange}
            placeholder="Add bounded operator context for the signal."
            value={note}
          />
        </TerasFieldStack>
      );
    case "defer":
      return (
        <TerasFieldStack spacing="compact">
          <TerasFieldGrid columns={2} spacing="compact">
            <TerasTextField
              label="Deferral owner"
              onValueChange={onOwnerChange}
              placeholder="Owning team or operator"
              value={owner}
            />
            <TerasTextField
              label="Review date"
              onValueChange={onReviewAtChange}
              type="datetime-local"
              value={reviewAt}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Deferral reason"
            minimumHeight="short"
            onValueChange={onReasonChange}
            placeholder="Explain why work should wait."
            value={reason}
          />
          <TerasNoteField
            label="Resume condition"
            minimumHeight="short"
            onValueChange={onResumeConditionChange}
            placeholder="State the evidence required before resume."
            value={resumeCondition}
          />
        </TerasFieldStack>
      );
    case "cancel":
      return (
        <TerasFieldStack spacing="compact">
          <TerasContentTray
            description="Cancellation stops future nodes. It does not remove or reverse effects already retained by the run."
            kicker="Cancellation Boundary"
            title="Cancellation is not rollback"
            tone="muted"
          />
          <TerasNoteField
            label="Cancellation reason"
            minimumHeight="short"
            onValueChange={onReasonChange}
            placeholder="Explain why future execution should stop."
            value={reason}
          />
        </TerasFieldStack>
      );
  }
}

function buildInput({
  control,
  note,
  owner,
  reason,
  resumeCondition,
  reviewAt,
  signalName,
  signalRef,
}: {
  control: OrchestrationRunControl;
  note: string;
  owner: string;
  reason: string;
  resumeCondition: string;
  reviewAt: string;
  signalName: string;
  signalRef: string;
}): OrchestrationRunControlInput {
  switch (control.id) {
    case "retry":
      return { controlId: "retry", reason };
    case "resume":
      return { controlId: "resume", reason };
    case "provide-signal":
      return {
        controlId: "provide-signal",
        note,
        signalName,
        signalRef,
      };
    case "defer":
      return {
        controlId: "defer",
        owner,
        reason,
        resumeCondition,
        reviewAt,
      };
    case "cancel":
      return {
        acknowledgement: "cancel-is-not-rollback",
        controlId: "cancel",
        reason,
      };
  }
}
