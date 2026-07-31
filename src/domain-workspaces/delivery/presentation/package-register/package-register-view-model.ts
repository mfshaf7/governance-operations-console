import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryPackagePosture,
  DeliveryTone,
  DeliveryWorkflowPhase,
} from "../../read-model/index.ts";
import { getDeliveryEffectivePackageProjection } from "../../read-model/index.ts";

import {
  workDesignNextStepLabel,
  workDesignRegisterActionTitle,
  workDesignRegisterActionTone,
  workDesignRegisterPackageSummary,
  workDesignRegisterStatusLabel,
  workDesignRegisterStatusTone,
  workDesignRegisterStep,
  workDesignSelectedPackageShowsBlockerContext,
  workDesignStepLabel,
} from "../workflows/work-design/index.ts";
import type {
  DeliveryPackageRegisterPackage,
  DeliveryPackageRegisterStep,
} from "./package-register-types.ts";

export type DeliveryPackageRegisterStatusLabel =
  DeliveryPackagePosture | "Linked" | "Risk Accepted";

export function deliveryPackageRegisterStatusLabel(
  deliveryPackage: DeliveryPackageRegisterPackage,
): DeliveryPackageRegisterStatusLabel {
  if (deliveryPackage.workflow_phase === "work_design") {
    return workDesignRegisterStatusLabel(deliveryPackage);
  }

  return getDeliveryEffectivePackageProjection(deliveryPackage).posture;
}

export function deliveryPackageRegisterStatusTone(
  deliveryPackage: DeliveryPackageRegisterPackage,
): DeliveryTone {
  if (deliveryPackage.workflow_phase === "work_design") {
    return workDesignRegisterStatusTone(deliveryPackage);
  }

  return getDeliveryEffectivePackageProjection(deliveryPackage).tone;
}

export function deliveryPackageRegisterPackageSummary(
  deliveryPackage: DeliveryPackageRegisterPackage,
) {
  if (deliveryPackage.workflow_phase === "work_design") {
    return workDesignRegisterPackageSummary(deliveryPackage);
  }

  return getDeliveryEffectivePackageProjection(deliveryPackage).summary;
}

export function deliveryPackageRegisterStep(
  deliveryPackage: DeliveryPackageRegisterPackage,
) {
  return workDesignRegisterStep(deliveryPackage);
}

export function deliveryPackageRegisterStepLabel(
  step: DeliveryPackageRegisterStep,
) {
  return workDesignStepLabel(step);
}

export function deliveryWorkflowPhaseLabel(phase: DeliveryWorkflowPhase) {
  switch (phase) {
    case "audit_only":
      return "Audit Only";
    case "execution":
      return "Execution";
    case "intake":
      return "Intake";
    case "refinement":
      return "Refinement";
    case "work_design":
      return "Work Design";
  }
}

export function deliveryPackageRegisterPackageStepLabel(
  deliveryPackage: DeliveryPackageRegisterPackage,
) {
  if (deliveryPackage.delivery_package_register_recovery) {
    return deliveryPackage.delivery_package_register_recovery.stepLabel;
  }

  switch (deliveryPackage.workflow_phase) {
    case "audit_only":
      return "Audit Trail";
    case "execution":
      return "Execution Board";
    case "intake":
      return "Intake Handoff";
    case "refinement":
      return "Metadata Repair";
    case "work_design":
      if (deliveryPackageRegisterStatusLabel(deliveryPackage) === "Blocked") {
        return "Blocked In Design Hub";
      }

      return deliveryPackageRegisterStepLabel(
        deliveryPackageRegisterStep(deliveryPackage),
      );
  }
}

export function deliveryPackageRegisterActionTitle(
  step: DeliveryPackageRegisterStep,
) {
  return workDesignRegisterActionTitle(step);
}

export function deliveryPackageRegisterActionTone(
  step: DeliveryPackageRegisterStep,
): DeliveryTone {
  return workDesignRegisterActionTone(step);
}

export function deliveryPackageRegisterNextStepLabel(
  deliveryPackage: DeliveryPackageRegisterPackage,
) {
  return workDesignNextStepLabel(deliveryPackage);
}

export function deliveryWorkflowNextSurfaceHint(phase: DeliveryWorkflowPhase) {
  switch (phase) {
    case "intake":
      return "Work Design after intake shell creation.";
    case "work_design":
      return "Refinement after the package tree draft is accepted.";
    case "refinement":
      return "Execution Board after refinement apply is accepted.";
    case "execution":
      return "Package Actions from the Execution Board.";
    case "audit_only":
      return "Package-scoped Audit Trail only.";
  }
}

export function deliveryWorkflowSelectedPackageShowsBlockerContext(
  deliveryPackage: DeliveryPackageRegisterPackage,
) {
  return workDesignSelectedPackageShowsBlockerContext(deliveryPackage);
}

export function deliveryPackageRegisterSelectedFacts(
  deliveryPackage: DeliveryPackageRegisterPackage | null,
): TerasMetadataItem[] {
  if (!deliveryPackage) {
    return [];
  }

  const activeBlockerFacts: TerasMetadataItem[] = deliveryPackage.active_blocker
    ? [
        {
          label: "Blocker",
          value: deliveryPackage.active_blocker.statement,
        },
        {
          label: "Blocker Owner",
          value: deliveryPackage.active_blocker.owner,
        },
        {
          label: "Decision Path",
          value: deliveryPackage.active_blocker.decision_path.replace("-", " "),
        },
      ]
    : [];

  if (deliveryPackage.workflow_phase === "work_design") {
    return [
      { label: "Source", value: deliveryPackage.source_ref },
      {
        label: "Work Design Step",
        value: deliveryPackageRegisterPackageStepLabel(deliveryPackage),
      },
      {
        label: "Next Work Design Step",
        value: deliveryPackageRegisterNextStepLabel(deliveryPackage),
      },
      ...(deliveryPackage.work_design_blocker &&
      deliveryWorkflowSelectedPackageShowsBlockerContext(deliveryPackage)
        ? [
            {
              label: "Blocker Issue",
              value: deliveryPackage.work_design_blocker.title,
            },
            {
              label: "Fix Path",
              value: deliveryPackage.work_design_blocker.recovery_action,
            },
          ]
        : []),
      ...activeBlockerFacts,
    ];
  }

  return [
    { label: "Source", value: deliveryPackage.source_ref },
    {
      label: "Target PI",
      value: deliveryPackage.target_pi ?? "Not committed",
    },
    {
      label: "Workflow Phase",
      value: deliveryWorkflowPhaseLabel(deliveryPackage.workflow_phase),
    },
    {
      label: "Next Surface",
      value: deliveryWorkflowNextSurfaceHint(deliveryPackage.workflow_phase),
    },
    ...activeBlockerFacts,
  ];
}

export function deliveryPackageRegisterSelectedPanelProjection({
  deliveryPackage,
  fallbackTone,
}: {
  deliveryPackage: DeliveryPackageRegisterPackage | null;
  fallbackTone: DeliveryTone;
}) {
  const selectedTone = deliveryPackage
    ? deliveryPackageRegisterStatusTone(deliveryPackage)
    : fallbackTone;

  return {
    description: deliveryPackage
      ? deliveryPackageRegisterPackageSummary(deliveryPackage)
      : "Select a register item to inspect its current workflow context.",
    selectedTone,
    statusLabel: deliveryPackage
      ? deliveryPackageRegisterStatusLabel(deliveryPackage)
      : undefined,
    statusTone: deliveryPackage
      ? deliveryPackageRegisterStatusTone(deliveryPackage)
      : ("info" as DeliveryTone),
    title: deliveryPackage?.display_name ?? "No package selected",
  };
}
