import type { WorkspaceIntakeCandidate } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";

import type {
  DeliveryCloseoutEvent,
  DeliveryCloseoutWorkspaceCandidate,
} from "../../../../../live-runtime/delivery-closeout-live-types.ts";

export function deliveryWorkspaceIntakeCandidate(
  event: DeliveryCloseoutEvent | null,
): WorkspaceIntakeCandidate | null {
  if (!event || event.status !== "applied" || event.impact.kind !== "workspace_entrant") {
    return null;
  }
  const source = event.impact.candidate;
  return {
    evidence_refs: [...source.evidence_refs],
    label: source.name,
    requested_record: requestedRecord(source),
    source: {
      class: "delivery",
      digest: event.receipt.digest,
      ref: event.outcome_ref,
    },
    target: {
      kind: source.entrant_kind === "repository" ? "repo" : source.entrant_kind,
      name: source.canonical_key,
    },
  };
}

function requestedRecord(
  candidate: DeliveryCloseoutWorkspaceCandidate,
): WorkspaceIntakeCandidate["requested_record"] {
  const notes = `Candidate emitted by ${candidate.correlation_ref} after Delivery closeout.`;
  if (candidate.entrant_kind === "repository") {
    return { kind: "repo", notes, ...candidate.intake_metadata };
  }
  if (candidate.entrant_kind === "product") {
    return { kind: "product", notes, ...candidate.intake_metadata };
  }
  return { kind: "component", notes, ...candidate.intake_metadata };
}
