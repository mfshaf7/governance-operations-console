import type {
  DeliveryPackageRegisterPackage,
  DeliveryPackageRegisterRecoveryProjection,
  DeliveryPackageRegisterStatusProjection,
} from "../../../package-register/package-register-types.ts";

export type * from "../../../../work-model/work-design/work-design-types.ts";

export type WorkDesignRegisterRecoveryProjection =
  DeliveryPackageRegisterRecoveryProjection;

export type WorkDesignRegisterStatusProjection =
  DeliveryPackageRegisterStatusProjection;

export type WorkDesignRegisterPackage = DeliveryPackageRegisterPackage;
