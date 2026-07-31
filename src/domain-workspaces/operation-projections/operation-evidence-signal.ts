import type { OperationTone } from "./operation-view-types.ts";
import type {
  OperationEvidenceSignal,
  OperationEvidenceState,
} from "../operation-contracts/operation-evidence.ts";

export type {
  OperationEvidenceSignal,
  OperationEvidenceSource,
  OperationEvidenceSourceKind,
  OperationEvidenceState,
} from "../operation-contracts/operation-evidence.ts";

export function operationEvidenceDetail(evidence: OperationEvidenceSignal) {
  const source = evidence.source.ref
    ? `${evidence.source.label} (${evidence.source.ref})`
    : evidence.source.label;

  return [
    evidence.detail,
    `Source: ${source}.`,
    evidence.owner ? `Owner: ${evidence.owner}.` : null,
    evidence.requiredAction
      ? `Required action: ${evidence.requiredAction}`
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function operationEvidenceStateLabel(state: OperationEvidenceState) {
  switch (state) {
    case "blocked":
      return "blocked";
    case "clear":
      return "clear";
    case "informational":
      return "info";
    case "missing":
      return "missing";
    case "reference":
      return "reference";
    case "review":
      return "review";
    case "stale":
      return "stale";
  }
}

export function operationEvidenceStateTone(
  state: OperationEvidenceState,
): OperationTone {
  switch (state) {
    case "blocked":
      return "danger";
    case "clear":
      return "ok";
    case "informational":
      return "info";
    case "missing":
    case "review":
      return "warn";
    case "reference":
      return "muted";
    case "stale":
      return "stale";
  }
}
