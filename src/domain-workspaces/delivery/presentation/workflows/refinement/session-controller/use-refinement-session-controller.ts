"use client";

import { useMemo, useState } from "react";

import {
  getDeliveryEffectivePackageProjection,
  type DeliveryPackageSummary,
} from "../../../../read-model/index.ts";
import {
  createLocalDeliveryBlockerDispositionReceipt,
  createLocalRefinementApplyReceipt,
  recordLocalDeliveryRefinementApply,
} from "../../../../local-runtime/index.ts";
import type {
  DeliveryBlockerIssue,
  DeliveryBlockerRecoveryAction,
} from "../../shared/blocker-recovery/index.ts";

import { refinementMetadataWorkbenchSummary } from "../view-model/refinement-metadata-model.ts";
import {
  refinementCanApplyWithMetadataReview,
  refinementEffectiveOpenGateCount,
  refinementOpenGateCount,
} from "../view-model/refinement-gate-model.ts";
import {
  refinementHubAction,
  refinementIsBlocked,
} from "../view-model/refinement-hub-model.ts";
import { refinementPacketForPackage } from "../view-model/refinement-packet-model.ts";
import { refinementSessionShellCopy } from "../view-model/refinement-shell-view-model.ts";
import { useRefinementSessionState } from "./use-refinement-session-state.ts";

type UseRefinementSessionControllerParams = {
  deliveryPackage: DeliveryPackageSummary;
  onClose: () => void;
  sourceWorkDesignPackage: DeliveryPackageSummary | null;
};

export function useRefinementSessionController({
  deliveryPackage,
  onClose,
  sourceWorkDesignPackage,
}: UseRefinementSessionControllerParams) {
  const [blockerRecoveryOpen, setBlockerRecoveryOpen] = useState(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const packet = refinementPacketForPackage(deliveryPackage);
  const sessionState = useRefinementSessionState(
    deliveryPackage.delivery_package_id,
    packet,
  );
  const {
    activeStep,
    activeReceipt,
    hasUnappliedSessionChanges,
    metadataDraftValues,
    metadataFieldResolutions,
    setActiveStep,
    setLocalReceipt,
  } = sessionState;
  const metadataWorkbenchSummary = packet
    ? refinementMetadataWorkbenchSummary({
        packet,
        resolutions: metadataFieldResolutions,
      })
    : null;
  const packageProjection = getDeliveryEffectivePackageProjection(
    deliveryPackage,
    { refinementReceipt: activeReceipt },
  );
  const refinementBlocked = packet
    ? refinementIsBlocked({
        deliveryPackage,
        packet,
        refinementReceipt: activeReceipt,
      })
    : false;
  const canApply = packet
    ? refinementCanApplyWithMetadataReview({
        metadataReady: metadataWorkbenchSummary?.ready ?? false,
        packet,
      }) &&
      !refinementBlocked &&
      !activeReceipt
    : false;
  const openGateCount = packet
    ? refinementEffectiveOpenGateCount({
        metadataReady: metadataWorkbenchSummary?.ready ?? false,
        packet,
      })
    : 1;
  const rawOpenGateCount = packet ? refinementOpenGateCount(packet) : 1;
  const hasDraftReadyGates =
    Boolean(metadataWorkbenchSummary?.ready) &&
    rawOpenGateCount > openGateCount;
  const baseHubAction = packet
    ? refinementHubAction({
        activeReceipt,
        deliveryPackage,
        packet,
      })
    : null;
  const metadataNeedsWork =
    packet &&
    metadataWorkbenchSummary &&
    !metadataWorkbenchSummary.ready &&
    !refinementBlocked &&
    !activeReceipt &&
    packageProjection.posture !== "Deferred" &&
    packet.status !== "applied" &&
    packet.status !== "blocked" &&
    packet.status !== "stale" &&
    !packet.receipt;
  const hubAction = metadataNeedsWork
    ? {
        buttonLabel: "Open Metadata Workbench",
        description:
          metadataWorkbenchSummary.blockedCount > 0
            ? `${metadataWorkbenchSummary.blockedCount} item-scoped metadata target cannot be repaired here. Review the blocker route before apply.`
            : `${metadataWorkbenchSummary.openCount} item-scoped metadata target needs operator repair or acceptance before readiness review.`,
        step: "metadata_draft" as const,
        title: metadataWorkbenchSummary.title,
        tone: metadataWorkbenchSummary.tone,
      }
    : hasDraftReadyGates &&
        packet &&
        !activeReceipt &&
        !packet.receipt &&
        packet.status !== "applied"
      ? {
          buttonLabel: "Review Readiness",
          description:
            "Metadata decisions are draft-ready. Review AI-drafted and repaired values before opening the apply plan.",
          step: "readiness_review" as const,
          title: "Ready For Readiness Review",
          tone: "warn" as const,
        }
      : canApply &&
          packet &&
          !activeReceipt &&
          !packet.receipt &&
          packet.status !== "applied"
        ? {
            buttonLabel: "Review Apply Plan",
            description:
              "Metadata decisions are ready for operator apply review. Inspect OOS operations before submitting Refinement.",
            step: "apply_refinement" as const,
            title: "Ready For Apply Review",
            tone: "warn" as const,
          }
        : baseHubAction;
  const rawProgressActiveStep =
    activeStep === "hub"
      ? (hubAction?.step ?? packet?.active_step ?? "metadata_draft")
      : activeStep;
  const progressActiveStep =
    rawProgressActiveStep === "receipt"
      ? "apply_refinement"
      : rawProgressActiveStep;
  const shellWidth =
    activeStep === "metadata_draft"
      ? ("large" as const)
      : activeStep === "hub"
        ? ("medium" as const)
        : ("large" as const);
  const shellCopy = refinementSessionShellCopy(activeStep, {
    receiptRecorded: Boolean(activeReceipt),
  });
  const advisorTranscript = useMemo(
    () => [
      {
        id: "refinement-advisor-1",
        role: "advisor" as const,
        text: packet
          ? `I am locked to ${deliveryPackage.display_name}. Ask about the selected metadata field and I can draft a local value from this Refinement packet for operator review. Mock only; I cannot apply backend changes.`
          : "No Refinement packet exists for this package yet.",
      },
    ],
    [deliveryPackage.display_name, packet],
  );

  function applyRefinement() {
    if (!packet || !canApply) {
      return;
    }

    const receipt = createLocalRefinementApplyReceipt({
      applyPlan: packet.apply_plan,
      metadataDraftValues,
      metadataFieldResolutions,
      packetId: packet.packet_id,
      sourceWorkDesignReceiptId: packet.handoff.source_work_design_receipt_id,
    });

    setLocalReceipt(receipt);
    recordLocalDeliveryRefinementApply({
      deliveryPackage,
      receipt,
    });
    setActiveStep("receipt");
  }

  function recordBlockerDisposition({
    action,
    activeBlockerIssue,
    fallbackJustification,
    justification,
  }: {
    action: DeliveryBlockerRecoveryAction;
    activeBlockerIssue: DeliveryBlockerIssue;
    fallbackJustification: string;
    justification: string;
  }) {
    return createLocalDeliveryBlockerDispositionReceipt({
      action,
      activeBlockerIssue,
      deliveryPackage,
      fallbackJustification,
      justification,
    });
  }

  function requestClose() {
    if (hasUnappliedSessionChanges && !activeReceipt) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  function returnToRegister() {
    onClose();
  }

  function runHubAction() {
    if (!hubAction) {
      return;
    }

    if (hubAction.route === "blocker") {
      setBlockerRecoveryOpen(true);
      return;
    }

    if (hubAction.step) {
      setActiveStep(hubAction.step);
    }
  }

  return {
    advisorTranscript,
    applyRefinement,
    blockerRecoveryOpen,
    canApply,
    closeGuardOpen,
    confirmClose: onClose,
    closeBlockerRecovery: () => setBlockerRecoveryOpen(false),
    closeCloseGuard: () => setCloseGuardOpen(false),
    deliveryPackage,
    hubAction,
    metadataWorkbenchSummary,
    requestClose,
    returnToRegister,
    openGateCount,
    packet,
    progressActiveStep,
    recordBlockerDisposition,
    refinementBlocked,
    runHubAction,
    sessionState,
    shellWidth,
    sourceWorkDesignPackage,
    shellCopy: {
      ...shellCopy,
      kicker: "Refinement Workflow",
    },
  };
}
