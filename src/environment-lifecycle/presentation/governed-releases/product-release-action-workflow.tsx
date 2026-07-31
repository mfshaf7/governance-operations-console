"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasList,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusItem,
  TerasWizardFooter,
  TerasWizardModal,
  type TerasWizardStep,
} from "@/teras";

import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command";
import type {
  ProductReleaseCapability,
  ProductReleaseOperationCapability,
  ProductReleaseStep,
} from "../../model/product-release-capability";
import {
  createProductReleaseActionDraft,
  isProductReleaseActionDraftDirty,
  validateProductReleaseActionDraft,
} from "../../work-model/product-release/product-release-action-draft";
import {
  environmentProductSubjectRef,
} from "../../work-model/commands/environment-lifecycle-command-factory";
import {
  EnvironmentOperationPanel,
} from "../operations/environment-operation-panel";
import {
  buildProductReleaseFieldChecks,
  ProductReleaseActionDetailsStep,
} from "./release-action/product-release-action-details-step";
import {
  ProductReleaseActionReviewStep,
} from "./release-action/product-release-action-review-step";

type ReleaseWorkflowStep = "details" | "review";

export function ProductReleaseActionWorkflow({
  onBack,
  onDirtyChange,
  onRetryOperation,
  onSubmit,
  operation,
  operations,
  product,
  receipts,
  releaseStep,
}: {
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onSubmit: (
    input: Readonly<Record<string, string>>,
  ) => Promise<EnvironmentLifecycleOperation>;
  operation: ProductReleaseOperationCapability;
  operations: readonly EnvironmentLifecycleOperation[];
  product: ProductReleaseCapability;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  releaseStep: ProductReleaseStep;
}) {
  const [draft, setDraft] = useState(() =>
    createProductReleaseActionDraft(operation),
  );
  const [exitGuardOpen, setExitGuardOpen] = useState(false);
  const [failedCorrelationId, setFailedCorrelationId] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<ReleaseWorkflowStep>("details");
  const dirty = isProductReleaseActionDraftDirty(draft, operation);
  const validationErrors = validateProductReleaseActionDraft(
    draft,
    operation,
  );
  const detailsReady = validationErrors.length === 0;
  const fieldChecks = buildProductReleaseFieldChecks(draft, operation);
  const workflowSteps: TerasWizardStep[] = [
    {
      available: true,
      id: "details",
      label: "Action Details",
      stateLabel: detailsReady ? "Ready" : "Current",
      tone: detailsReady ? "ok" : "warn",
    },
    {
      available: detailsReady,
      id: "review",
      label: "Review Request",
      stateLabel: !detailsReady
        ? "Locked"
        : failedCorrelationId
          ? "Failed"
          : "Ready",
      tone: failedCorrelationId
        ? "danger"
        : detailsReady
          ? "ok"
          : "muted",
    },
  ];

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function updateValue(fieldId: string, value: string) {
    setDraft((current) => ({
      values: {
        ...current.values,
        [fieldId]: value,
      },
    }));
  }

  function exitWorkflow() {
    if (dirty) {
      setExitGuardOpen(true);
      return;
    }

    onBack();
  }

  function discardAndExit() {
    setDraft(createProductReleaseActionDraft(operation));
    setExitGuardOpen(false);
    onDirtyChange(false);
    onBack();
  }

  function completeWorkflow() {
    setDraft(createProductReleaseActionDraft(operation));
    onDirtyChange(false);
    onBack();
  }

  function selectStep(stepId: string) {
    const selectedStep = workflowSteps.find(
      (candidate) => candidate.id === stepId,
    );
    if (selectedStep?.available === false) return;
    if (stepId === step) return;

    setFailedCorrelationId(null);
    setStep(stepId as ReleaseWorkflowStep);
  }

  async function submitAction() {
    if (validationErrors.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const submittedOperation = await onSubmit(draft.values);
      if (submittedOperation.state !== "succeeded") {
        setFailedCorrelationId(submittedOperation.correlationId);
        return;
      }

      completeWorkflow();
    } finally {
      setSubmitting(false);
    }
  }

  const support =
    step === "details" ? (
      <TerasPanel
        fit="fill"
        frame="padded"
        tone={detailsReady ? "ok" : "warn"}
        treatment="rail"
      >
        <TerasPanelHeader
          description="Complete the declared fields before reviewing the request."
          kicker="Input Readiness"
          statusLabel={detailsReady ? "Ready" : "Incomplete"}
          statusTone={detailsReady ? "ok" : "warn"}
          title="Action check"
        />
        <TerasList ariaLabel="Product release action field checks">
          {fieldChecks.map((check, index) => (
            <TerasStatusItem
              detail={check.detail}
              index={String(index + 1).padStart(2, "0")}
              key={check.id}
              label={check.label}
              status={check.status}
              tone={check.tone}
            />
          ))}
        </TerasList>
      </TerasPanel>
    ) : failedCorrelationId ? (
      <EnvironmentOperationPanel
        correlationId={failedCorrelationId}
        description="The product release request did not complete."
        onReturnToDraft={() => {
          setFailedCorrelationId(null);
          setStep("details");
        }}
        onRetry={onRetryOperation}
        onRetrySucceeded={completeWorkflow}
        operations={operations}
        receipts={receipts}
        subjectRef={environmentProductSubjectRef(product.productId)}
        title="Release request result"
      />
    ) : (
      <TerasPanel
        fit="fill"
        frame="padded"
        tone={operation.adapter.available ? "ok" : "danger"}
        treatment="rail"
      >
        <TerasPanelHeader
          description="Validated request boundary for the declared prototype-local adapter."
          kicker="Execution Boundary"
          statusLabel={
            operation.adapter.available ? "Ready" : "Unavailable"
          }
          statusTone={operation.adapter.available ? "ok" : "danger"}
          title="Release execution"
        />
        <TerasList ariaLabel="Product release execution checks">
          <TerasStatusItem
            detail="Every required field declared by this operation is complete."
            index="01"
            label="Action input"
            status={detailsReady ? "Ready" : "Required"}
            tone={detailsReady ? "ok" : "warn"}
          />
          <TerasStatusItem
            detail="The canonical source step and capability route are preserved."
            index="02"
            label="Source contract"
            status="Ready"
            tone="ok"
          />
          <TerasStatusItem
            detail="The adapter records a correlated operation and receipt."
            index="03"
            label="Execution adapter"
            status={
              operation.adapter.available ? "Ready" : "Unavailable"
            }
            tone={operation.adapter.available ? "ok" : "danger"}
          />
        </TerasList>
      </TerasPanel>
    );

  return (
    <>
      <TerasWizardModal
        activeStepId={step}
        description={operation.description}
        footer={
          <TerasWizardFooter
            apply={
              step === "review" && !failedCorrelationId
                ? {
                    dataAction: operation.action,
                    disabled:
                      !detailsReady ||
                      !operation.adapter.available ||
                      submitting,
                    label: submitting ? "Submitting" : "Submit Action",
                    onClick: () => void submitAction(),
                  }
                : undefined
            }
            back={{
              emphasis: "secondary",
              label:
                failedCorrelationId || step === "details"
                  ? "Back to Dashboard"
                  : "Back",
              onClick:
                failedCorrelationId || step === "details"
                  ? exitWorkflow
                  : () => {
                      setFailedCorrelationId(null);
                      setStep("details");
                    },
            }}
            next={
              step === "details"
                ? {
                    disabled: !detailsReady,
                    label: "Review Request",
                    onClick: () => setStep("review"),
                  }
                : undefined
            }
          />
        }
        kicker="Governed Release"
        onClose={exitWorkflow}
        onStepSelect={selectStep}
        statusLabel={
          failedCorrelationId
            ? "Failed"
            : detailsReady
              ? "Ready"
              : "Draft"
        }
        statusTone={
          failedCorrelationId
            ? "danger"
            : detailsReady
              ? "ok"
              : "warn"
        }
        steps={workflowSteps}
        subject={{
          detail: releaseStep.label,
          eyebrow: "Selected Product",
          title: product.productLabel,
        }}
        support={support}
        surfaceId="product-release-action"
        title="Product Release Action"
      >
        {step === "details" ? (
          <ProductReleaseActionDetailsStep
            draft={draft}
            onUpdateValue={updateValue}
            operation={operation}
          />
        ) : (
          <ProductReleaseActionReviewStep
            draft={draft}
            operation={operation}
            product={product}
            releaseStep={releaseStep}
          />
        )}
      </TerasWizardModal>

      <TerasDraftCloseGuardDialog
        description="This product release request has unsubmitted local changes."
        kicker="Governed Release"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setExitGuardOpen(false)}
        onLeave={discardAndExit}
        open={exitGuardOpen}
        title="Discard Release Request?"
      />
    </>
  );
}
