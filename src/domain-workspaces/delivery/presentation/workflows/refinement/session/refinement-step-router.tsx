"use client";

import { useState } from "react";

import { TerasContentFrame,TerasPanel,TerasPanelHeader } from "@/teras";
import { DeliveryWorkDesignHandoffEvidenceDialog } from "../../shared/package-actions/package-handoff-evidence.tsx";
import {DeliveryHistoryDialog} from "../../shared/history/delivery-history-dialog.tsx";

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
  readOnly = false,
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

  if ((!packet || !metadataWorkbenchSummary) && !readOnly) {
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
  const currentMove = metadataWorkbenchSummary ? refinementCurrentMove({
    activeReceipt,
    activeStep,
    hubAction,
    metadataWorkbenchSummary,
    refinementBlocked,
  }) : {title:"Retained Refinement inspection",description:"The current authoring packet is unavailable. Original history is readable independently; no handoff or completion is inferred.",tone:"warn" as const};
  const openHandoffDialog = () => setHandoffDialogOpen(true);

  return (
    <>
      <TerasContentFrame fill variant="standard">
        {activeStep !== "hub" ? (
          <RefinementProgressPanel
            readOnly={readOnly}
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
            readOnly={readOnly}
            activeReceipt={activeReceipt}
            deliveryPackage={deliveryPackage}
            hubAction={hubAction}
            metadataWorkbenchSummary={metadataWorkbenchSummary}
            onRunHubAction={runHubAction}
            onSelectStep={setActiveStep}
            packet={packet}
            progressActiveStep={progressActiveStep}
          />
        ) : (!packet || !metadataWorkbenchSummary) && activeStep !== "receipt" ? (
          <TerasPanel frame="padded" treatment="state" tone="warn"><TerasPanelHeader kicker="Current packet" title="No current Refinement packet" description="This section requires the original packet data. Use History to inspect retained runs and item activity; this absence does not mean the item has no history." statusLabel="unavailable" statusTone="warn"/></TerasPanel>
        ) : activeStep === "metadata_draft" && packet ? (
          <RefinementMetadataDraftStep
            readOnly={readOnly}
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
        ) : activeStep === "readiness_review" && packet && metadataWorkbenchSummary ? (
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
        ) : activeStep === "apply_refinement" && packet ? (
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
            liveHistory={advisorMode === "live"}
            activeReceipt={activeReceipt}
            deliveryPackage={deliveryPackage}
            onOpenHandoff={openHandoffDialog}
            packet={packet}
          />
        )}
      </TerasContentFrame>

      {packet ? <DeliveryWorkDesignHandoffEvidenceDialog
        deliveryPackage={sourceWorkDesignPackage ?? deliveryPackage}
        handoffReceiptId={packet.handoff.source_work_design_receipt_id}
        open={handoffDialogOpen}
        onClose={() => setHandoffDialogOpen(false)}
      /> : <DeliveryHistoryDialog deliveryId={handoffDialogOpen ? deliveryPackage.delivery_package_id : null} focus="work_design" onClose={()=>setHandoffDialogOpen(false)}/>}
    </>
  );
}
