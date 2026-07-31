"use client";

import {
  TerasDraftCloseGuardDialog,
  TerasWizardFooter,
  TerasWizardModal,
} from "@/teras";

import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import type { OrchestrationDefinitionDesignStage } from "../../../work-model/definition-design/definition-design-types.ts";
import {
  definitionDesignClassificationLabel,
  definitionDesignClassificationTone,
  definitionDesignSubject,
} from "./definition-design-view-model.ts";
import { DefinitionDefineStep } from "./steps/define-step.tsx";
import { DefinitionQualifyStep } from "./steps/qualify-step.tsx";
import { DefinitionReviewRequestStep } from "./steps/review-request-step.tsx";
import { DefinitionDesignSupport } from "./support/definition-design-support.tsx";
import { useDefinitionDesignController } from "./use-definition-design-controller.ts";

export function DefinitionDesignWorkflow({
  onClose,
  record,
}: {
  onClose: () => void;
  record: OrchestrationDefinitionRecord | null;
}) {
  const controller = useDefinitionDesignController({ onClose, record });
  const { draft, readiness, receipt } = controller;
  const durable = draft.qualification.classification === "durable-candidate";
  const reviewReady = durable
    ? readiness.canRequestImplementation
    : readiness.canRecordQualification;
  const subject = definitionDesignSubject(draft, record);
  const classificationTone = definitionDesignClassificationTone(
    draft.qualification.classification,
  );

  const footer = receipt ? (
    <TerasWizardFooter
      finish={{
        label: "Close Workflow",
        onClick: controller.finish,
        emphasis: "secondary",
      }}
    />
  ) : (
    <TerasWizardFooter
      apply={
        draft.activeStage === "review-request"
          ? {
              disabled: !reviewReady,
              label: durable
                ? "Request Implementation"
                : "Record Qualification",
              onClick: controller.recordOutcome,
              emphasis: "primary",
            }
          : undefined
      }
      back={{
        label: draft.activeStage === "qualify" ? "Back to Definitions" : "Back",
        onClick:
          draft.activeStage === "qualify"
            ? controller.requestClose
            : controller.previousStage,
        emphasis: "secondary",
      }}
      next={
        draft.activeStage !== "review-request"
          ? {
              disabled:
                draft.activeStage === "qualify" &&
                !readiness.canAdvanceFromQualify,
              label:
                draft.activeStage === "qualify" && !durable
                  ? "Review Decision"
                  : "Next",
              onClick: controller.nextStage,
            }
          : undefined
      }
    />
  );

  return (
    <>
      <TerasWizardModal
        activeStepId={draft.activeStage}
        description="Qualify the execution boundary, define durable behavior when justified, and record one implementation route without activating runtime source."
        footer={footer}
        kicker="Orchestration Workflow"
        onClose={controller.requestClose}
        onStepSelect={(stage) =>
          controller.setStage(stage as OrchestrationDefinitionDesignStage)
        }
        statusLabel={
          receipt
            ? "Recorded"
            : definitionDesignClassificationLabel(
                draft.qualification.classification,
              )
        }
        statusTone={receipt ? "ok" : classificationTone}
        steps={controller.workflowSteps}
        subject={subject}
        support={
          <DefinitionDesignSupport
            advisor={controller.advisor}
            draft={draft}
            editDraft={controller.editDraft}
            findings={readiness.findings}
            receipt={receipt}
            setSection={controller.setSection}
          />
        }
        surfaceId="orchestration-definition-design"
        title="Design Orchestration"
      >
        {draft.activeStage === "qualify" ? (
          <DefinitionQualifyStep
            draft={draft.qualification}
            editDraft={controller.editDraft}
          />
        ) : draft.activeStage === "define" ? (
          <DefinitionDefineStep
            addExecutionNode={controller.addExecutionNode}
            draft={draft}
            editDraft={controller.editDraft}
            findings={readiness.findings}
            removeSelectedExecutionNode={controller.removeSelectedExecutionNode}
            selectedNodeId={controller.selectedNodeId}
            setSection={controller.setSection}
            setSelectedNodeId={controller.setSelectedNodeId}
          />
        ) : (
          <DefinitionReviewRequestStep
            actionError={controller.actionError}
            draft={draft}
            navigateToFinding={controller.navigateToFinding}
            receipt={receipt}
          />
        )}
      </TerasWizardModal>

      <TerasDraftCloseGuardDialog
        description="This definition draft has local edits. The draft is already saved in prototype-local continuity state and will remain available when you return."
        kicker="Design Orchestration"
        leaveLabel="Leave Workflow"
        onKeepEditing={controller.closeGuard.close}
        onLeave={controller.closeGuard.leaveWithSavedDraft}
        open={controller.closeGuard.open}
        title="Leave Definition Draft?"
      />
    </>
  );
}
