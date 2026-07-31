"use client";

import { TerasActionButton } from "@/teras";

import type { ProposalHubMove } from "../../hub/proposal-hub-view-model.ts";
import type { ProposalWorkflowFooterMove } from "./proposal-workflow-session-view-model.ts";
import type { ProposalWorkflowActiveStep } from "../../../work-model/proposal-workflow-step-model.ts";

export function ProposalWorkflowFooter({
  activeStep,
  currentMove,
  footerMove,
  onBackToRegister,
  onBackToHub,
  onRunFooterMove,
  onRunCurrentMove,
}: {
  activeStep: ProposalWorkflowActiveStep;
  currentMove: ProposalHubMove;
  footerMove: ProposalWorkflowFooterMove | null;
  onBackToRegister: () => void;
  onBackToHub: () => void;
  onRunFooterMove: () => void;
  onRunCurrentMove: () => void;
}) {
  if (activeStep !== "hub") {
    return (
      <>
        <TerasActionButton
          data-proposal-workflow-action="return-to-hub"
          onClick={onBackToHub}
          emphasis="secondary"
        >
          Back to Hub
        </TerasActionButton>
        {footerMove ? (
          <TerasActionButton
            data-proposal-workflow-action={footerMove.action}
            disabled={footerMove.disabled}
            onClick={onRunFooterMove}
            emphasis={footerMove.emphasis ?? "primary"}
            tone={footerMove.tone === "danger" ? "danger" : "accent"}
          >
            {footerMove.label}
          </TerasActionButton>
        ) : null}
      </>
    );
  }

  return (
    <>
      <TerasActionButton onClick={onBackToRegister} emphasis="secondary">
        Back to Register
      </TerasActionButton>
      <TerasActionButton
        data-proposal-hub-primary-action="true"
        onClick={onRunCurrentMove}
        emphasis="primary"
      >
        {currentMove.buttonLabel}
      </TerasActionButton>
    </>
  );
}
