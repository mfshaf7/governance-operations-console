export type PrototypeDeliverySourceCustody =
  | {
      classification: "existing-repo" | "new-repo-required";
      owner: string;
      rationale: string;
      repository_gate_state: "resolved";
      repository_mode: "existing" | "new";
      source_ref: string;
    }
  | {
      classification: "non-source-work" | "platform-internal";
      owner: string;
      rationale: string;
      repository_gate_state: "not-required";
      repository_mode: "not-required";
      source_ref: null;
    };

export type PrototypeDeliveryPacket = {
  content: {
    authorization: {
      decision: "approved";
      decision_ref: string;
      operator_id: string;
    };
    baseline: {
      baseline_id: string;
      record_digest: string;
      record_ref: string;
      schema_version: number;
      version: string;
    };
    custody: PrototypeDeliverySourceCustody;
    evidence_refs: string[];
    intent: "governed-delivery";
    posture: {
      data_mode: "mock" | "real-mutable" | "real-readonly" | "synthetic";
      mutation_boundary:
        | "external-sandbox"
        | "none"
        | "prototype-local"
        | "read-only"
        | "real-system";
      visibility_tier:
        | "client-review"
        | "operator-review"
        | "private-internal"
        | "public-demo";
    };
    rationale: string;
    source: {
      kind: "prototype";
      lifecycle: "baseline-approved";
      owner: string;
      prototype_id: string;
      record_ref: string;
      record_version: string;
      repository: string;
      revision: {
        base_commit: string;
        head_commit: string;
        ref: string;
        tree: string;
      };
    };
    target: "workspace-delivery-art";
    work: {
      excluded_scope: string[];
      included_scope: string[];
      objective: string;
      remaining_work: string[];
      title: string;
    };
  };
  packet_digest: string;
  packet_id: string;
  packet_ref: string;
  schema_version: 1;
};

export type PrototypeDeliveryApplicationResult = {
  application_id: string;
  ingress_id: string;
  operator_decision: {
    decision: "apply";
    decision_ref: string;
    operator_id: string;
  };
  readiness: {
    evaluated_at: string;
    outcome: "allow";
    receipt_id: string;
    receipt_ref: {
      digest: string;
      uri: string;
    };
  };
  receipt: {
    content_digest: string;
    custody: {
      backend: "openproject-activity";
      state: "durable";
      uri: string;
    };
    owner: "operator-orchestration-service";
    receipt_ref: string;
    recorded_at: string;
  };
  resolution: "created" | "read" | "reused";
  schema_version: 1;
  source: {
    baseline_ref: string;
    custody: PrototypeDeliverySourceCustody;
    packet_digest: string;
    packet_ref: string;
    prototype_id: string;
    record_ref: string;
    record_version: string;
  };
  target: {
    application_state: "created" | "reused";
    baseline_backlink_state: "recorded";
    owner_repo: string | null;
    prototype_backlink_state: "recorded";
    record_project: "workspace-delivery-art";
    record_ref: string;
    record_system: "openproject";
    record_type: "delivery-epic";
    record_version: number;
    source_receipt_state: "emitted";
  };
  workflow_id: "prototype-delivery-application";
};

export type PrototypeDeliveryPacketProjection = Readonly<{
  authority: "workspace-prototype-studio";
  packet: PrototypeDeliveryPacket;
}>;
