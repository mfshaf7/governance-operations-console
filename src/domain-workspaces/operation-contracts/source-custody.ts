export type OperationSourceCustodyClass =
  | "existing-repo"
  | "new-repo-required"
  | "non-source-work"
  | "platform-internal";

export type OperationSourceCustodyGateState =
  "blocked" | "not-required" | "pending" | "resolved";

export type OperationSourceCustody = {
  classification: OperationSourceCustodyClass;
  owner: string;
  rationale: string;
  repo_ref: string | null;
  repository_gate_state: OperationSourceCustodyGateState;
};

export type OperationResolvedSourceCustody = Omit<
  OperationSourceCustody,
  "repository_gate_state"
> & {
  repository_gate_state: Exclude<OperationSourceCustodyGateState, "pending">;
};
