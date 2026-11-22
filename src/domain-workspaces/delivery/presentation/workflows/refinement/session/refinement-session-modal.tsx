"use client";
import { SavedWorkBoundary, SavedWorkStatus } from "@/console-integration/saved-work/saved-work-boundary";
import { normalizeRefinementPersistedSession } from "../../../../local-runtime/persistence/refinement-session-persistence.ts";

import {
  TerasActionButton,
  TerasModalShell,
  TerasEmptyState,
  TerasFieldStack,
  TerasPanelStack,
  TerasPanelHeader,
  TerasTechnicalDetails,
  TerasLoadingState,
} from "@/teras";

import { RefinementSessionFooter } from "./refinement-session-footer.tsx";
import { RefinementStepRouter } from "./refinement-step-router.tsx";
import { DeliveryRefinementBlockerRecoveryDialog } from "../support/blocker-recovery/refinement-blocker-recovery-dialog.tsx";
import { RefinementCloseGuardDialog } from "./dialogs/refinement-close-guard-dialog.tsx";
import { useRefinementSessionController } from "../session-controller/use-refinement-session-controller.ts";
import type { DeliveryRefinementWorkflow } from "../model/refinement-model.ts";
import { usePIPlanningPreview } from "../../../workspace/pi-planning-preview-context.ts";

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
  onCanonicalChanged,
  sourceWorkDesignPackage,
  workflow,
}: {
  readOnly?: boolean;
  onClose: () => void;
  onCanonicalChanged?: () => Promise<void>;
  sourceWorkDesignPackage?:
    DeliveryRefinementWorkflow["deliveryPackage"] | null;
  workflow: DeliveryRefinementWorkflow;
}) {
  const controller = useRefinementSessionController({
    readOnly,
    deliveryPackage: workflow.deliveryPackage,
    onClose,
    onCanonicalChanged,
    sourceWorkDesignPackage: sourceWorkDesignPackage ?? null,
  });
  const { packet, sessionState } = controller;
  const planning = usePIPlanningPreview();
  const preparationOnly = Boolean(packet && !packet.apply_plan.operations.some(operation => operation.kind === "plan_apply"));
  const canPlan = !readOnly && preparationOnly && (sessionState.activeReceipt ?? packet?.receipt)?.outcome === "accepted";

  if (!packet && !readOnly) {
    return (
      <TerasModalShell
        height="content"
        description={workflow.deliveryPackage.display_name}
        footer={
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
        }
        kicker="Refinement Workflow"
        bodyLayout="scroll"
        modalAttributes={{ "data-teras-active-step": controller.packetLoading ? "loading-packet" : "missing-packet" }}
        onClose={onClose}
        surfaceId="delivery-refinement-unavailable"
        title="Refinement"
        width="medium"
      >
        <TerasPanelStack fill="last" minimumFillHeight="medium">
          {controller.packetLoading
            ? <TerasLoadingState fill label="Loading Refinement…" detail="Reading saved work and available field choices." skeleton="details" />
            : <TerasEmptyState fill>
                <TerasFieldStack>
                  <TerasPanelHeader kicker="Saved work" title="Refinement couldn’t load"
                    description="Try again to read the saved work and available choices." />
                  <TerasActionButton onClick={() => void controller.retryPacket()}>Retry loading</TerasActionButton>
                  <TerasTechnicalDetails items={[]}><p>{controller.packetUnavailableReason}</p></TerasTechnicalDetails>
                </TerasFieldStack>
              </TerasEmptyState>}
        </TerasPanelStack>
      </TerasModalShell>
    );
  }

  return (
    <>
      <TerasModalShell
        busy={controller.applyInFlight}
        busyLabel={controller.runtimeRun ? "Applying Refinement and checking its receipt…" : "Submitting reviewed Refinement…"}
        height={sessionState.activeStep === "hub" ? "content" : "fill"}
        width={controller.shellWidth}
        description={controller.shellCopy.description}
        footer={
          <><SavedWorkStatus/>
          <RefinementSessionFooter
            applyInFlight={controller.applyInFlight}
            readOnly={readOnly}
            activeStep={sessionState.activeStep}
            blocked={controller.refinementBlocked}
            canApply={controller.canApply}
            preparationOnly={preparationOnly}
            onPlanWork={canPlan && planning ? () => {
              controller.returnToRegister();
              planning.open(workflow.deliveryPackage.delivery_package_id);
            } : undefined}
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
