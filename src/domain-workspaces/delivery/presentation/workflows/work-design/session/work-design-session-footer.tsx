"use client";

import type { DeliveryTone } from "../../../../read-model/index.ts";

import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import {
  workDesignSessionFooterProjection,
  type WorkDesignFooterActionKind,
} from "../view-model/work-design-shell-view-model.ts";
import { TerasActionButton } from "@/teras";

type WorkDesignSessionFooterProps = {
  activeStep: WorkDesignStep;
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  contextBriefReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextDecisionTone: DeliveryTone;
  onAcceptContextBrief: () => void;
  onRequestClose: () => void;
  onReturnToRegister: () => void;
  onRunApplyDraft: () => void;
  onSelectStep: (step: WorkDesignStep) => void;
  reviewRouteReady: boolean;
  validateReady: boolean;
  workDesignClosed: boolean;
};

export function WorkDesignSessionFooter({
  activeStep,
  applyReceiptRecorded,
  applyReady,
  contextBriefReady,
  contextDecision,
  contextDecisionTone,
  onAcceptContextBrief,
  onRequestClose,
  onReturnToRegister,
  onRunApplyDraft,
  onSelectStep,
  reviewRouteReady,
  validateReady,
  workDesignClosed,
}: WorkDesignSessionFooterProps) {
  const footerProjection = workDesignSessionFooterProjection({
    activeStep,
    applyReceiptRecorded,
    applyReady,
    contextBriefReady,
    contextDecision,
    contextDecisionTone,
    reviewRouteReady,
    validateReady,
    workDesignClosed,
  });

  function handleFooterAction(kind: WorkDesignFooterActionKind) {
    switch (kind) {
      case "accept-context-brief":
        onAcceptContextBrief();
        return;
      case "open-apply-draft":
        onSelectStep("apply");
        return;
      case "open-read-only-history":
      case "open-receipt-history":
        onSelectStep("history");
        return;
      case "open-review-draft":
        onSelectStep("review");
        return;
      case "request-close":
        onRequestClose();
        return;
      case "return-to-design-hub":
        onSelectStep("hub");
        return;
      case "return-to-register":
        onReturnToRegister();
        return;
      case "run-apply-draft":
        onRunApplyDraft();
        return;
    }
  }

  return (
    <>
      <TerasActionButton
        data-work-design-action={footerProjection.returnAction.dataAction}
        onClick={() => handleFooterAction(footerProjection.returnAction.kind)}
        emphasis={footerProjection.returnAction.emphasis}
      >
        {footerProjection.returnAction.label}
      </TerasActionButton>
      {footerProjection.primaryAction ? (
        <TerasActionButton
          data-work-design-action={footerProjection.primaryAction.dataAction}
          disabled={footerProjection.primaryAction.disabled}
          onClick={() =>
            handleFooterAction(footerProjection.primaryAction!.kind)
          }
          emphasis={footerProjection.primaryAction.emphasis}
          tone={
            footerProjection.primaryAction.tone === "danger"
              ? "danger"
              : "accent"
          }
        >
          {footerProjection.primaryAction.label}
        </TerasActionButton>
      ) : null}
    </>
  );
}
