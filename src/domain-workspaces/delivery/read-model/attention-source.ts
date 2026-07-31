import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionFreshness,
  ConsoleAttentionSource,
  ConsoleAttentionSourceSnapshot,
} from "../../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import {
  getDeliveryWorkspaceProjectionSnapshot,
  projectDeliveryEffectiveReadModel,
  subscribeDeliveryWorkspaceProjection,
} from "../local-runtime/index.ts";
import {
  getDeliveryAttentionItems,
  type DeliveryAttentionItem,
} from "./selectors/delivery-attention-selector.ts";
import { getDeliveryReadModel } from "./selectors/workflow-package-selectors.ts";
import type { DeliveryReadModel } from "./delivery-read-model.ts";

const registration = consoleAttentionSourceRegistrations.delivery;
const baseModel = getDeliveryReadModel();
let cachedRuntime = getDeliveryWorkspaceProjectionSnapshot();
let cachedSnapshot = projectDeliveryAttentionSnapshot(cachedRuntime);

export const deliveryAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const runtime = getDeliveryWorkspaceProjectionSnapshot();

    if (runtime !== cachedRuntime) {
      cachedRuntime = runtime;
      cachedSnapshot = projectDeliveryAttentionSnapshot(runtime);
    }

    return cachedSnapshot;
  },
  registration,
  subscribe: subscribeDeliveryWorkspaceProjection,
};

function projectDeliveryAttentionSnapshot(
  runtime: ReturnType<typeof getDeliveryWorkspaceProjectionSnapshot>,
): ConsoleAttentionSourceSnapshot {
  const model = projectDeliveryEffectiveReadModel({
    model: baseModel,
    runtimeProjection: runtime,
  });
  const source = deliverySourceMetadata(model);

  return {
    candidates: getDeliveryAttentionItems(model).map((item) =>
      deliveryAttentionCandidate(item, model, source),
    ),
    registration,
    schemaVersion: 1,
    source,
  };
}

function deliveryAttentionCandidate(
  item: DeliveryAttentionItem,
  model: DeliveryReadModel,
  source: ConsoleAttentionSourceSnapshot["source"],
): ConsoleAttentionCandidate {
  const intakeSource = item.target.sourceId
    ? (model.intake_sources.find(
        (candidate) => candidate.accepted_source_id === item.target.sourceId,
      ) ?? null)
    : null;
  const deliveryPackage = item.target.packageId
    ? (model.packages.find(
        (candidate) => candidate.delivery_package_id === item.target.packageId,
      ) ?? null)
    : (model.packages.find(
        (candidate) => candidate.display_name === item.title,
      ) ?? null);
  const subjectRef =
    intakeSource?.accepted_source_id ??
    deliveryPackage?.delivery_package_id ??
    item.title;
  const requiredMoveId = deliveryRequiredMoveId(item);
  const blocked = deliveryAttentionIsBlocked(item);
  const receiptRef =
    deliveryPackage?.local_workflow_projection?.receipt_id ?? null;
  const ownerLabel =
    intakeSource?.owner ??
    deliveryPackage?.active_blocker?.owner ??
    "Workspace Delivery ART";

  return {
    attentionClass: blocked
      ? "recovery"
      : item.label === "Closeout"
        ? "decision"
        : "required-action",
    candidateId: `delivery:${subjectRef}:${requiredMoveId}`,
    correlationRef:
      intakeSource?.source_ref ?? deliveryPackage?.source_ref ?? null,
    dedupeKey: `${subjectRef}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: intakeSource?.evidence_refs ?? [],
    owner: {
      label: ownerLabel,
      ref: `owner://${ownerLabel}`,
    },
    ownerRank: item.rank,
    reason: item.detail,
    receiptRefs: receiptRef ? [receiptRef] : [],
    requiredMove: {
      id: requiredMoveId,
      label: item.label,
    },
    reviewAt: deliveryReviewAt(deliveryPackage?.active_blocker?.review_date),
    route: {
      availability: "available",
      entryIntent: {
        mode: blocked
          ? "resolve"
          : item.label === "Closeout"
            ? "review"
            : "resume",
        requiredMoveRef: requiredMoveId,
        subjectRef,
        target: {
          id: "workbench:delivery",
          kind: "workbench-domain",
          surfaceLabel: "DELIVERY",
        },
      },
      externalHref: null,
      label: item.actionLabel,
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      ...source,
      ref:
        intakeSource?.source_custody.repo_ref ??
        deliveryPackage?.source_custody.repo_ref ??
        intakeSource?.source_ref ??
        deliveryPackage?.source_ref ??
        source.ref,
      version:
        deliveryPackage?.local_workflow_projection?.recorded_at ??
        model.projection_state.source_revision,
    },
    subject: {
      kind: intakeSource ? "delivery-intake-source" : "delivery-package",
      ref: subjectRef,
      title: item.title,
    },
    urgency: blocked
      ? item.label === "Consume Failed"
        ? "critical"
        : "high"
      : item.label === "Closeout"
        ? "low"
        : "normal",
  };
}

function deliverySourceMetadata(
  model: DeliveryReadModel,
): ConsoleAttentionSourceSnapshot["source"] {
  return {
    authority:
      model.source_truth === "mock"
        ? "delivery-structured-fixture"
        : model.source_truth,
    freshness: deliveryProjectionFreshness(model),
    mode: model.source_truth === "mock" ? "synthetic" : "source-projected",
    observedAt: model.projection_state.checked_at,
    projectedAt: model.generated_at,
    ref: "delivery://attention-projection",
    version: model.projection_state.source_revision,
  };
}

function deliveryProjectionFreshness(
  model: DeliveryReadModel,
): ConsoleAttentionFreshness {
  switch (model.projection_state.status) {
    case "fresh":
      return "current";
    case "stale":
    case "projection_sync_required":
      return "stale";
    case "backend_unavailable":
    case "permission_denied":
      return "unavailable";
    case "read_error":
      return "unverified";
  }
}

function deliveryRequiredMoveId(item: DeliveryAttentionItem) {
  const label = item.label.toLowerCase().replaceAll(" ", "-");

  return `delivery.${item.target.surfaceId}.${label}`;
}

function deliveryAttentionIsBlocked(item: DeliveryAttentionItem) {
  return item.label.includes("Blocked") || item.label === "Consume Failed";
}

function deliveryReviewAt(reviewDate: string | undefined) {
  if (!reviewDate) {
    return null;
  }

  const parsed = Date.parse(reviewDate);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
