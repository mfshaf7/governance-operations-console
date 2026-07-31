import type { DeliveryReadModel } from "../../read-model/index.ts";
import { applyLocalDeliveryCloseouts } from "../transitions/closeout-transition.ts";
import { applyLocalExecutionActions } from "../transitions/execution-transition.ts";
import { applyLocalIntakeConsumes } from "../transitions/intake-transition.ts";
import { applyLocalRefinementReceipts } from "../transitions/refinement-transition.ts";
import { applyLocalWorkDesignApplies } from "../transitions/work-design-transition.ts";
import type { DeliveryWorkspaceProjectionSnapshot } from "./workspace-projection.ts";

export function projectDeliveryEffectiveReadModel({
  model,
  runtimeProjection,
}: {
  model: DeliveryReadModel;
  runtimeProjection: DeliveryWorkspaceProjectionSnapshot;
}): DeliveryReadModel {
  const ingressModel = projectDeliveryIngressSources(
    model,
    runtimeProjection.ingress?.intakeSources ?? [],
  );

  return applyLocalDeliveryCloseouts(
    applyLocalExecutionActions(
      applyLocalRefinementReceipts(
        applyLocalWorkDesignApplies(
          applyLocalIntakeConsumes(
            ingressModel,
            runtimeProjection.consumedIntakeRecords,
          ),
          runtimeProjection.workDesignApplyRecords,
        ),
        runtimeProjection.refinementApplyReceipts,
      ),
      runtimeProjection.executionActionRecords,
    ),
    runtimeProjection.closeoutRecords ?? {},
  );
}

function projectDeliveryIngressSources(
  model: DeliveryReadModel,
  ingressSources: DeliveryReadModel["intake_sources"],
): DeliveryReadModel {
  if (ingressSources.length === 0) {
    return model;
  }

  const incomingIds = new Set(
    ingressSources.map((source) => source.accepted_source_id),
  );

  return {
    ...model,
    intake_sources: [
      ...ingressSources,
      ...model.intake_sources.filter(
        (source) => !incomingIds.has(source.accepted_source_id),
      ),
    ],
  };
}
