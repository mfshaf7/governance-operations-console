export type ArchitecturePacketDecisionStatus =
  | "architecture-ready"
  | "blocked-pending-architecture-decision"
  | "draft";

export type ArchitecturePacketRepoRevision = {
  base_ref: string;
  commit: string;
  repo: string;
};

export type ArchitecturePacketDraftInput = {
  architecture: Record<string, unknown>;
  conformance_plan: Record<string, unknown>;
  covered_work_item_ids: string[];
  decision: {
    rationale: string;
    status: ArchitecturePacketDecisionStatus;
  };
  delivery_id: string;
  repo_revisions: ArchitecturePacketRepoRevision[];
  schema_version: 1;
};

export type ArchitecturePacketArtifact = Record<string, unknown> & {
  architecture: Record<string, unknown>;
  artifact_id: string;
  artifact_type: "delivery_art_architecture_packet";
  conformance_plan: Record<string, unknown>;
  covered_work_item_ids: string[];
  custody: Record<string, unknown> & {
    state: "durable" | "local-draft";
    uri: string;
  };
  decision: Record<string, unknown> & {
    rationale: string;
    status: ArchitecturePacketDecisionStatus;
  };
  delivery_id: string;
  integrity: Record<string, unknown> & {
    content_digest: string;
  };
  operator: Record<string, unknown> & {
    id: string;
  };
  schema_version: 1 | 2 | 3 | 4 | 5 | 6;
  source_snapshot: Record<string, unknown> & {
    repo_revisions: ArchitecturePacketRepoRevision[];
  };
};

export type ArchitecturePacketDraftResult = {
  architecture_packet: ArchitecturePacketArtifact;
  source_snapshot: {
    art_digest: string;
    covered_record_count: number;
    dependency_record_count: number;
    relation_count: number;
  };
  workflow_id: "delivery-art-architecture-packet-draft";
};

export type ArchitecturePacketPersistResult = {
  artifact: ArchitecturePacketArtifact;
  custody_receipt: Record<string, unknown>;
  owner_receipt: Record<string, unknown>;
  workflow_id: "delivery-art-architecture-packet-persist";
};

export type ArchitecturePacketCurrentResult = {
  artifact: ArchitecturePacketArtifact;
  contract_posture: "current" | "historical-read-only";
  custody_receipt: Record<string, unknown>;
  projected_reference: Record<string, unknown>;
  workflow_id: "delivery-art-architecture-packet-current";
};

export type ArchitecturePacketApiResult =
  | ArchitecturePacketCurrentResult
  | ArchitecturePacketDraftResult
  | ArchitecturePacketPersistResult;

export type ArchitecturePacketApiSnapshot = {
  error: string | null;
  mode: "disconnected-preview" | "live";
  observedAt: string;
  result: ArchitecturePacketApiResult | null;
  status: "current" | "offline";
};

export type ArchitecturePacketApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};
