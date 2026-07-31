import type {
  DeliveryPackagePosture,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignRegisterPackage,
} from "../model/work-design-model.ts";

export function workDesignPackageCompletedFromSource(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  return (
    deliveryPackage.workflow_phase === "work_design" &&
    deliveryPackage.backend_status === "done" &&
    deliveryPackage.package_posture === "Done"
  );
}

export function workDesignPackageLinkedFromSource(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  return (
    workDesignPackageCompletedFromSource(deliveryPackage) &&
    deliveryPackage.work_design_context_session?.decision === "attach"
  );
}

export function workDesignPackageRetiredFromSource(
  deliveryPackage: WorkDesignRegisterPackage,
) {
  return (
    deliveryPackage.workflow_phase === "work_design" &&
    deliveryPackage.backend_status === "retired" &&
    deliveryPackage.package_posture === "Retired"
  );
}

export function workDesignPackageStatusFromBlockerReceipt(
  receipt: WorkDesignBlockerDispositionReceipt,
): {
  label: DeliveryPackagePosture | "Risk Accepted";
  tone: DeliveryTone;
} {
  if (receipt.disposition === "accept-risk") {
    return {
      label: "Risk Accepted",
      tone: "danger",
    };
  }

  if (!receipt.clearsBlocker) {
    return {
      label: "Blocked",
      tone: "danger",
    };
  }

  return {
    label: "Ready",
    tone: "info",
  };
}
