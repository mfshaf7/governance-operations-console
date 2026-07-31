"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasList,
  TerasMetadataList,
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
  ProductRuntimeLifecycleCapability,
} from "../../model/product-release-capability";
import {
  createProductRuntimeLifecycleDraft,
  isProductRuntimeLifecycleDraftDirty,
  validateProductRuntimeLifecycleDraft,
  type ProductRuntimeLifecycleDraft,
} from "../../work-model/product-release/product-release-action-draft";
import {
  environmentProductSubjectRef,
} from "../../work-model/commands/environment-lifecycle-command-factory";
import {
  EnvironmentOperationPanel,
} from "../operations/environment-operation-panel";
import {
  productRuntimeLifecycleTone,
} from "./governed-releases-labels";
import {
  buildProductRuntimeLifecycleChecks,
  ProductRuntimeLifecycleIntentStep,
} from "./runtime-lifecycle/product-runtime-lifecycle-intent-step";
import {
  ProductRuntimeLifecycleReviewStep,
} from "./runtime-lifecycle/product-runtime-lifecycle-review-step";

type RuntimeLifecycleWorkflowStep = "intent" | "review";

export function ProductRuntimeLifecycleWorkflow({
  lifecycle,
  onBack,
  onDirtyChange,
  onRetryOperation,
  onSubmit,
  operations,
  product,
  receipts,
}: {
  lifecycle: ProductRuntimeLifecycleCapability;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onSubmit: (request: Readonly<{
    incidentRef: string | null;
    reason: string;
    targetState: string;
  }>) => Promise<EnvironmentLifecycleOperation>;
  operations: readonly EnvironmentLifecycleOperation[];
  product: ProductReleaseCapability;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const [draft, setDraft] = useState(
    createProductRuntimeLifecycleDraft,
  );
  const [exitGuardOpen, setExitGuardOpen] = useState(false);
  const [failedCorrelationId, setFailedCorrelationId] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] =
    useState<RuntimeLifecycleWorkflowStep>("intent");
  const dirty = isProductRuntimeLifecycleDraftDirty(draft);
  const validationErrors = validateProductRuntimeLifecycleDraft(
    draft,
    lifecycle,
  );
  const detailsReady = validationErrors.length === 0;
  const currentState =
    lifecycle.states.find(
      (state) => state.id === lifecycle.currentState,
    ) ?? null;
  const checks = buildProductRuntimeLifecycleChecks(draft, lifecycle);
  const workflowSteps: TerasWizardStep[] = [
    {
      available: true,
      id: "intent",
      label: "Lifecycle Intent",
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

  function updateDraft(
    update: Partial<ProductRuntimeLifecycleDraft>,
  ) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function exitWorkflow() {
    if (dirty) {
      setExitGuardOpen(true);
      return;
    }

    onBack();
  }

  function discardAndExit() {
    setDraft(createProductRuntimeLifecycleDraft());
    setExitGuardOpen(false);
    onDirtyChange(false);
    onBack();
  }

  function completeWorkflow() {
    setDraft(createProductRuntimeLifecycleDraft());
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
    setStep(stepId as RuntimeLifecycleWorkflowStep);
  }

  async function submitLifecycle() {
    if (validationErrors.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const submittedOperation = await onSubmit({
        incidentRef: draft.incidentRef.trim() || null,
        reason: draft.reason.trim(),
        targetState: draft.targetState,
      });
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
    step === "intent" ? (
      <TerasPanel
        fit="fill"
        frame="padded"
        tone={detailsReady ? "ok" : "warn"}
        treatment="rail"
      >
        <TerasPanelHeader
          description="The requested state must stay inside the declared product lifecycle contract."
          kicker="Transition Readiness"
          statusLabel={detailsReady ? "Ready" : "Incomplete"}
          statusTone={detailsReady ? "ok" : "warn"}
          title="Lifecycle check"
        />
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Product", value: product.productLabel },
            {
              label: "Current state",
              tone: productRuntimeLifecycleTone(currentState),
              value: currentState?.label ?? lifecycle.currentState,
            },
            {
              label: "Lifecycle source",
              value: lifecycle.sourceRef,
            },
            {
              label: "Action adapter",
              value: lifecycle.adapter.ref ?? "Adapter unavailable",
            },
          ]}
          topOffset="compact"
        />
        <TerasList ariaLabel="Runtime lifecycle intent checks">
          {checks.map((check, index) => (
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
        description="The runtime lifecycle request did not complete."
        onReturnToDraft={() => {
          setFailedCorrelationId(null);
          setStep("intent");
        }}
        onRetry={onRetryOperation}
        onRetrySucceeded={completeWorkflow}
        operations={operations}
        receipts={receipts}
        subjectRef={environmentProductSubjectRef(product.productId)}
        title="Lifecycle request result"
      />
    ) : (
      <TerasPanel
        fit="fill"
        frame="padded"
        tone={lifecycle.adapter.available ? "ok" : "danger"}
        treatment="rail"
      >
        <TerasPanelHeader
          description="Validated transition boundary for the declared prototype-local adapter."
          kicker="Execution Boundary"
          statusLabel={
            lifecycle.adapter.available ? "Ready" : "Unavailable"
          }
          statusTone={lifecycle.adapter.available ? "ok" : "danger"}
          title="Lifecycle execution"
        />
        <TerasList ariaLabel="Runtime lifecycle execution checks">
          <TerasStatusItem
            detail="Target state, reason, and incident context satisfy the contract."
            index="01"
            label="Lifecycle input"
            status={detailsReady ? "Ready" : "Required"}
            tone={detailsReady ? "ok" : "warn"}
          />
          <TerasStatusItem
            detail="The adapter records a correlated lifecycle receipt."
            index="02"
            label="Execution adapter"
            status={
              lifecycle.adapter.available ? "Ready" : "Unavailable"
            }
            tone={lifecycle.adapter.available ? "ok" : "danger"}
          />
        </TerasList>
      </TerasPanel>
    );

  return (
    <>
      <TerasWizardModal
        activeStepId={step}
        description="Prepare a product-scoped runtime lifecycle request without changing release progression."
        footer={
          <TerasWizardFooter
            apply={
              step === "review" && !failedCorrelationId
                ? {
                    dataAction: "change-runtime-lifecycle",
                    disabled:
                      !detailsReady ||
                      !lifecycle.adapter.available ||
                      submitting,
                    label: submitting
                      ? "Applying"
                      : "Apply Lifecycle",
                    onClick: () => void submitLifecycle(),
                  }
                : undefined
            }
            back={{
              emphasis: "secondary",
              label:
                failedCorrelationId || step === "intent"
                  ? "Back to Dashboard"
                  : "Back",
              onClick:
                failedCorrelationId || step === "intent"
                  ? exitWorkflow
                  : () => {
                      setFailedCorrelationId(null);
                      setStep("intent");
                    },
            }}
            next={
              step === "intent"
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
          detail: currentState?.description,
          eyebrow: "Selected Product",
          title: product.productLabel,
        }}
        support={support}
        surfaceId="product-runtime-lifecycle"
        title="Runtime Lifecycle Change"
      >
        {step === "intent" ? (
          <ProductRuntimeLifecycleIntentStep
            draft={draft}
            lifecycle={lifecycle}
            onChange={updateDraft}
          />
        ) : (
          <ProductRuntimeLifecycleReviewStep
            draft={draft}
            lifecycle={lifecycle}
            product={product}
          />
        )}
      </TerasWizardModal>

      <TerasDraftCloseGuardDialog
        description="This runtime lifecycle request has unsubmitted local changes."
        kicker="Governed Release"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setExitGuardOpen(false)}
        onLeave={discardAndExit}
        open={exitGuardOpen}
        title="Discard Lifecycle Request?"
      />
    </>
  );
}
