import type {
  ArchitecturePacketApiError,
  ArchitecturePacketApiSnapshot,
  ArchitecturePacketArtifact,
  ArchitecturePacketCurrentResult,
  ArchitecturePacketDraftInput,
  ArchitecturePacketDraftResult,
  ArchitecturePacketPersistResult,
  ArchitecturePacketRepoRevision,
} from "./architecture-packet-live-types.ts";

const deliveryIdPattern = /^delivery-[1-9][0-9]*$/;
const workItemIdPattern = /^work-item-[1-9][0-9]*$/;
const repoPattern = /^[a-z0-9][a-z0-9-]*$/;
const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const wgcfArtifactPattern = /^wgcf:\/\/artifacts\/delivery-art\/sha256\/[0-9a-f]{64}$/;
const localArtifactPattern = /^local:\/\/delivery-art\/[A-Za-z0-9._:-]+\.json$/;

const architectureSections = [
  ["descendant_owner_map", "ownership map", "non-empty-array"],
  ["landing_units", "Landing Units", "non-empty-array"],
  ["source_landing_graph", "source landing graph", "record"],
  ["work_item_execution_plan", "work-item execution plan", "non-empty-array"],
  ["lifecycle_state_model", "lifecycle state model", "record"],
  [
    "authorization_session_execution_model",
    "authorization and execution model",
    "record",
  ],
  ["evidence_receipt_handoffs", "evidence handoffs", "array"],
  ["runtime_boundaries", "runtime boundaries", "non-empty-array"],
  ["required_human_gates", "human gates", "array"],
  ["runtime_activation_chains", "runtime activation chains", "array"],
  [
    "rollback_cleanup_terminal_conditions",
    "rollback and terminal conditions",
    "record",
  ],
  ["contradictions_open_decisions", "contradictions and decisions", "array"],
] as const;

const conformanceSections = [
  ["protocol_applicability", "protocol applicability", "record"],
  ["dimensions", "conformance dimensions", "non-empty-array"],
  [
    "work_item_dimension_applicability",
    "work-item dimension applicability",
    "non-empty-array",
  ],
  ["git_causality", "Git causality", "record"],
  ["cases", "executable conformance cases", "non-empty-array"],
] as const;

export function architecturePacketDraftIssues(
  input: ArchitecturePacketDraftInput,
  { requireApproval = false } = {},
) {
  const issues: string[] = [];
  if (!deliveryIdPattern.test(input.delivery_id)) {
    issues.push("Delivery identity must look like delivery-1275.");
  }
  if (
    input.covered_work_item_ids.length === 0 ||
    input.covered_work_item_ids.some((value) => !workItemIdPattern.test(value)) ||
    new Set(input.covered_work_item_ids).size !== input.covered_work_item_ids.length
  ) {
    issues.push("Covered work items must be unique work-item identifiers.");
  }
  if (
    input.repo_revisions.length === 0 ||
    input.repo_revisions.some((revision) =>
      !repoPattern.test(revision.repo) ||
      !revision.base_ref.trim() ||
      !commitPattern.test(revision.commit))
  ) {
    issues.push("Repository revisions must bind repo, base ref, and exact commit.");
  }
  for (const [key, label, shape] of architectureSections) {
    if (!matchesShape(input.architecture[key], shape)) {
      issues.push(`Architecture ${label} is incomplete.`);
    }
  }
  if (typeof input.conformance_plan.required !== "boolean") {
    issues.push("Conformance requirement must be explicit.");
  }
  for (const [key, label, shape] of conformanceSections) {
    if (!matchesShape(input.conformance_plan[key], shape)) {
      issues.push(`Conformance ${label} is incomplete.`);
    }
  }
  if (input.decision.rationale.trim().length < 20) {
    issues.push("Operator rationale must explain the architecture decision.");
  }
  if (requireApproval && input.decision.status !== "architecture-ready") {
    issues.push("Operator approval is required before persistence.");
  }
  return issues;
}

export function assertArchitecturePacketDraftInput(
  value: unknown,
): ArchitecturePacketDraftInput {
  const input = record(value, "Architecture Packet draft input");
  exactKeys(input, [
    "architecture",
    "conformance_plan",
    "covered_work_item_ids",
    "decision",
    "delivery_id",
    "repo_revisions",
    "schema_version",
  ], "Architecture Packet draft input");
  exact(input.schema_version, 1, "draft schema version");
  match(input.delivery_id, deliveryIdPattern, "Delivery identity");
  workItemIds(input.covered_work_item_ids, "covered work items");
  if (!Array.isArray(input.repo_revisions) || input.repo_revisions.length === 0) {
    invalid("Architecture Packet repository revisions are required.");
  }
  for (const revision of input.repo_revisions) {
    assertRepoRevision(revision);
  }
  record(input.architecture, "architecture design");
  record(input.conformance_plan, "conformance plan");
  const decision = record(input.decision, "operator decision");
  exactKeys(decision, ["rationale", "status"], "operator decision");
  oneOf(
    decision.status,
    ["draft", "architecture-ready", "blocked-pending-architecture-decision"],
    "operator decision status",
  );
  text(decision.rationale, "operator decision rationale");
  const typed = value as ArchitecturePacketDraftInput;
  const issues = architecturePacketDraftIssues(typed, {
    requireApproval: typed.decision.status === "architecture-ready",
  });
  if (issues.length > 0) {
    invalid(issues.join(" "));
  }
  return typed;
}

export function assertArchitecturePacketArtifact(
  value: unknown,
  options: {
    custodyState?: "durable" | "local-draft";
    decisionStatus?: "architecture-ready" | "blocked-pending-architecture-decision" | "draft";
    operatorId?: string;
    schemaVersion?: 6;
  } = {},
): ArchitecturePacketArtifact {
  const artifact = record(value, "Architecture Packet artifact");
  oneOf(
    artifact.schema_version,
    [1, 2, 3, 4, 5, 6],
    "Architecture Packet schema version",
  );
  if (
    options.schemaVersion !== undefined &&
    artifact.schema_version !== options.schemaVersion
  ) {
    invalid(`Architecture Packet schema version must be ${options.schemaVersion}.`);
  }
  exact(
    artifact.artifact_type,
    "delivery_art_architecture_packet",
    "Architecture Packet artifact type",
  );
  text(artifact.artifact_id, "Architecture Packet identity");
  match(artifact.delivery_id, deliveryIdPattern, "Architecture Packet Delivery identity");
  workItemIds(artifact.covered_work_item_ids, "Architecture Packet covered work items");
  const operator = record(artifact.operator, "Architecture Packet operator");
  text(operator.id, "Architecture Packet operator identity");
  if (options.operatorId !== undefined && operator.id !== options.operatorId) {
    invalid("Architecture Packet operator does not match the server-bound operator.");
  }
  const sourceSnapshot = record(
    artifact.source_snapshot,
    "Architecture Packet source snapshot",
  );
  if (
    !Array.isArray(sourceSnapshot.repo_revisions) ||
    sourceSnapshot.repo_revisions.length === 0
  ) {
    invalid("Architecture Packet repository revisions are missing.");
  }
  for (const revision of sourceSnapshot.repo_revisions) assertRepoRevision(revision);
  const architecture = record(artifact.architecture, "Architecture Packet design");
  const conformance = record(
    artifact.conformance_plan,
    "Architecture Packet conformance plan",
  );
  const decision = record(artifact.decision, "Architecture Packet decision");
  oneOf(
    decision.status,
    ["draft", "architecture-ready", "blocked-pending-architecture-decision"],
    "Architecture Packet decision status",
  );
  text(decision.rationale, "Architecture Packet decision rationale");
  if (options.decisionStatus !== undefined && decision.status !== options.decisionStatus) {
    invalid(`Architecture Packet decision must be ${options.decisionStatus}.`);
  }
  const integrity = record(artifact.integrity, "Architecture Packet integrity");
  match(integrity.content_digest, digestPattern, "Architecture Packet digest");
  const custody = record(artifact.custody, "Architecture Packet custody");
  oneOf(custody.state, ["durable", "local-draft"], "Architecture Packet custody state");
  if (options.custodyState !== undefined && custody.state !== options.custodyState) {
    invalid(`Architecture Packet custody must be ${options.custodyState}.`);
  }
  match(
    custody.uri,
    custody.state === "durable" ? wgcfArtifactPattern : localArtifactPattern,
    "Architecture Packet custody URI",
  );
  const editable = {
    architecture,
    conformance_plan: conformance,
    covered_work_item_ids: artifact.covered_work_item_ids as string[],
    decision: {
      rationale: decision.rationale as string,
      status: decision.status as ArchitecturePacketDraftInput["decision"]["status"],
    },
    delivery_id: artifact.delivery_id as string,
    repo_revisions: sourceSnapshot.repo_revisions as ArchitecturePacketRepoRevision[],
    schema_version: 1 as const,
  };
  if (artifact.schema_version === 6) {
    const issues = architecturePacketDraftIssues(editable, {
      requireApproval: decision.status === "architecture-ready",
    });
    if (issues.length > 0) invalid(issues.join(" "));
  }
  return value as ArchitecturePacketArtifact;
}

export function assertArchitecturePacketDraftResult(
  value: unknown,
): ArchitecturePacketDraftResult {
  const result = record(value, "Architecture Packet draft result");
  exact(
    result.workflow_id,
    "delivery-art-architecture-packet-draft",
    "Architecture Packet draft workflow",
  );
  assertArchitecturePacketArtifact(result.architecture_packet, {
    custodyState: "local-draft",
    schemaVersion: 6,
  });
  const snapshot = record(result.source_snapshot, "Architecture Packet source snapshot summary");
  match(snapshot.art_digest, digestPattern, "ART snapshot digest");
  positiveInteger(snapshot.covered_record_count, "covered record count");
  nonNegativeInteger(snapshot.dependency_record_count, "dependency record count");
  nonNegativeInteger(snapshot.relation_count, "relation count");
  return value as ArchitecturePacketDraftResult;
}

export function assertArchitecturePacketPersistResult(
  value: unknown,
): ArchitecturePacketPersistResult {
  const result = record(value, "Architecture Packet persistence result");
  exact(
    result.workflow_id,
    "delivery-art-architecture-packet-persist",
    "Architecture Packet persistence workflow",
  );
  assertArchitecturePacketArtifact(result.artifact, {
    custodyState: "durable",
    decisionStatus: "architecture-ready",
    schemaVersion: 6,
  });
  record(result.custody_receipt, "Architecture Packet custody receipt");
  record(result.owner_receipt, "Architecture Packet owner receipt");
  return value as ArchitecturePacketPersistResult;
}

export function assertArchitecturePacketCurrentResult(
  value: unknown,
): ArchitecturePacketCurrentResult {
  const result = record(value, "current Architecture Packet result");
  exact(
    result.workflow_id,
    "delivery-art-architecture-packet-current",
    "current Architecture Packet workflow",
  );
  oneOf(
    result.contract_posture,
    ["current", "historical-read-only"],
    "Architecture Packet contract posture",
  );
  const artifact = assertArchitecturePacketArtifact(result.artifact, {
    custodyState: "durable",
    ...(result.contract_posture === "current" ? { schemaVersion: 6 as const } : {}),
  });
  if (
    result.contract_posture === "historical-read-only" &&
    artifact.schema_version === 6
  ) {
    invalid("A schema-v6 Architecture Packet cannot be projected as historical-only.");
  }
  record(result.custody_receipt, "Architecture Packet custody receipt");
  record(result.projected_reference, "Architecture Packet projected reference");
  return value as ArchitecturePacketCurrentResult;
}

export function assertArchitecturePacketApiSnapshot(
  value: unknown,
): ArchitecturePacketApiSnapshot {
  const snapshot = record(value, "Architecture Packet API snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "Architecture Packet mode");
  oneOf(snapshot.status, ["current", "offline"], "Architecture Packet status");
  dateTime(snapshot.observedAt, "Architecture Packet observation time");
  if (snapshot.error !== null) text(snapshot.error, "Architecture Packet error");
  if (snapshot.result !== null) {
    const result = record(snapshot.result, "Architecture Packet result");
    if (result.workflow_id === "delivery-art-architecture-packet-draft") {
      assertArchitecturePacketDraftResult(result);
    } else if (result.workflow_id === "delivery-art-architecture-packet-persist") {
      assertArchitecturePacketPersistResult(result);
    } else if (result.workflow_id === "delivery-art-architecture-packet-current") {
      assertArchitecturePacketCurrentResult(result);
    } else {
      invalid("Architecture Packet workflow is not recognized.");
    }
  }
  return value as ArchitecturePacketApiSnapshot;
}

export function isArchitecturePacketApiError(
  value: unknown,
): value is ArchitecturePacketApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function assertRepoRevision(value: unknown) {
  const revision = record(value, "repository revision");
  exactKeys(revision, ["base_ref", "commit", "repo"], "repository revision");
  match(revision.repo, repoPattern, "repository name");
  text(revision.base_ref, "repository base ref");
  match(revision.commit, commitPattern, "repository commit");
}

function matchesShape(
  value: unknown,
  shape: "array" | "non-empty-array" | "record",
) {
  if (shape === "array") return Array.isArray(value);
  if (shape === "non-empty-array") return Array.isArray(value) && value.length > 0;
  return isRecord(value);
}

function workItemIds(value: unknown, label: string) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !workItemIdPattern.test(item)) ||
    new Set(value).size !== value.length
  ) {
    invalid(`${label} are invalid.`);
  }
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    invalid(`${label} has unexpected or missing fields.`);
  }
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function match(value: unknown, pattern: RegExp, label: string) {
  if (typeof value !== "string" || !pattern.test(value)) invalid(`${label} is invalid.`);
}

function dateTime(value: unknown, label: string) {
  text(value, label);
  if (Number.isNaN(Date.parse(value as string))) invalid(`${label} is invalid.`);
}

function positiveInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) invalid(`${label} is invalid.`);
}

function nonNegativeInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) invalid(`${label} is invalid.`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new Error(message);
}
