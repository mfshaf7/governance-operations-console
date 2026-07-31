import type { DeliveryTone } from "../../../../read-model/index.ts";

import type { WorkDesignBlockerDisposition } from "../model/work-design-model.ts";

export type WorkDesignBlockerDispositionCopy = {
  allowsWorkDesign: boolean;
  description: string;
  label: string;
  recoveryAction: string;
  resultLabel: string;
  title: string;
  tone: DeliveryTone;
};

export function workDesignBlockerDispositionCopy(
  disposition: WorkDesignBlockerDisposition,
): WorkDesignBlockerDispositionCopy {
  switch (disposition) {
    case "accept-risk":
      return {
        allowsWorkDesign: true,
        description:
          "the operator continues even though the blocker evidence is not fixed",
        label: "Accept Risk - Continue",
        recoveryAction:
          "Continue locally with an explicit risk note; the missing or degraded evidence stays visible.",
        resultLabel: "risk accepted",
        title: "Risk Acceptance Recorded",
        tone: "danger",
      };
    case "defer":
      return {
        allowsWorkDesign: false,
        description:
          "the blocker remains unresolved and normal Work Design stays stopped",
        label: "Keep Blocked",
        recoveryAction:
          "Leave the package blocked until the issue is fixed or the operator records a different decision.",
        resultLabel: "kept blocked",
        title: "Still Blocked",
        tone: "muted",
      };
    case "remove":
      return {
        allowsWorkDesign: true,
        description:
          "the operator recorded a recovery action that cleared the blocker",
        label: "Recovery Cleared",
        recoveryAction:
          "Clear the Work Design blocker only after the selected recovery action records proof.",
        resultLabel: "cleared",
        title: "Recovery Recorded",
        tone: "info",
      };
    case "workaround":
    default:
      return {
        allowsWorkDesign: false,
        description:
          "the operator records diagnosis or a plan, but normal Work Design stays stopped",
        label: "Diagnosis Recorded - Still Blocked",
        recoveryAction:
          "Keep the package blocked while the diagnosis is proven or the operator records a recovery action.",
        resultLabel: "diagnosis recorded",
        title: "Diagnosis Recorded - Still Blocked",
        tone: "warn",
      };
  }
}
