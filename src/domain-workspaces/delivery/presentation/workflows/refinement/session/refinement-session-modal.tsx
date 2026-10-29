"use client";
import { SavedWorkBoundary, SavedWorkStatus } from "@/console-integration/saved-work/saved-work-boundary";
import { normalizeRefinementPersistedSession } from "../../../../local-runtime/persistence/refinement-session-persistence.ts";

import {
  TerasActionButton,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import { RefinementSessionFooter } from "./refinement-session-footer.tsx";
import { RefinementStepRouter } from "./refinement-step-router.tsx";
import { DeliveryRefinementBlockerRecoveryDialog } from "../support/blocker-recovery/refinement-blocker-recovery-dialog.tsx";
import { RefinementCloseGuardDialog } from "./dialogs/refinement-close-guard-dialog.tsx";
import { useRefinementSessionController } from "../session-controller/use-refinement-session-controller.ts";
import type { DeliveryRefinementWorkflow } from "../model/refinement-model.ts";

type SavedRefinementProps = Parameters<typeof RefinementWorkflowBody>[0];
export function DeliveryRefinementWorkflowModal(props: SavedRefinementProps) {
  return <SavedWorkBoundary storageKey={`delivery-refinement-session:${props.workflow.deliveryPackage.delivery_package_id}:v1`} onClose={props.onClose} readOnly={props.readOnly}
    normalize={value => normalizeRefinementPersistedSession(value, props.workflow.deliveryPackage.delivery_package_id)}>
    <RefinementWorkflowBody {...props}/>
  </SavedWorkBoundary>;
}

function RefinementWorkflowBody({
  readOnly = false,
  onClose,
  sourceWorkDesignPackage,
  workflow,
}: {
  readOnly?: boolean;
  onClose: () => void;
  sourceWorkDesignPackage?:
    DeliveryRefinementWorkflow["deliveryPackage"] | null;
  workflow: DeliveryRefinementWorkflow;
}) {
  const controller = useRefinementSessionController({
    readOnly,
    deliveryPackage: workflow.deliveryPackage,
    onClose,
    sourceWorkDesignPackage: sourceWorkDesignPackage ?? null,
  });
  const { packet, sessionState } = controller;

  if (!packet && !readOnly) {
    return (
      <TerasModalShell
        height="content"
        description={controller.packetUnavailableReason}
        footer={
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
        }
        kicker="Refinement Workflow"
        bodyLayout="fill"
        modalAttributes={{ "data-teras-active-step": "missing-packet" }}
        onClose={onClose}
        surfaceId="delivery-refinement-unavailable"
        title="Refinement"
        width="large"
      >
        <TerasPanel frame="padded" treatment="state" tone="warn">
          <TerasPanelHeader
            kicker="Missing Packet"
            statusLabel="not ready"
            statusTone="warn"
            title="Refinement cannot start"
            description={controller.packetUnavailableReason}
          />
        </TerasPanel>
      </TerasModalShell>
    );
  }

  return (
    <>
      <TerasModalShell
        height={sessionState.activeStep === "hub" ? "content" : "fill"}
        width={controller.shellWidth}
        description={controller.shellCopy.description}
        footer={
          <><SavedWorkStatus/>
          <RefinementSessionFooter
            readOnly={readOnly}
            activeStep={sessionState.activeStep}
            blocked={controller.refinementBlocked}
            canApply={controller.canApply}
            onApplyRefinement={controller.applyRefinement}
            onRequestClose={controller.requestClose}
            onReturnToRegister={controller.returnToRegister}
            onSelectStep={sessionState.setActiveStep}
          />
          </>
        }
        kicker={readOnly ? `${controller.shellCopy.kicker} · Read-only` : controller.shellCopy.kicker}
        bodyLayout="fill"
        modalAttributes={{
          "data-delivery-workflow-readonly": readOnly ? "true" : "false",
          "data-teras-active-step": controller.progressActiveStep,
        }}
        onClose={controller.requestClose}
        surfaceId="delivery-refinement-workflow"
        title={controller.shellCopy.title}
      >
        <RefinementStepRouter {...controller} />
      </TerasModalShell>

      <RefinementCloseGuardDialog
        onKeepEditing={controller.closeCloseGuard}
        onLeave={controller.confirmClose}
        open={controller.closeGuardOpen}
      />

      <DeliveryRefinementBlockerRecoveryDialog
        deliveryPackage={controller.deliveryPackage}
        onRecordDisposition={controller.recordBlockerDisposition}
        open={controller.blockerRecoveryOpen}
        onClose={controller.closeBlockerRecovery}
      />
    </>
  );
}
