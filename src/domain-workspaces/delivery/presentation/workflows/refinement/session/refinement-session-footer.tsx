"use client";

import { TerasActionButton } from "@/teras";

import type { DeliveryRefinementModalStep } from "../model/refinement-model.ts";

type RefinementSessionFooterProps = {
  activeStep: DeliveryRefinementModalStep;
  blocked: boolean;
  canApply: boolean;
  onApplyRefinement: () => void;
  onRequestClose: () => void;
  onReturnToRegister: () => void;
  onSelectStep: (step: DeliveryRefinementModalStep) => void;
};

export function RefinementSessionFooter({
  activeStep,
  blocked,
  canApply,
  onApplyRefinement,
  onRequestClose,
  onReturnToRegister,
  onSelectStep,
}: RefinementSessionFooterProps) {
  const showReviewApplyPlanFooterAction =
    activeStep !== "readiness_review" &&
    activeStep !== "apply_refinement" &&
    activeStep !== "receipt";

  return (
    <>
      <TerasActionButton
        data-refinement-action={
          activeStep === "hub" ? "return-to-register" : "return-to-hub"
        }
        onClick={
          activeStep === "hub" ? onReturnToRegister : () => onSelectStep("hub")
        }
        emphasis="secondary"
      >
        {activeStep === "hub" ? "Back to Register" : "Back to Hub"}
      </TerasActionButton>
      {activeStep === "hub" ? null : activeStep === "metadata_draft" ? (
        <TerasActionButton
          data-refinement-action="review-readiness"
          disabled={blocked}
          onClick={() => onSelectStep("readiness_review")}
        >
          Review Readiness
        </TerasActionButton>
      ) : showReviewApplyPlanFooterAction ? (
        <TerasActionButton
          data-refinement-action="review-apply-plan"
          disabled={blocked || !canApply}
          onClick={() => onSelectStep("apply_refinement")}
        >
          Review Apply Plan
        </TerasActionButton>
      ) : activeStep === "apply_refinement" ? (
        <TerasActionButton
          data-refinement-action="apply-refinement"
          disabled={blocked || !canApply}
          onClick={onApplyRefinement}
        >
          Apply Refinement
        </TerasActionButton>
      ) : (
        <TerasActionButton
          data-refinement-action="return-to-register"
          onClick={onRequestClose}
        >
          Back to Register
        </TerasActionButton>
      )}
    </>
  );
}
