import type {
  ProposalLiveApiError,
  ProposalLiveSnapshot,
  ProposalOosCommandResult,
  ProposalOosEvent,
  ProposalOosHistory,
  ProposalOosProjection,
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
