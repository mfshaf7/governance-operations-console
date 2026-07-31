"use client";

import { TerasAdvisorPanel } from "@/teras";

import type { DeliveryBlockerRecoveryDialogProps } from "./blocker-recovery-dialog-types.ts";

type DeliveryBlockerRecoveryAdvisorPanelProps = Pick<
  DeliveryBlockerRecoveryDialogProps,
  | "blockerAdvisorPrompt"
  | "blockerAdvisorTranscript"
  | "copy"
  | "onChangeBlockerAdvisorPrompt"
  | "submitBlockerAdvisorPrompt"
>;

export function DeliveryBlockerRecoveryAdvisorPanel({
  blockerAdvisorPrompt,
  blockerAdvisorTranscript,
  copy,
  onChangeBlockerAdvisorPrompt,
  submitBlockerAdvisorPrompt,
}: DeliveryBlockerRecoveryAdvisorPanelProps) {
  return (
    <TerasAdvisorPanel
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
      statusLabel="mock only"
      statusTitle={
        copy?.advisorStatusTitle ??
        "Local mock advisor only. Future live support must run through CGG admission and OOS-owned Work Design tooling."
      }
      statusTone="warn"
      transcript={blockerAdvisorTranscript}
    />
  );
}
