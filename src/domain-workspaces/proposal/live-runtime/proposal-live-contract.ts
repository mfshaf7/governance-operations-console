import type {
  ProposalLiveApiError,
  ProposalLiveSnapshot,
  ProposalOosCommandResult,
  ProposalOosEvent,
  ProposalOosHandoffApplicationResult,
  ProposalOosHistory,
  ProposalOosProjection,
  ProposalTargetApplicationResult,
} from "./proposal-live-types.ts";

export function assertProposalLiveSnapshot(value: unknown): ProposalLiveSnapshot {
  if (!isRecord(value)) {
    throw new Error("Proposal live response is not an object.");
  }
  if (value.mode !== "disconnected-preview" && value.mode !== "live") {
    throw new Error("Proposal live response has an unknown mode.");
  }
  if (value.status !== "current" && value.status !== "offline") {
    throw new Error("Proposal live response has an unknown status.");
  }
  if (!Array.isArray(value.records)) {
    throw new Error("Proposal live response does not contain records.");
  }

  for (const record of value.records) {
    if (!isRecord(record) || typeof record.createdAt !== "string") {
      throw new Error("Proposal live record metadata is invalid.");
    }
    assertProposalOosProjection(record.projection);
    assertProposalOosHistory(record.history);
  }

  return value as unknown as ProposalLiveSnapshot;
}

export function assertProposalOosCommandResult(
  value: unknown,
): ProposalOosCommandResult {
  if (!isRecord(value) || value.schema_version !== 1) {
    throw new Error("Proposal command result is invalid.");
  }
  assertProposalOosProjection(value.projection);
  assertProposalOosHistory(value.history);
  assertProposalOosEvent(value.event);
  if (!isRecord(value.receipt) || typeof value.receipt.receipt_ref !== "string") {
    throw new Error("Proposal command receipt is invalid.");
  }
  return value as unknown as ProposalOosCommandResult;
}

export function assertProposalOosHandoffApplicationResult(
  value: unknown,
): ProposalOosHandoffApplicationResult {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    typeof value.application_id !== "string" ||
    typeof value.replayed !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.owner !== "operator-orchestration-service" ||
    typeof value.receipt.receipt_ref !== "string" ||
    typeof value.receipt.recorded_at !== "string" ||
    typeof value.receipt.source_record_ref !== "string" ||
    typeof value.receipt.source_record_version !== "string" ||
    typeof value.receipt.target_record_ref !== "string" ||
    value.receipt.target_record_system !== "openproject" ||
    !isRecord(value.projection) ||
    !isRecord(value.projection.handoff) ||
    value.projection.handoff.state !== "applied" ||
    value.projection.handoff.target_receipt_ref !==
      value.receipt.receipt_ref ||
    value.projection.handoff.target_record_ref !==
      value.receipt.target_record_ref ||
    !isRecord(value.event) ||
    value.event.event_type !== "handoff-applied"
  ) {
    throw new Error("Proposal handoff application result is invalid.");
  }
  assertProposalOosProjection(value.projection);
  assertProposalOosHistory(value.history);
  assertProposalOosEvent(value.event);
  return value as unknown as ProposalOosHandoffApplicationResult;
}

export function assertProposalTargetApplicationResult(
  value: unknown,
): ProposalTargetApplicationResult {
  const statuses = new Set([
    "accepted",
    "cancelled",
    "cancelling",
    "preparing",
    "rejected",
    "requires-action",
    "review-required",
    "succeeded",
  ]);
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    value.workflow_id !== "proposal-target-application" ||
    typeof value.application_id !== "string" ||
    typeof value.proposal_id !== "string" ||
    typeof value.prototype_id !== "string" ||
    typeof value.session_ref !== "string" ||
    typeof value.execution_ref !== "string" ||
    typeof value.status !== "string" ||
    !statuses.has(value.status) ||
    typeof value.next_action !== "string" ||
    typeof value.revision !== "number" ||
    !Array.isArray(value.history) ||
    typeof value.canonical_target_mutation !== "boolean" ||
    typeof value.proposal_mutation !== "boolean" ||
    value.runtime_activation !== false
  ) {
    throw new Error("Proposal target application projection is invalid.");
  }

  if (value.status === "review-required") {
    if (
      !isRecord(value.review) ||
      value.review.repository !== "workspace-prototype-studio" ||
      typeof value.review.number !== "number" ||
      value.review.state !== "open" ||
      typeof value.review.head_commit !== "string" ||
      value.review.merged !== false ||
      value.canonical_target_mutation ||
      value.proposal_mutation
    ) {
      throw new Error("Proposal target review projection is invalid.");
    }
  }

  if (value.status === "succeeded") {
    if (
      !value.canonical_target_mutation ||
      !value.proposal_mutation ||
      !isRecord(value.target_result) ||
      !isRecord(value.target_result.receipt) ||
      value.target_result.receipt.owner !== "workspace-prototype-studio" ||
      typeof value.target_result.receipt.receipt_ref !== "string" ||
      typeof value.target_result.receipt.recorded_at !== "string" ||
      !isRecord(value.proposal_acknowledgement) ||
      !isRecord(value.proposal_acknowledgement.projection) ||
      !isRecord(value.proposal_acknowledgement.projection.handoff) ||
      value.proposal_acknowledgement.projection.handoff.state !== "applied" ||
      value.proposal_acknowledgement.projection.handoff.target_receipt_ref !==
        value.target_result.receipt.receipt_ref ||
      value.proposal_acknowledgement.projection.handoff.target_record_ref !==
        value.target_result.receipt.target_record_ref
    ) {
      throw new Error("Proposal target success evidence is incomplete.");
    }
    assertProposalOosProjection(value.proposal_acknowledgement.projection);
  } else if (value.canonical_target_mutation || value.proposal_mutation) {
    throw new Error("Incomplete Proposal target application claimed mutation.");
  }

  for (const entry of value.history) {
    if (
      !isRecord(entry) ||
      typeof entry.sequence !== "number" ||
      typeof entry.at !== "string" ||
      typeof entry.status !== "string" ||
      !statuses.has(entry.status)
    ) {
      throw new Error("Proposal target application history is invalid.");
    }
  }

  return value as unknown as ProposalTargetApplicationResult;
}

export function isProposalLiveApiError(value: unknown): value is ProposalLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

export function assertProposalOosProjection(
  value: unknown,
): ProposalOosProjection {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    typeof value.proposal_id !== "string" ||
    typeof value.record_ref !== "string" ||
    typeof value.record_version !== "string" ||
    typeof value.title !== "string" ||
    typeof value.updated_at !== "string" ||
    !isRecord(value.source) ||
    !isRecord(value.handoff)
  ) {
    throw new Error("Proposal projection does not satisfy the live contract.");
  }
  return value as unknown as ProposalOosProjection;
}

export function assertProposalOosHistory(value: unknown): ProposalOosHistory {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    typeof value.proposal_id !== "string" ||
    !Array.isArray(value.events)
  ) {
    throw new Error("Proposal history does not satisfy the live contract.");
  }
  value.events.forEach(assertProposalOosEvent);
  return value as unknown as ProposalOosHistory;
}

function assertProposalOosEvent(value: unknown): ProposalOosEvent {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    typeof value.event_id !== "string" ||
    typeof value.proposal_id !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.occurred_at !== "string"
  ) {
    throw new Error("Proposal event does not satisfy the live contract.");
  }
  return value as unknown as ProposalOosEvent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
