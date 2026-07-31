import type {
  DeliveryPackagePosture,
  DeliveryPackageSummary,
} from "../../read-model/index.ts";

export type DeliveryPackageRegisterStep =
  "apply" | "build" | "context" | "history" | "hub" | "review";

export type DeliveryPackageRegisterRecoveryProjection = {
  actionTitle: string;
  nextStepLabel: string;
  registerStep: DeliveryPackageRegisterStep;
  recoveryAction: string;
  statusLabel: DeliveryPackagePosture | "Linked" | "Risk Accepted";
  stepLabel: string;
};

export type DeliveryPackageRegisterStatusProjection = {
  statusLabel: DeliveryPackagePosture;
  summary: string;
};

export type DeliveryPackageRegisterPackage = DeliveryPackageSummary & {
  delivery_package_register_recovery?: DeliveryPackageRegisterRecoveryProjection;
  delivery_package_register_status?: DeliveryPackageRegisterStatusProjection;
  delivery_package_register_step?: DeliveryPackageRegisterStep;
};
