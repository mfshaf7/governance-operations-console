export type OperationEvidenceState =
  | "blocked"
  | "clear"
  | "informational"
  | "missing"
  | "reference"
  | "review"
  | "stale";

export type OperationEvidenceSourceKind =
  "artifact" | "operator" | "receipt" | "source-record" | "system";

export type OperationEvidenceSource = {
  kind: OperationEvidenceSourceKind;
  label: string;
  ref?: string;
};

export type OperationEvidenceSignal = {
  detail: string;
  id: string;
  label: string;
  observedAt?: string;
  owner?: string;
  requiredAction?: string;
  source: OperationEvidenceSource;
  state: OperationEvidenceState;
};
