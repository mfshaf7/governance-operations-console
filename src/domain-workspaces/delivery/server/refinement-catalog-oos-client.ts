import {
  assertCatalogOosMutationResult,
  assertCatalogOosProjection,
} from "../live-runtime/catalog-live-contract.ts";
import type {
  CatalogMutationCommand,
  CatalogOosMutationResult,
  CatalogOosProjection,
} from "../live-runtime/catalog-live-types.ts";
import { deliveryLiveIdentity } from "../live-runtime/delivery-live-identity.ts";
import {
  assertRefinementOosAssistResult,
  assertRefinementOosProjection,
  assertRefinementOosRun,
} from "../live-runtime/refinement-live-contract.ts";
import type {
  RefinementApplyCommand,
  RefinementAssistCommand,
  RefinementOosAssistResult,
  RefinementOosProjection,
  RefinementOosRun,
} from "../live-runtime/refinement-live-types.ts";
import {
  canonicalDigest,
  DeliveryOosError,
  deliveryOosOperator,
  deliveryOosRequest,
  resolveDeliveryOosConfig,
  stableDigestId,
} from "./delivery-oos-client.ts";

export async function readRefinementProjection(
  packageRef: string,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RefinementOosProjection> {
  const config = resolveDeliveryOosConfig(options.env);
  const identity = deliveryLiveIdentity(packageRef);
  const projection = assertRefinementOosProjection(
    await deliveryOosRequest(
      config,
      `/v1/delivery-refinement/${encodeURIComponent(packageRef)}/projection?source_ref=${encodeURIComponent(identity.sourceRef)}`,
      { method: "GET" },
      options.fetchImpl,
    ),
  );
  if (
    projection.package_ref !== packageRef ||
    projection.packet.source.package_ref !== packageRef ||
    projection.packet.source.source_ref !== identity.sourceRef ||
    projection.packet.source.source_revision !== projection.source_revision
  ) {
    throw new Error("OOS returned a Refinement projection for a different source.");
  }
  return projection;
}

export async function requestRefinementAdvice(
  packageRef: string,
  projection: RefinementOosProjection,
  command: RefinementAssistCommand,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RefinementOosAssistResult> {
  const config = resolveDeliveryOosConfig(options.env);
  const packet = projection.packet;
  const identity = deliveryLiveIdentity(packageRef);
  const requestId = stableDigestId("console-refinement-assist", {
    fieldKey: command.fieldKey,
    packageRef,
    packetRevision: packet.packet_revision,
    prompt: command.operatorPrompt,
  });
  const request = {
    schema_version: 1,
    request_id: requestId,
    correlation_id: stableDigestId("console-refinement-correlation", requestId),
    delivery_id: identity.deliveryId,
    package_ref: packageRef,
    source_ref: identity.sourceRef,
    source_revision: projection.source_revision,
    operator: deliveryOosOperator(config),
    task: {
      kind: "metadata_advice",
      contract_ref: "oos.delivery-refinement.v1",
      version: "1.0",
    },
    packet: {
      packet_id: packet.packet_id,
      packet_revision: packet.packet_revision,
      source_work_design_receipt_id: packet.source.source_work_design_receipt_id,
    },
    target: {
      field_key: command.fieldKey,
      field_label: command.fieldLabel,
      field_kind: command.fieldKind,
      required: command.required,
      source_value: command.sourceValue,
      draft_value: command.draftValue,
      selected_node_ids: command.selectedNodeIds,
      ...(command.allowedValues.length > 0
        ? { allowed_values: command.allowedValues }
        : {}),
    },
    operator_prompt: command.operatorPrompt,
  };
  const result = assertRefinementOosAssistResult(
    await deliveryOosRequest(
      config,
      `/v1/delivery-refinement/${encodeURIComponent(packageRef)}/assist`,
      { body: JSON.stringify(request), method: "POST" },
      options.fetchImpl,
    ),
  );
  if (
    result.request_id !== request.request_id ||
    result.correlation_id !== request.correlation_id ||
    result.suggestion.field_key !== command.fieldKey
  ) {
    throw new Error("OOS returned Refinement advice for a different request.");
  }
  return result;
}

export async function applyRefinementDraft(
  packageRef: string,
  projection: RefinementOosProjection,
  command: RefinementApplyCommand,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RefinementOosRun> {
  const config = resolveDeliveryOosConfig(options.env);
  const packet = projection.packet;
  const identity = deliveryLiveIdentity(packageRef);
  const acceptedDraft = {
    packet_id: packet.packet_id,
    packet_revision: packet.packet_revision,
    source_work_design_receipt_id: packet.source.source_work_design_receipt_id,
    metadata_values: command.metadataValues,
    metadata_resolutions: command.metadataResolutions,
    apply_plan: command.applyPlan,
  };
  const request = {
    schema_version: 1,
    request_id: stableDigestId("console-refinement-apply", command.acceptanceId),
    correlation_id: stableDigestId("console-refinement-correlation", command.acceptanceId),
    idempotency_key: stableDigestId("console-refinement-idempotency", {
      packageRef,
      packetRevision: packet.packet_revision,
      acceptedDraft,
    }),
    delivery_id: identity.deliveryId,
    package_ref: packageRef,
    source_ref: identity.sourceRef,
    source_revision: projection.source_revision,
    operator: deliveryOosOperator(config),
    acceptance: {
      decision: "apply",
      accepted_at: command.acceptedAt,
      accepted_by: config.operatorId,
      note: command.note,
    },
    accepted_draft: {
      ...acceptedDraft,
      draft_digest: canonicalDigest(acceptedDraft),
    },
  };
  const run = assertRefinementOosRun(
    await deliveryOosRequest(
      config,
      `/v1/delivery-refinement/${encodeURIComponent(packageRef)}/apply`,
      { body: JSON.stringify(request), method: "POST" },
      options.fetchImpl,
    ),
  );
  if (
    run.request_id !== request.request_id ||
    run.correlation_id !== request.correlation_id ||
    (run.receipt !== null &&
      (run.receipt.accepted_draft_digest !==
        request.accepted_draft.draft_digest ||
        run.receipt.applied_by !== config.operatorId ||
        run.receipt.source_work_design_receipt_id !==
          packet.source.source_work_design_receipt_id ||
        run.receipt.target.delivery_ref !== identity.sourceRef))
  ) {
    throw new DeliveryOosError(
      "OOS returned Refinement evidence for a different accepted draft.",
      "refinement_apply_mismatch",
      502,
    );
  }
  return run;
}

export async function readRefinementRun(
  packageRef: string,
  runId: string,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RefinementOosRun> {
  const config = resolveDeliveryOosConfig(options.env);
  deliveryLiveIdentity(packageRef);
  const run = assertRefinementOosRun(
    await deliveryOosRequest(
      config,
      `/v1/delivery-refinement/${encodeURIComponent(packageRef)}/runs/${encodeURIComponent(runId)}`,
      { method: "GET" },
      options.fetchImpl,
    ),
  );
  if (run.run_id !== runId) throw new Error("OOS returned a different Refinement run.");
  return run;
}

export async function readCatalogProjection(
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<CatalogOosProjection> {
  const config = resolveDeliveryOosConfig(options.env);
  return assertCatalogOosProjection(
    await deliveryOosRequest(
      config,
      "/v1/delivery-catalog/projection",
      { method: "GET" },
      options.fetchImpl,
    ),
  );
}

export async function mutateCatalogValue(
  catalogItemId: string,
  projection: CatalogOosProjection,
  command: CatalogMutationCommand & { acceptedAt: string; acceptanceId: string },
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<CatalogOosMutationResult> {
  const config = resolveDeliveryOosConfig(options.env);
  if (command.draft.linkedRepository && !command.repositoryReadiness) {
    throw new DeliveryOosError(
      "Owner Repo mutation requires current repository readiness evidence.",
      "catalog_repository_readiness_required",
      409,
    );
  }
  if (
    command.draft.linkedRepository &&
    command.repositoryReadiness &&
    (command.repositoryReadiness.repo_name !==
      command.draft.linkedRepository.valueKey ||
      command.repositoryReadiness.repo_ref !==
        `repo://${command.draft.linkedRepository.valueKey}` ||
      command.repositoryReadiness.catalog_value_key !==
        command.draft.valueKey)
  ) {
    throw new DeliveryOosError(
      "Repository readiness evidence does not match the selected Catalog value.",
      "catalog_repository_readiness_mismatch",
      409,
    );
  }
  const request = {
    schema_version: 1,
    request_id: stableDigestId("console-catalog-request", command.acceptanceId),
    correlation_id: stableDigestId("console-catalog-correlation", command.acceptanceId),
    idempotency_key: stableDigestId("console-catalog-idempotency", {
      catalogItemId,
      draft: command.draft,
      mode: command.mode,
      sourceRevision: projection.source_revision,
      targetValueId: command.targetValueId,
    }),
    source_revision: projection.source_revision,
    catalog_item_id: catalogItemId,
    mode: command.mode,
    target_value_id: command.targetValueId,
    operator: deliveryOosOperator(config),
    acceptance: {
      decision: "apply",
      accepted_at: command.acceptedAt,
      accepted_by: config.operatorId,
      note: `Apply reviewed ${command.mode} mutation for ${catalogItemId}.`,
    },
    draft: {
      value_key: command.draft.valueKey,
      label: command.draft.label,
      description: command.draft.description,
      parent_catalog_value_key: command.draft.parentCatalogValueKey ?? null,
      planning_window_start_date: command.draft.planningWindowStartDate || null,
      planning_window_end_date: command.draft.planningWindowEndDate || null,
      repository_binding: command.mode === "retire"
        ? null
        : command.repositoryReadiness ?? null,
    },
  };
  const result = assertCatalogOosMutationResult(
    await deliveryOosRequest(
      config,
      `/v1/delivery-catalog/${encodeURIComponent(catalogItemId)}/mutations`,
      { body: JSON.stringify(request), method: "POST" },
      options.fetchImpl,
    ),
  );
  if (
    result.request_id !== request.request_id ||
    result.correlation_id !== request.correlation_id ||
    result.readback_complete !== true ||
    result.applied_by !== config.operatorId ||
    result.value.catalog_item_id !== catalogItemId ||
    result.value.value_key !== command.draft.valueKey ||
    (command.targetValueId !== null &&
      result.value.catalog_value_id !== command.targetValueId)
  ) {
    throw new DeliveryOosError(
      "OOS returned Catalog evidence for a different mutation.",
      "catalog_mutation_mismatch",
      502,
    );
  }
  return result;
}
