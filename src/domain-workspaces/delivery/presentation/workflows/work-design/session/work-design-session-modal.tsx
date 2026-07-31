"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";

import { useWorkDesignSessionController } from "../session-controller/use-work-design-session-controller.ts";
import { WorkDesignSessionDialogs } from "./work-design-session-dialogs.tsx";
import { WorkDesignSessionFooter } from "./work-design-session-footer.tsx";
import { TerasModalShell } from "@/teras";
import { WorkDesignSessionStepRouter } from "./work-design-session-step-router.tsx";

type DeliveryWorkDesignWorkflow = {
  deliveryPackage: DeliveryPackageSummary;
};

export function DeliveryWorkDesignSessionModal({
  onApplied,
  onClose,
  workflow,
}: {
  onApplied?: (record: WorkDesignApplyReceipt) => void;
  onClose: () => void;
  workflow: DeliveryWorkDesignWorkflow;
}) {
  const controller = useWorkDesignSessionController({
    deliveryPackage: workflow.deliveryPackage,
    onApplied,
    onClose,
  });

  return (
    <TerasModalShell
      height={controller.footerProps.activeStep === "hub" ? "content" : "fill"}
      width={controller.shellWidth}
      description={controller.sessionShellCopy.description}
      footer={<WorkDesignSessionFooter {...controller.footerProps} />}
      kicker="Work Design Session"
      bodyLayout="fill"
      modalAttributes={{
        "data-teras-active-step": controller.footerProps.activeStep,
      }}
      surfaceId="work-design-session"
      onClose={controller.requestClose}
      title={controller.sessionShellCopy.title}
    >
      <WorkDesignSessionStepRouter {...controller.stepContentProps} />
      <WorkDesignSessionDialogs {...controller.dialogsProps} />
    </TerasModalShell>
  );
}
