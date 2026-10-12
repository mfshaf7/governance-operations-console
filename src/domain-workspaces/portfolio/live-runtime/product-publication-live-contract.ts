import type {
  GovernedProductPublicationIntent,
  GovernedProductPublicationResult,
  ProductPublicationLiveApiError,
  ProductPublicationLiveMode,
} from "./product-publication-live-types.ts";

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const requestPattern = /^product-publication-request:[a-z0-9][a-z0-9._:-]*$/;

export class ProductPublicationLiveContractError extends Error {
  readonly code = "product_publication_projection_invalid";
}

export function assertGovernedProductPublicationIntent(
  value: unknown,
): GovernedProductPublicationIntent {
  const root = record(value, "intent");
  exactKeys(root, [
    "action",
    "current_publication_posture",
    "decided_at",
    "expected_publication_version",
    "idempotency_key",
    "manifest_source",
    "operator_reason",
    "previous_receipt",
    "request_id",
    "requested_at",
    "schema_version",
    "target_publication",
  ]);
  const schemaVersion = contractVersion(root.schema_version, "schema_version");
  const action = oneOf(root.action, ["archive", "publish", "restore", "unpublish", "update"], "action");
  if (schemaVersion === 1 && action === "restore") invalid("Restore requires Product Publication schema v2.");
  posture(root.current_publication_posture);
  timestamp(root.decided_at, "decided_at");
  timestamp(root.requested_at, "requested_at");
  if (Date.parse(String(root.decided_at)) > Date.parse(String(root.requested_at))) {
    invalid("The operator decision occurs after the request timestamp.");
  }
  nonnegativeInteger(root.expected_publication_version, "expected_publication_version");
  text(root.idempotency_key, "idempotency_key");
  text(root.operator_reason, "operator_reason");
  if (!requestPattern.test(text(root.request_id, "request_id"))) {
    invalid("The Product Publication request identity is invalid.");
  }
  manifestSource(root.manifest_source);
  target(root.target_publication);
  previousReceipt(root.previous_receipt, Number(root.expected_publication_version), schemaVersion);
  return value as GovernedProductPublicationIntent;
}

export function assertGovernedProductPublicationResult(
  value: unknown,
): GovernedProductPublicationResult {
  const root = record(value, "result");
  exactKeys(root, [
    "command",
    "command_digest",
    "cross_boundary_authority_granted",
    "evaluation",
    "history",
    "maintenance_projection",
    "next_action",
    "owner_receipt",
    "packet",
    "readiness",
    "receipt",
    "receipt_digest",
    "request_id",
    "resolution",
    "revision",
    "schema_version",
    "state",
    "workflow_id",
  ]);
  if (root.schema_version !== 1 || root.revision !== 1 || root.workflow_id !== "product-publication") {
    invalid("The Product Publication result version is unsupported.");
  }
  if (root.cross_boundary_authority_granted !== false) {
    invalid("The Product Publication result grants cross-boundary authority.");
  }
  oneOf(root.resolution, ["created", "read", "replayed"], "resolution");
  oneOf(root.state, ["applied", "rejected"], "state");
  oneOf(root.next_action, [
    "correct-owner-evidence-and-submit-new-request",
    "refresh-portfolio-projection",
  ], "next_action");
  const requestId = text(root.request_id, "request_id");
  if (!requestPattern.test(requestId)) invalid("The result request identity is invalid.");
  digest(root.command_digest, "command_digest");
  const receiptDigest = digest(root.receipt_digest, "receipt_digest");

  const command = record(root.command, "command");
  const evaluation = record(root.evaluation, "evaluation");
  const readinessEnvelope = record(root.readiness, "readiness envelope");
  const readiness = record(readinessEnvelope.readiness, "readiness");
  const ledger = record(readinessEnvelope.ledger, "readiness ledger");
  const packet = record(root.packet, "packet");
  const receipt = record(root.receipt, "receipt");
  const ownerReceipt = record(root.owner_receipt, "owner_receipt");
  const maintenance = record(root.maintenance_projection, "maintenance_projection");

  exactKeys(command, [
    "action",
    "artifact_type",
    "authority_revision",
    "current_publication_posture",
    "execution_ref",
    "expected_publication_version",
    "idempotency_key",
    "manifest_source",
    "operator_decision",
    "operator_id",
    "previous_receipt",
    "request_id",
    "requested_at",
    "schema_version",
    "security_decision",
    "session_ref",
    "target_publication",
  ]);
  const schemaVersion = contractVersion(command.schema_version, "command schema_version");
  exactKeys(evaluation, [
    "artifact_type",
    "authority_revision",
    "evaluation_digest",
    "evaluation_id",
    "execution_ref",
    "manifest_source",
    "request",
    "schema_version",
    "session_ref",
  ]);
  exactKeys(readinessEnvelope, ["ledger", "readiness"]);
  exactKeys(readiness, [
    "artifact_type",
    "authority_binding",
    "evaluated_at",
    "expires_at",
    "findings",
    "manifest_binding",
    "outcome",
    "product_id",
    "readiness_digest",
    "readiness_id",
    "request_ref",
    "schema_version",
    "secret_values_embedded",
    "target_publication",
    ...(schemaVersion === 2
      ? ["action", "current_publication_posture", "inventory_lifecycle_binding", "previous_receipt"]
      : []),
  ]);
  exactKeys(ledger, [
    "authority_revision",
    "contract_digest",
    "expires_at",
    "implementation_ref",
    "ref",
    "resolution",
    "service_identity_ref",
    "state",
  ]);
  exactKeys(packet, [
    "action",
    "artifact_type",
    "authority_refs",
    "current_publication_posture",
    "expected_publication_version",
    "grants",
    "idempotency_key",
    "manifest_binding",
    "packet_id",
    "previous_receipt",
    "product_id",
    "request_digest",
    "request_id",
    "requested_at",
    "schema_version",
    "target_publication",
    ...(schemaVersion === 2 ? ["lifecycle_history_binding"] : []),
  ]);
  exactKeys(receipt, [
    "artifact_type",
    "manifest_digest",
    "outcome",
    "owner_receipt_ref",
    "packet_id",
    "product_id",
    "publication_posture",
    "publication_version",
    "receipt_id",
    "recorded_at",
    "request_digest",
    "request_id",
    "schema_version",
    "secret_values_embedded",
    ...(schemaVersion === 2 ? ["lifecycle_history_binding", "previous_receipt"] : []),
  ]);
  exactKeys(ownerReceipt, ["digest", "uri"]);

  same(command.request_id, requestId, "command request identity");
  same(evaluation.session_ref, command.session_ref, "evaluation session");
  same(evaluation.execution_ref, command.execution_ref, "evaluation execution");
  same(evaluation.authority_revision, command.authority_revision, "evaluation authority revision");
  const evaluationRequest = record(evaluation.request, "evaluation request");
  same(evaluationRequest.request_id, requestId, "evaluation request identity");
  const requestDigest = digest(evaluationRequest.request_digest, "request_digest");
  same(packet.request_digest, requestDigest, "packet request digest");
  same(receipt.request_digest, requestDigest, "receipt request digest");
  same(packet.request_id, requestId, "packet request identity");
  same(receipt.request_id, requestId, "receipt request identity");

  const source = record(command.manifest_source, "manifest_source");
  manifestSource(source);
  const evaluationSource = record(evaluation.manifest_source, "evaluation manifest source");
  manifestSource(evaluationSource);
  same(evaluationSource, source, "evaluation manifest source");
  target(command.target_publication);
  previousReceipt(command.previous_receipt, Number(command.expected_publication_version), schemaVersion);
  if (command.artifact_type !== "product-publication-command") {
    invalid("The Product Publication command version is unsupported.");
  }
  const action = oneOf(command.action, ["archive", "publish", "restore", "unpublish", "update"], "command action");
  if (schemaVersion === 1 && action === "restore") invalid("Restore requires Product Publication schema v2.");
  if (!/^operator:[a-z0-9][a-z0-9._:-]*$/.test(text(command.operator_id, "operator_id"))) {
    invalid("The Product Publication operator identity is invalid.");
  }
  const operatorDecision = record(command.operator_decision, "operator decision");
  exactKeys(operatorDecision, ["decided_at", "decision", "reason"]);
  same(operatorDecision.decision, "approve", "operator decision");
  text(operatorDecision.reason, "operator decision reason");
  const securityDecision = record(command.security_decision, "security decision");
  exactKeys(securityDecision, ["digest", "revision", "uri"]);
  digest(securityDecision.digest, "security decision digest");
  commit(securityDecision.revision, "security decision revision");
  if (!text(securityDecision.uri, "security decision URI").startsWith("security-architecture://product-publication/decisions/")) {
    invalid("The Product Publication Security decision uses the wrong authority namespace.");
  }
  if (evaluation.schema_version !== schemaVersion || evaluation.artifact_type !== "wgcf-product-publication-evaluation") {
    invalid("The Product Publication evaluation version is unsupported.");
  }
  digest(evaluation.evaluation_digest, "evaluation digest");
  const readinessManifest = record(readiness.manifest_binding, "readiness manifest binding");
  exactKeys(readinessManifest, [
    "manifest_digest",
    "manifest_id",
    "manifest_revision",
    "owner_repo",
    "owner_revision",
    "path",
  ]);
  const packetManifest = record(packet.manifest_binding, "packet manifest binding");
  exactKeys(packetManifest, ["manifest_digest", "manifest_id", "owner_repo", "owner_revision"]);
  for (const [actual, expected, label] of [
    [readinessManifest.manifest_digest, source.manifest_digest, "readiness manifest digest"],
    [readinessManifest.owner_repo, source.repo, "readiness owner repo"],
    [readinessManifest.owner_revision, source.source_revision, "readiness owner revision"],
    [readinessManifest.manifest_revision, source.manifest_revision, "readiness manifest revision"],
    [readinessManifest.path, source.path, "readiness manifest path"],
    [packetManifest.manifest_digest, source.manifest_digest, "packet manifest digest"],
    [packetManifest.owner_repo, source.repo, "packet owner repo"],
    [packetManifest.owner_revision, source.source_revision, "packet owner revision"],
    [receipt.manifest_digest, source.manifest_digest, "receipt manifest digest"],
  ] as const) same(actual, expected, label);

  const authority = record(readiness.authority_binding, "readiness authority binding");
  exactKeys(authority, [
    "contract_digest",
    ...(schemaVersion === 2 ? ["history_digest"] : []),
    "products_digest",
    "revision",
  ]);
  digest(authority.contract_digest, "authority contract digest");
  digest(authority.products_digest, "authority products digest");
  same(authority.revision, command.authority_revision, "readiness authority revision");
  const readinessRequest = record(readiness.request_ref, "readiness request ref");
  exactKeys(readinessRequest, ["digest", "id", "idempotency_key"]);
  same(readinessRequest.id, requestId, "readiness request identity");
  same(readinessRequest.digest, requestDigest, "readiness request digest");
  same(readinessRequest.idempotency_key, command.idempotency_key, "readiness idempotency key");
  same(readiness.target_publication, command.target_publication, "readiness target publication");
  same(packet.target_publication, command.target_publication, "packet target publication");
  same(packet.current_publication_posture, command.current_publication_posture, "packet current posture");
  same(packet.previous_receipt, command.previous_receipt, "packet previous receipt");
  same(packet.expected_publication_version, command.expected_publication_version, "packet version");
  same(packet.action, command.action, "packet action");
  same(packet.product_id, readiness.product_id, "packet product identity");
  same(receipt.product_id, readiness.product_id, "receipt product identity");
  same(receipt.packet_id, packet.packet_id, "receipt packet identity");

  const grants = record(packet.grants, "packet grants");
  exactKeys(grants, [
    "lifecycle_mutation",
    "release_authority",
    "runtime_authority",
    "security_acceptance",
    "source_authority",
  ]);
  if (Object.values(grants).some((grant) => grant !== false)) {
    invalid("The Product Publication packet grants cross-boundary authority.");
  }
  if (receipt.secret_values_embedded !== false) {
    invalid("The Product Publication receipt claims embedded secret values.");
  }
  if (readiness.secret_values_embedded !== false) {
    invalid("The Product Publication readiness claims embedded secret values.");
  }
  if (readiness.schema_version !== schemaVersion || readiness.artifact_type !== "product-publication-readiness") {
    invalid("The Product Publication readiness version is unsupported.");
  }
  if (packet.schema_version !== schemaVersion || packet.artifact_type !== "product-publication-packet") {
    invalid("The Product Publication packet version is unsupported.");
  }
  if (receipt.schema_version !== schemaVersion || receipt.artifact_type !== "product-publication-receipt") {
    invalid("The Product Publication receipt version is unsupported.");
  }
  target(readiness.target_publication);
  target(packet.target_publication);
  const authorityRefs = record(packet.authority_refs, "packet authority refs");
  exactKeys(authorityRefs, [
    "operator_decision_ref",
    "readiness_receipt_ref",
    "security_decision_ref",
  ]);
  if (!text(authorityRefs.operator_decision_ref, "operator decision ref").startsWith("oos://")) {
    invalid("The operator decision reference uses the wrong authority namespace.");
  }
  if (!text(authorityRefs.readiness_receipt_ref, "readiness receipt ref").startsWith("wgcf://")) {
    invalid("The readiness receipt reference uses the wrong authority namespace.");
  }
  same(authorityRefs.security_decision_ref, securityDecision.uri, "security decision reference");
  same(root.state, receipt.outcome, "result state");
  if (root.state === "applied") {
    same(root.next_action, "refresh-portfolio-projection", "applied next action");
    same(receipt.publication_posture, record(command.target_publication, "target").posture, "applied posture");
    same(receipt.publication_version, Number(command.expected_publication_version) + 1, "applied version");
    same(readiness.outcome, "ready", "applied readiness");
  } else {
    same(root.next_action, "correct-owner-evidence-and-submit-new-request", "rejected next action");
    same(receipt.publication_posture, null, "rejected posture");
    same(receipt.publication_version, null, "rejected version");
    oneOf(readiness.outcome, ["blocked", "stale"], "rejected readiness");
  }

  const ledgerRef = record(ledger.ref, "readiness ledger ref");
  exactKeys(ledgerRef, ["digest", "uri"]);
  digest(ledgerRef.digest, "readiness ledger digest");
  same(ledgerRef.digest, readiness.readiness_digest, "readiness ledger binding");
  same(packet.authority_refs && record(packet.authority_refs, "authority refs").readiness_receipt_ref, ledgerRef.uri, "readiness receipt ref");
  same(ownerReceipt.uri, receipt.owner_receipt_ref, "owner receipt URI");
  same(ownerReceipt.digest, receiptDigest, "owner receipt digest");
  if (!Array.isArray(root.history) || root.history.length === 0) {
    invalid("The Product Publication result has no immutable history.");
  }
  maintenanceProjection(maintenance, {
    command,
    packet,
    readiness,
    receipt,
    receiptDigest,
  });
  for (const eventValue of root.history) {
    const event = record(eventValue, "history event");
    exactKeys(event, [
      "actor_id",
      "event_type",
      "occurred_at",
      "readiness_ref",
      "receipt_ref",
      "sequence",
    ]);
    positiveInteger(event.sequence, "history sequence");
    timestamp(event.occurred_at, "history occurrence");
    const historyReadinessRef = record(event.readiness_ref, "history readiness ref");
    const historyReceiptRef = record(event.receipt_ref, "history receipt ref");
    exactKeys(historyReadinessRef, ["digest", "uri"]);
    exactKeys(historyReceiptRef, ["digest", "uri"]);
    same(historyReadinessRef, ledgerRef, "history readiness ref");
    same(historyReceiptRef, ownerReceipt, "history receipt ref");
  }

  const decidedAt = timestamp(record(command.operator_decision, "operator decision").decided_at, "decided_at");
  const requestedAt = timestamp(command.requested_at, "requested_at");
  const evaluatedAt = timestamp(readiness.evaluated_at, "evaluated_at");
  const expiresAt = timestamp(readiness.expires_at, "expires_at");
  const recordedAt = timestamp(receipt.recorded_at, "recorded_at");
  if (!(decidedAt <= requestedAt && requestedAt <= evaluatedAt && evaluatedAt < expiresAt && evaluatedAt <= recordedAt)) {
    invalid("The Product Publication evidence timeline is contradictory.");
  }
  return value as GovernedProductPublicationResult;
}

export function assertProductPublicationLiveMode(
  value: unknown,
): ProductPublicationLiveMode {
  const root = record(value, "mode");
  exactKeys(root, ["mode", "reason_code"]);
  oneOf(root.mode, ["disconnected-preview", "live"], "mode");
  if (root.mode === "live" && root.reason_code !== null) invalid("Live mode has a reason code.");
  if (root.mode === "disconnected-preview") text(root.reason_code, "reason_code");
  return value as ProductPublicationLiveMode;
}

export function isProductPublicationLiveApiError(
  value: unknown,
): value is ProductPublicationLiveApiError {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as Record<string, unknown>).code === "string" &&
      typeof (value as Record<string, unknown>).error === "string",
  );
}

function maintenanceProjection(
  maintenance: Record<string, unknown>,
  bindings: {
    command: Record<string, unknown>;
    packet: Record<string, unknown>;
    readiness: Record<string, unknown>;
    receipt: Record<string, unknown>;
    receiptDigest: string;
  },
) {
  exactKeys(maintenance, [
    "evidence_posture",
    "history",
    "implications",
    "lifecycle",
    "next_action",
    "operational_health",
    "owner_route",
    "product_id",
    "publication",
    "schema_version",
  ]);
  if (maintenance.schema_version !== 1) invalid("The maintenance projection version is unsupported.");
  same(maintenance.product_id, bindings.receipt.product_id, "maintenance product identity");
  same(maintenance.operational_health, "not-projected", "maintenance operational health");

  const lifecycle = record(maintenance.lifecycle, "maintenance lifecycle");
  exactKeys(lifecycle, [
    "history_event_ref",
    "receipt_ref",
    "record_digest",
    "record_version",
    "state",
  ]);
  oneOf(lifecycle.state, ["active", "not-projected", "retired", "suspended"], "maintenance lifecycle state");
  if (lifecycle.state === "not-projected") {
    for (const key of ["history_event_ref", "receipt_ref", "record_digest", "record_version"] as const) {
      same(lifecycle[key], null, `maintenance lifecycle ${key}`);
    }
  } else {
    positiveInteger(lifecycle.record_version, "maintenance lifecycle record version");
    digest(lifecycle.record_digest, "maintenance lifecycle record digest");
    artifactRef(lifecycle.receipt_ref, "maintenance lifecycle receipt");
    historyEventRef(lifecycle.history_event_ref, "maintenance lifecycle history event");
  }

  const publication = record(maintenance.publication, "maintenance publication");
  exactKeys(publication, ["posture", "receipt_ref", "version"]);
  posture(publication.posture);
  nonnegativeInteger(publication.version, "maintenance publication version");
  if (bindings.receipt.outcome === "applied") {
    same(publication.posture, bindings.receipt.publication_posture, "maintenance publication posture");
    same(publication.version, bindings.receipt.publication_version, "maintenance publication version");
    const currentRef = artifactRef(publication.receipt_ref, "maintenance publication receipt");
    same(currentRef.id, bindings.receipt.receipt_id, "maintenance receipt identity");
    same(currentRef.digest, bindings.receiptDigest, "maintenance receipt digest");
  }

  const owner = record(maintenance.owner_route, "maintenance owner route");
  exactKeys(owner, ["manifest_digest", "manifest_id", "repo", "revision"]);
  const manifest = record(bindings.readiness.manifest_binding, "readiness manifest binding");
  same(owner.repo, manifest.owner_repo, "maintenance owner repo");
  same(owner.revision, manifest.owner_revision, "maintenance owner revision");
  same(owner.manifest_id, manifest.manifest_id, "maintenance manifest identity");
  same(owner.manifest_digest, manifest.manifest_digest, "maintenance manifest digest");

  const evidence = record(maintenance.evidence_posture, "maintenance evidence posture");
  exactKeys(evidence, ["findings", "state", "valid_until"]);
  oneOf(evidence.state, ["blocked", "ready", "stale"], "maintenance evidence state");
  timestamp(evidence.valid_until, "maintenance evidence validity");
  if (!Array.isArray(evidence.findings)) invalid("maintenance findings are invalid.");
  same(evidence.state, bindings.readiness.outcome, "maintenance readiness state");
  same(evidence.valid_until, bindings.readiness.expires_at, "maintenance readiness validity");
  same(evidence.findings, bindings.readiness.findings, "maintenance readiness findings");

  const implications = record(maintenance.implications, "maintenance implications");
  exactKeys(implications, [
    "access_restored",
    "release_restored",
    "runtime_restored",
    "security_acceptance_granted",
  ]);
  if (Object.values(implications).some((value) => value !== false)) {
    invalid("The maintenance projection grants cross-boundary restoration authority.");
  }
  same(maintenance.next_action,
    bindings.receipt.outcome === "applied"
      ? "refresh-portfolio-projection"
      : "correct-owner-evidence-and-submit-new-request",
    "maintenance next action");

  if (!Array.isArray(maintenance.history) || maintenance.history.length > 50) {
    invalid("The maintenance history window is invalid.");
  }
  let previousSequence = 0;
  let previousTime = -Infinity;
  for (const eventValue of maintenance.history) {
    const event = record(eventValue, "maintenance history event");
    exactKeys(event, [
      "action",
      "inventory_history_event_ref",
      "inventory_lifecycle_receipt_ref",
      "publication_posture",
      "publication_version",
      "receipt_ref",
      "recorded_at",
      "sequence",
    ]);
    const sequence = Number(event.sequence);
    positiveInteger(sequence, "maintenance history sequence");
    if (sequence <= previousSequence) invalid("Maintenance history is not strictly ordered.");
    previousSequence = sequence;
    const occurredAt = timestamp(event.recorded_at, "maintenance history timestamp");
    if (occurredAt < previousTime) invalid("Maintenance history timeline is contradictory.");
    previousTime = occurredAt;
    oneOf(event.action, ["archive", "publish", "restore", "unpublish", "update"], "maintenance history action");
    posture(event.publication_posture);
    positiveInteger(event.publication_version, "maintenance history publication version");
    artifactRef(event.receipt_ref, "maintenance history receipt");
    optionalArtifactRef(event.inventory_lifecycle_receipt_ref, "maintenance inventory receipt");
    optionalHistoryEventRef(event.inventory_history_event_ref, "maintenance inventory history event");
  }

  if (bindings.command.schema_version === 2) {
    const readinessLifecycle = record(bindings.readiness.inventory_lifecycle_binding, "readiness lifecycle binding");
    const packetLifecycle = record(bindings.packet.lifecycle_history_binding, "packet lifecycle binding");
    const receiptLifecycle = record(bindings.receipt.lifecycle_history_binding, "receipt lifecycle binding");
    exactKeys(readinessLifecycle, ["action", "after", "history_event_ref", "previous_event_ref", "receipt_ref"]);
    exactKeys(packetLifecycle, ["inventory_history_event_ref", "inventory_lifecycle_receipt_ref"]);
    exactKeys(receiptLifecycle, ["inventory_history_event_ref", "inventory_lifecycle_receipt_ref"]);
    same(bindings.readiness.action, bindings.command.action, "readiness maintenance action");
    same(bindings.readiness.current_publication_posture, bindings.command.current_publication_posture, "readiness current posture");
    same(bindings.readiness.previous_receipt, bindings.command.previous_receipt, "readiness previous publication binding");
    same(
      readinessLifecycle.action,
      bindings.command.action === "archive" ? "retire" : "restore",
      "inventory lifecycle action",
    );
    artifactRef(readinessLifecycle.receipt_ref, "readiness lifecycle receipt");
    historyEventRef(readinessLifecycle.history_event_ref, "readiness lifecycle history event");
    optionalArtifactRef(readinessLifecycle.previous_event_ref, "readiness previous lifecycle event");
    same(packetLifecycle, receiptLifecycle, "packet and receipt lifecycle binding");
    same(packetLifecycle.inventory_lifecycle_receipt_ref, readinessLifecycle.receipt_ref, "packet lifecycle receipt binding");
    same(packetLifecycle.inventory_history_event_ref, readinessLifecycle.history_event_ref, "packet lifecycle history binding");
    same(bindings.receipt.previous_receipt, bindings.command.previous_receipt, "receipt previous publication binding");
    same(lifecycle.receipt_ref, readinessLifecycle.receipt_ref, "maintenance lifecycle receipt binding");
    same(lifecycle.history_event_ref, readinessLifecycle.history_event_ref, "maintenance lifecycle history binding");
    const after = record(readinessLifecycle.after, "readiness lifecycle after state");
    exactKeys(after, ["posture", "record_digest", "record_version"]);
    oneOf(after.posture, ["active", "retired"], "readiness lifecycle after posture");
    positiveInteger(after.record_version, "readiness lifecycle after version");
    digest(after.record_digest, "readiness lifecycle after digest");
    same(lifecycle.state, after.posture, "maintenance lifecycle posture");
    same(lifecycle.record_version, after.record_version, "maintenance lifecycle version");
    same(lifecycle.record_digest, after.record_digest, "maintenance lifecycle digest");
  }
}

function artifactRef(value: unknown, label: string) {
  const ref = record(value, label);
  exactKeys(ref, ["digest", "id"]);
  text(ref.id, `${label} id`);
  digest(ref.digest, `${label} digest`);
  return ref;
}

function historyEventRef(value: unknown, label: string) {
  const ref = record(value, label);
  exactKeys(ref, ["digest", "id", "sequence"]);
  text(ref.id, `${label} id`);
  digest(ref.digest, `${label} digest`);
  positiveInteger(ref.sequence, `${label} sequence`);
  return ref;
}

function optionalArtifactRef(value: unknown, label: string) {
  if (value !== null) artifactRef(value, label);
}

function optionalHistoryEventRef(value: unknown, label: string) {
  if (value !== null) historyEventRef(value, label);
}

function manifestSource(value: unknown) {
  const source = record(value, "manifest_source");
  exactKeys(source, ["manifest_digest", "manifest_revision", "path", "repo", "source_revision"]);
  digest(source.manifest_digest, "manifest_digest");
  commit(source.manifest_revision, "manifest_revision");
  commit(source.source_revision, "source_revision");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(text(source.repo, "repo"))) invalid("The owner repo is invalid.");
  const path = text(source.path, "path");
  if (path.startsWith("/") || path.split("/").includes("..")) invalid("The manifest path is invalid.");
}

function previousReceipt(value: unknown, expectedVersion: number, schemaVersion: 1 | 2) {
  if (expectedVersion === 0) {
    if (value !== null) invalid("Initial publication cannot bind a previous receipt.");
    return;
  }
  const previous = record(value, "previous_receipt");
  exactKeys(previous, [
    ...(schemaVersion === 2 ? ["publication_posture"] : []),
    "publication_version",
    "receipt_digest",
    "receipt_id",
  ]);
  positiveInteger(previous.publication_version, "previous publication version");
  same(previous.publication_version, expectedVersion, "previous publication version");
  digest(previous.receipt_digest, "previous receipt digest");
  text(previous.receipt_id, "previous receipt id");
  if (schemaVersion === 2) posture(previous.publication_posture);
}

function contractVersion(value: unknown, label: string): 1 | 2 {
  if (value !== 1 && value !== 2) invalid(`${label} is invalid.`);
  return value;
}

function target(value: unknown) {
  const item = record(value, "target_publication");
  exactKeys(item, ["access_class", "audience", "listing_scope", "posture"]);
  const selected = posture(item.posture);
  const tuples: Record<string, readonly unknown[]> = {
    archived: ["historical-archive", "historical", "historical-read-only"],
    client: ["client-portfolio", "authorized-clients", "client-authorized"],
    internal: ["workspace-portfolio", "workspace-operators", "workspace-authenticated"],
    public: ["public-catalog", "public", "public-anonymous"],
    unlisted: [null, null, null],
  };
  same([item.listing_scope, item.audience, item.access_class], tuples[selected], "target tuple");
}

function posture(value: unknown) {
  return oneOf(value, ["archived", "client", "internal", "public", "unlisted"], "publication posture");
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${label} is not an object.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) invalid("The Product Publication projection has unexpected or missing fields.");
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
  return value as string;
}

function timestamp(value: unknown, label: string) {
  const parsed = Date.parse(text(value, label));
  if (!Number.isFinite(parsed)) invalid(`${label} is invalid.`);
  return parsed;
}

function digest(value: unknown, label: string) {
  const selected = text(value, label);
  if (!digestPattern.test(selected)) invalid(`${label} is invalid.`);
  return selected;
}

function commit(value: unknown, label: string) {
  const selected = text(value, label);
  if (!commitPattern.test(selected)) invalid(`${label} is invalid.`);
  return selected;
}

function nonnegativeInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 0) invalid(`${label} is invalid.`);
}

function positiveInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 1) invalid(`${label} is invalid.`);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) invalid(`${label} is invalid.`);
  return value as T;
}

function same(actual: unknown, expected: unknown, label: string) {
  if (canonicalJson(actual) !== canonicalJson(expected)) invalid(`${label} does not match.`);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function invalid(message: string): never {
  throw new ProductPublicationLiveContractError(message);
}
