"use client";

import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../../read-model/index.ts";

import type { WorkDesignApplyReceipt } from "../../../work-model/work-design/work-design-types.ts";
import { DeliveryPackageRegisterSurface } from "../../package-register/index.ts";
import type {
  DeliverySurfaceConfig,
  DeliverySurfaceId,
} from "../../workspace/workspace-types.ts";

export function DeliveryWorkDesignSurface({
  focusPackageId,
  focusToken,
  model,
  onRequestPackageRegisterFocus,
  onWorkDesignApplied,
  surface,
}: {
  focusPackageId?: string | null;
  focusToken?: number | null;
  model: DeliveryReadModel;
  onRequestPackageRegisterFocus?: (
    surfaceId: Extract<DeliverySurfaceId, "refinement" | "work-design">,
    packageId: string,
  ) => void;
  onWorkDesignApplied?: (
    deliveryPackage: DeliveryPackageSummary,
    record: WorkDesignApplyReceipt,
  ) => void;
  surface: DeliverySurfaceConfig;
}) {
  return (
    <DeliveryPackageRegisterSurface
      focusPackageId={focusPackageId}
      focusToken={focusToken}
      model={model}
      onRequestPackageRegisterFocus={onRequestPackageRegisterFocus}
      onWorkDesignApplied={onWorkDesignApplied}
      surface={surface}
    />
  );
}
