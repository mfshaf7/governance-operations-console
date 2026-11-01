"use client";
import { SavedWorkBoundary, SavedWorkStatus } from "@/console-integration/saved-work/saved-work-boundary";
import { normalizeOrchestrationDefinitionDraft } from "../../../local-runtime/definition-design/definition-draft-store.ts";

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
  definitionDesignDraftId,
} from "./definition-design-view-model.ts";
import { DefinitionDefineStep } from "./steps/define-step.tsx";
import { DefinitionQualifyStep } from "./steps/qualify-step.tsx";
import { DefinitionReviewRequestStep } from "./steps/review-request-step.tsx";
import { DefinitionDesignSupport } from "./support/definition-design-support.tsx";
import { useDefinitionDesignController } from "./use-definition-design-controller.ts";

type DefinitionWorkflowProps = { onClose: () => void; record: OrchestrationDefinitionRecord | null };
export function DefinitionDesignWorkflow(props: DefinitionWorkflowProps) {
  return <SavedWorkBoundary storageKey={`orchestration-definition-design:${definitionDesignDraftId(props.record)}:v1`} onClose={props.onClose} normalize={normalizeOrchestrationDefinitionDraft}>
    <DefinitionDesignWorkflowBody {...props}/>
  </SavedWorkBoundary>;
}

function DefinitionDesignWorkflowBody({
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
                ? "Record Draft Request"
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
        description="Decide whether restart-safe execution is needed, then draft its contract. Recording a request here does not submit Delivery work or deploy a workflow."
        footer={<><SavedWorkStatus/>{footer}</>}
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
        description="This draft has edits. Check the saved-work status before leaving: server-saved work can be recovered across browsers; browser-only work stays on this browser."
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
