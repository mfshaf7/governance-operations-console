"use client";

import { TerasAdvisorPanel } from "@/teras";

import type { DeliveryBlockerRecoveryDialogProps } from "./blocker-recovery-dialog-types.ts";

type DeliveryBlockerRecoveryAdvisorPanelProps = Pick<
  DeliveryBlockerRecoveryDialogProps,
  | "blockerAdvisorPrompt"
  | "blockerAdvisorControls"
  | "blockerAdvisorTranscript"
  | "copy"
  | "onChangeBlockerAdvisorPrompt"
  | "submitBlockerAdvisorPrompt"
>;

export function DeliveryBlockerRecoveryAdvisorPanel({
  blockerAdvisorControls,
  blockerAdvisorPrompt,
  blockerAdvisorTranscript,
  copy,
  onChangeBlockerAdvisorPrompt,
  submitBlockerAdvisorPrompt,
}: DeliveryBlockerRecoveryAdvisorPanelProps) {
  return (
    <TerasAdvisorPanel
      draftControls={blockerAdvisorControls}
      density="compact"
      fill
      profileLabel={copy?.advisorProfileLabel ?? "Blocker Recovery Advisor"}
      prompt={{
        ariaLabel: "Blocker recovery advisor prompt",
        onChange: onChangeBlockerAdvisorPrompt,
        onSubmit: submitBlockerAdvisorPrompt,
        placeholder:
          copy?.advisorPlaceholder ??
          "Ask which recovery action fits this blocker...",
        rows: 2,
        value: blockerAdvisorPrompt,
      }}
      statusLabel="draft assistance"
      statusTitle={
        copy?.advisorStatusTitle ??
        "An explicit chat request may draft the local justification. Record and recovery actions remain operator decisions."
      }
      statusTone="warn"
      transcript={blockerAdvisorTranscript}
    />
  );
}
