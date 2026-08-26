"use client";

import { useState } from "react";

import { TerasContentFrame } from "@/teras";
import { DeliveryWorkDesignHandoffEvidenceDialog } from "../../shared/package-actions/package-handoff-evidence.tsx";

import { refinementCurrentMove } from "../view-model/refinement-current-move.ts";
import { RefinementProgressPanel } from "../shell/refinement-progress-panel.tsx";
import { RefinementHubView } from "../hub/refinement-hub-view.tsx";
import { RefinementApplyView } from "../steps/apply-refinement/refinement-apply-view.tsx";
import { RefinementMetadataDraftStep } from "../steps/metadata-draft/refinement-metadata-draft-step.tsx";
import { RefinementReadinessReviewView } from "../steps/readiness-review/refinement-readiness-review-view.tsx";
import { RefinementHistoryView } from "../steps/history/refinement-history-view.tsx";
import type { useRefinementSessionController } from "../session-controller/use-refinement-session-controller.ts";

type RefinementStepRouterProps = ReturnType<
  typeof useRefinementSessionController
>;

export function RefinementStepRouter({
  advisorTranscript,
  advisorMode,
  advisorStatus,
  canApply,
  deliveryPackage,
  hubAction,
  metadataWorkbenchSummary,
  packet,
  progressActiveStep,
  requestMetadataAdvice,
  refinementBlocked,
  runtimeError,
  runtimeRun,
  runHubAction,
  sessionState,
  sourceWorkDesignPackage,
}: RefinementStepRouterProps) {
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);

  if (!packet || !metadataWorkbenchSummary) {
    return null;
  }

  const {
    activeReceipt,
    activeStep,
    markMetadataFieldResolutions,
    markMetadataFieldResolution,
    metadataDraftValues,
    metadataFieldResolutions,
    metadataSelectionMode,
    resetMetadataDraftValue,
    resetMetadataDraftValues,
    setActiveStep,
    setMetadataSelectionMode,
    selectedMetadataFieldKey,
    selectedMetadataBulkNodeIds,
    setSelectedMetadataFieldKey,
    toggleMetadataBulkNode,
    updateMetadataDraftValues,
    updateMetadataDraftValue,
  } = sessionState;
  const currentMove = refinementCurrentMove({
    activeReceipt,
    activeStep,
    hubAction,
    metadataWorkbenchSummary,
    refinementBlocked,
  });
  const openHandoffDialog = () => setHandoffDialogOpen(true);

  return (
    <>
      <TerasContentFrame fill variant="standard">
        {activeStep !== "hub" ? (
          <RefinementProgressPanel
            activeReceipt={activeReceipt}
            activeStep={activeStep}
            currentMove={currentMove}
            onSelectStep={setActiveStep}
            packet={packet}
            progressActiveStep={progressActiveStep}
            refinementBlocked={refinementBlocked}
          />
        ) : null}
        {activeStep === "hub" ? (
          <RefinementHubView
            activeReceipt={activeReceipt}
            deliveryPackage={deliveryPackage}
            hubAction={hubAction}
            metadataWorkbenchSummary={metadataWorkbenchSummary}
            onRunHubAction={runHubAction}
            onSelectStep={setActiveStep}
            packet={packet}
            progressActiveStep={progressActiveStep}
          />
        ) : activeStep === "metadata_draft" ? (
          <RefinementMetadataDraftStep
            activeStep={activeStep}
            advisorTranscript={advisorTranscript}
            deliveryPackage={deliveryPackage}
            markMetadataFieldResolution={markMetadataFieldResolution}
            markMetadataFieldResolutions={markMetadataFieldResolutions}
            metadataDraftValues={metadataDraftValues}
            metadataFieldResolutions={metadataFieldResolutions}
            metadataSelectionMode={metadataSelectionMode}
            onOpenHandoff={openHandoffDialog}
            onReviewReadiness={() => setActiveStep("readiness_review")}
            packet={packet}
            requestMetadataAdvice={requestMetadataAdvice}
            resetMetadataDraftValue={resetMetadataDraftValue}
            resetMetadataDraftValues={resetMetadataDraftValues}
            selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
            selectedMetadataFieldKey={selectedMetadataFieldKey}
            runtimeMode={advisorMode}
            runtimeStatus={advisorStatus}
            setMetadataSelectionMode={setMetadataSelectionMode}
            setSelectedMetadataFieldKey={setSelectedMetadataFieldKey}
            toggleMetadataBulkNode={toggleMetadataBulkNode}
            updateMetadataDraftValue={updateMetadataDraftValue}
            updateMetadataDraftValues={updateMetadataDraftValues}
          />
        ) : activeStep === "readiness_review" ? (
          <RefinementReadinessReviewView
            canApply={canApply}
            deliveryPackage={deliveryPackage}
            metadataDraftValues={metadataDraftValues}
            metadataFieldResolutions={metadataFieldResolutions}
            metadataWorkbenchSummary={metadataWorkbenchSummary}
            onOpenApplyPlan={() => setActiveStep("apply_refinement")}
            onOpenHandoff={openHandoffDialog}
            packet={packet}
          />
        ) : activeStep === "apply_refinement" ? (
          <RefinementApplyView
            activeReceipt={activeReceipt}
            canApply={canApply}
            deliveryPackage={deliveryPackage}
            onOpenHandoff={openHandoffDialog}
            packet={packet}
            runtimeError={runtimeError}
            runtimeRun={runtimeRun}
          />
        ) : (
          <RefinementHistoryView
            activeReceipt={activeReceipt}
            deliveryPackage={deliveryPackage}
            onOpenHandoff={openHandoffDialog}
            packet={packet}
          />
        )}
      </TerasContentFrame>

      <DeliveryWorkDesignHandoffEvidenceDialog
        deliveryPackage={sourceWorkDesignPackage ?? null}
        open={handoffDialogOpen}
        onClose={() => setHandoffDialogOpen(false)}
      />
    </>
  );
}
