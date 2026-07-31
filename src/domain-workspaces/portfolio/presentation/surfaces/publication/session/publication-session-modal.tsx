"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasWizardFooter,
  TerasWizardModal,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import type {
  ProductPublicationDecisionApplyResult,
  ProductPublicationDecisionReceipt,
} from "../../../../work-model/publication/product-publication-decision-types.ts";
import {
  productPublicationRecordDescription,
  productPublicationRecordName,
} from "../publication-view-model.ts";
import { ProductPublicationChecksStep } from "./publication-checks-step.tsx";
import { ProductPublicationDecisionStep } from "./publication-decision-step.tsx";
import { ProductPublicationResultStep } from "./publication-result-step.tsx";
import {
  initialProductPublicationDraft,
  productPublicationDecisionSubmission,
  productPublicationDecisionValidation,
  productPublicationDraftKey,
  productPublicationSessionStatus,
  productPublicationSessionSteps,
  type ProductPublicationDecisionSubmitHandler,
  type ProductPublicationSessionDraft,
  type ProductPublicationSessionStepId,
} from "./publication-session-view-model.ts";
import { ProductPublicationSupportPanels } from "./publication-support-panels.tsx";
import type { ProductPortfolioRouteResolution } from "../../../routing/product-portfolio-route-model.ts";

export function ProductPublicationSessionModal({
  decidedByRef,
  initialReceipt = null,
  onApplyDecision,
  onClose,
  onOpenRoute,
  onOpenProduct,
  record,
  resolveRoute,
}: {
  decidedByRef: string;
  initialReceipt?: ProductPublicationDecisionReceipt | null;
  onApplyDecision: ProductPublicationDecisionSubmitHandler;
  onClose: () => void;
  onOpenRoute: (routeRef: string) => boolean;
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
  record: ProductPortfolioScenarioProjection | null;
  resolveRoute: (routeRef: string) => ProductPortfolioRouteResolution;
}) {
  const [activeStep, setActiveStep] =
    useState<ProductPublicationSessionStepId>("checks");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedResult, setAppliedResult] =
    useState<ProductPublicationDecisionApplyResult | null>(null);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [draft, setDraft] = useState<ProductPublicationSessionDraft | null>(null);

  useEffect(() => {
    if (!record) {
      setDraft(null);
      return;
    }

    setActiveStep(initialReceipt ? "result" : "checks");
    setApplyError(null);
    setApplying(false);
    setAppliedResult(null);
    setCloseGuardOpen(false);
    setDraft(initialProductPublicationDraft(record));
  }, [initialReceipt, record]);

  if (!record || !draft) {
    return null;
  }

  const activeDraft = draft;
  const activeRecord = record;
  const receipt = appliedResult?.receipt ?? initialReceipt;
  const resultEntry =
    appliedResult?.projection.entry ?? activeRecord.projection.entry;
  const sourceDraft = initialProductPublicationDraft(activeRecord);
  const draftDirty =
    receipt === null &&
    productPublicationDraftKey(activeDraft) !==
      productPublicationDraftKey(sourceDraft);
  const validation = productPublicationDecisionValidation(
    activeRecord,
    activeDraft,
  );
  const status = productPublicationSessionStatus(activeRecord, receipt);
  const steps = productPublicationSessionSteps({
    activeStep,
    receipt,
    record: activeRecord,
  });
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);
  const previousStep =
    activeStepIndex > 0 ? (steps[activeStepIndex - 1] ?? null) : null;

  function updateDraft(patch: Partial<ProductPublicationSessionDraft>) {
    setApplyError(null);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function requestClose() {
    if (applying) {
      return;
    }
    if (draftDirty) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  async function applyDecision() {
    if (!validation.allowed) {
      return;
    }

    setApplying(true);
    try {
      const result = await onApplyDecision(
        productPublicationDecisionSubmission({
          decidedAt: new Date().toISOString(),
          decidedByRef,
          draft: activeDraft,
          record: activeRecord,
        }),
      );
      setApplyError(null);
      setAppliedResult(result);
      setActiveStep("result");
    } catch (error) {
      setApplyError(
        error instanceof Error
          ? error.message
          : "The publication decision could not be applied.",
      );
    } finally {
      setApplying(false);
    }
  }

  function selectStep(stepId: string) {
    const step = steps.find((candidate) => candidate.id === stepId);
    if (step?.available === false) return;

    setActiveStep(stepId as ProductPublicationSessionStepId);
  }

  return (
    <>
      <TerasWizardModal
        activeStepId={activeStep}
        description="Review source-backed product requirements, choose one controlled outcome, and record a prototype-local receipt."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "decision"
                ? {
                    dataAction: "apply-product-publication",
                    disabled: applying || !validation.allowed,
                    label: applying ? "Applying..." : "Apply Decision",
                    onClick: applyDecision,
                    tone: draft.decision === "publish" ? "accent" : "danger",
                    emphasis: "primary",
                  }
                : undefined
            }
            back={{
              label:
                activeStep === "result" || previousStep === null
                  ? "Back to Publication"
                  : "Back",
              onClick:
                activeStep === "result" || previousStep === null
                  ? requestClose
                  : () =>
                      setActiveStep(
                        previousStep.id as ProductPublicationSessionStepId,
                      ),
              emphasis: "secondary",
            }}
            finish={
              activeStep === "result" && resultEntry
                ? {
                    dataAction: "open-published-product",
                    label: "Open Product",
                    onClick: () => onOpenProduct(resultEntry),
                  }
                : undefined
            }
            next={
              activeStep === "checks"
                ? {
                    dataAction: "review-publication-decision",
                    label: "Next",
                    onClick: () => setActiveStep("decision"),
                  }
                : undefined
            }
          />
        }
        kicker="Product Portfolio"
        onClose={requestClose}
        onStepSelect={selectStep}
        statusLabel={status.label}
        statusTone={status.tone}
        steps={steps}
        subject={{
          detail: productPublicationRecordDescription(record),
          eyebrow: "Selected Candidate",
          title: productPublicationRecordName(record),
        }}
        support={
          <ProductPublicationSupportPanels
            activeStep={activeStep}
            applyError={applyError}
            draft={draft}
            onOpenRoute={onOpenRoute}
            receipt={receipt}
            record={record}
            resolveRoute={resolveRoute}
          />
        }
        surfaceId="product-portfolio-publication"
        title="Product Publication"
      >
        {activeStep === "checks" ? (
          <ProductPublicationChecksStep record={record} />
        ) : activeStep === "decision" ? (
          <ProductPublicationDecisionStep
            draft={draft}
            onDraftChange={updateDraft}
            record={record}
          />
        ) : receipt ? (
          <ProductPublicationResultStep receipt={receipt} />
        ) : null}
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="This publication draft has unrecorded changes. Leaving now will discard the selected outcome and listing fields."
        kicker="Product Publication"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={onClose}
        open={closeGuardOpen}
        title="Close Publication Draft?"
      />
    </>
  );
}
