import type { DeliveryWorkSessionRecovery } from "./delivery-work-session-live-types.ts";
import type {
  DeliveryWorkSessionDecision,
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionLiveApiError,
  DeliveryWorkSessionProjection,
  DeliveryWorkSessionSnapshot,
} from "./delivery-work-session-live-types.ts";

const commandIdPattern = /^work-session-command:[A-Za-z0-9._:-]+$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const gitCommitPattern = /^[a-f0-9]{40}$/;
const identifierPattern = /^[a-z0-9][a-z0-9._:-]*$/;
const repoPattern = /^[a-z0-9][a-z0-9-]*$/;
const workItemIdPattern = /^work-item-[1-9][0-9]*$/;

export function deliveryWorkSessionTargetId(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    invalid("Delivery work-session target is invalid.");
  }
  return Number(value);
}

export function assertDeliveryWorkSessionSnapshot(
  value: unknown,
): DeliveryWorkSessionSnapshot {
  const snapshot = record(value, "Delivery work-session snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "snapshot mode");
  oneOf(snapshot.status, ["current", "offline"], "snapshot status");
  dateTime(snapshot.observedAt, "snapshot observation time");
  if (snapshot.error !== null && typeof snapshot.error !== "string") {
    invalid("Delivery work-session snapshot error is invalid.");
  }
  if (snapshot.projection !== null) {
    assertDeliveryWorkSessionProjection(snapshot.projection);
  }
  return value as DeliveryWorkSessionSnapshot;
}

export function assertDeliveryWorkSessionProjection(
  value: unknown,
): DeliveryWorkSessionProjection {
  const projection = record(value, "Delivery work-session projection");
  exact(
    projection.workflow_id,
    "delivery-art-work-session",
    "projection workflow",
  );
  workItemId(projection.work_item_id, "projection work item");
  if (projection.covered_work_item_ids !== undefined) {
    workItemIdList(projection.covered_work_item_ids, "projection covered work items");
  }
  nullableText(projection.delivery_id, "projection delivery identity");
  nullableText(projection.landing_unit_id, "projection Landing Unit identity");
  nullableText(projection.session_id, "projection session identity");
  nullableDateTime(projection.session_revision, "projection session revision");
  if (projection.pending_rebuild !== undefined) {
    const pending = record(projection.pending_rebuild, "pending rebuild");
    match(pending.command_id, /^work-session-command:[A-Za-z0-9._:-]{1,179}$/, "pending rebuild command");
    dateTime(pending.expected_session_revision, "pending rebuild revision");
    if (!projection.session_id) invalid("A pending rebuild requires a recorded work session.");
  }
  if (projection.source_authorization !== undefined) {
    const binding = record(projection.source_authorization, "source authorization");
    match(binding.intent_ref, /^source-intent:[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,241}$/, "source authorization intent");
    const terminalReceipt = projection.state === "closed" ? projection.cleanup_receipt
      : projection.state === "recovery-recorded" ? projection.recovery_receipt : undefined;
    const closedSession = terminalReceipt !== undefined ? record(terminalReceipt, "terminal receipt").session_id : null;
    if (binding.session_id !== projection.session_id && (!closedSession || binding.session_id !== closedSession)) {
      invalid("Source authorization belongs to another session.");
    }
    if (binding.revision !== undefined) dateTime(binding.revision, "source authorization revision");
  }
  if (projection.source_access_scope !== undefined) {
    const scope = record(projection.source_access_scope, "source access scope");
    if (!projection.session_id) invalid("Source access scope requires a work session.");
    workItemId(scope.work_item_ref, "source access work item");
    if (!(projection.covered_work_item_ids as unknown[] | undefined ?? [projection.work_item_id]).includes(scope.work_item_ref)) {
      invalid("Source access belongs to another work session.");
    }
    match(scope.source_start_digest, digestPattern, "source access binding");
    if (scope.predecessor_intent_ref !== undefined) {
      match(scope.predecessor_intent_ref, /^source-intent:[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,241}$/, "previous source authorization");
    }
  }
  text(projection.state, "projection state");
  if (projection.next_action !== null) {
    const action = record(projection.next_action, "projection next action");
    text(action.authority, "next-action authority");
    text(action.code, "next-action code");
    text(action.reason, "next-action reason");
    if (action.inputs !== undefined) {
      record(action.inputs, "next-action inputs");
    }
  }
  if (projection.decision_draft !== undefined) {
    assertDeliveryWorkSessionDecision(projection.decision_draft, true);
  }
  if (projection.source !== undefined) {
    const source = record(projection.source, "projection source");
    match(source.base_commit, gitCommitPattern, "source base commit");
    text(source.branch, "source branch");
    stringList(source.changed_files, "source changed files");
    match(source.head_commit, gitCommitPattern, "source head commit");
    text(source.state, "source state");
    if (source.upstream_commit !== null) {
      match(source.upstream_commit, gitCommitPattern, "source upstream commit");
    }
  }
  if (projection.facts !== undefined) {
    const facts = record(projection.facts, "projection facts");
    for (const value of Object.values(facts)) {
      text(value, "projection fact");
    }
  }
  if (projection.projection !== undefined) {
    const lifecycle = record(
      projection.projection,
      "lifecycle projection",
    );
    if (lifecycle.complete !== undefined && typeof lifecycle.complete !== "boolean") {
      invalid("Lifecycle projection completion is invalid.");
    }
    if (lifecycle.gate !== undefined && lifecycle.gate !== null) {
      text(lifecycle.gate, "lifecycle projection gate");
    }
    if (lifecycle.state !== undefined) {
      text(lifecycle.state, "lifecycle projection state");
    }
    if (lifecycle.summary !== undefined) {
      text(lifecycle.summary, "lifecycle projection summary");
    }
  }
  if (projection.pull_request !== undefined) {
    const pullRequest = record(projection.pull_request, "pull-request projection");
    text(pullRequest.state, "pull-request state");
  }
  if (projection.operating_verification !== undefined) {
    const binding = record(projection.operating_verification, "reviewed verification");
    const source = record(binding.source, "verification source");
    const verifier = record(binding.verifier, "reviewed verifier");
    const pr = record(projection.pull_request, "verification pull request");
    const action = record(projection.next_action, "verification next action");
    if (action.code !== "acquire-operating-evidence" || pr.state !== "merged" ||
        source.pull_request_url !== pr.url || source.head_commit !== pr.head_commit || source.merge_commit !== pr.merge_commit) {
      invalid("Reviewed verification does not match the recorded merged pull request.");
    }
    const pullRequestUrl = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/;
    match(source.pull_request_url, pullRequestUrl, "original pull request");
    match(verifier.pull_request_url, pullRequestUrl, "verifier pull request");
    match(source.head_commit, gitCommitPattern, "original reviewed head");
    match(source.merge_commit, gitCommitPattern, "original merge");
    match(verifier.revision, gitCommitPattern, "verifier revision");
    match(binding.review_packet_digest, digestPattern, "original Review Packet");
    match(binding.digest, digestPattern, "reviewed verification binding");
    if (!Array.isArray(binding.cases) || !binding.cases.length || binding.cases.length > 24) invalid("Reviewed verification cases are invalid.");
    const cases = binding.cases as unknown[];
    const ids = cases.map(value => {
      const testCase = record(value, "verification case");
      text(testCase.id, "verification case id");
      text(testCase.title, "verification case title");
      return testCase.id;
    });
    if (new Set(ids).size !== ids.length) invalid("Reviewed verification cases must be distinct.");
  }
  if (projection.agent_source !== undefined) {
    const agentSource = record(projection.agent_source, "Agent source projection");
    text(agentSource.state, "Agent source state");
  }
  if (projection.cleanup !== undefined) {
    const cleanup = record(projection.cleanup, "cleanup projection");
    text(cleanup.state, "cleanup state");
    if (cleanup.attempt !== undefined) {
      nonNegativeInteger(cleanup.attempt, "cleanup attempt");
    }
    if (cleanup.resources !== undefined) {
      if (!Array.isArray(cleanup.resources)) {
        invalid("Cleanup resources are invalid.");
      }
      for (const value of cleanup.resources) {
        const resource = record(value, "cleanup resource");
        for (const key of ["outcome", "resource_id", "resource_type"] as const) {
          if (resource[key] !== undefined) text(resource[key], `cleanup resource ${key}`);
        }
        if (resource.last_error !== undefined && resource.last_error !== null) {
          text(resource.last_error, "cleanup resource error");
        }
      }
    }
  }
  if (projection.cleanup_receipt !== undefined) {
    const receipt = record(projection.cleanup_receipt, "cleanup receipt");
    text(receipt.outcome, "cleanup receipt outcome");
  }
  if (projection.closeout !== undefined) {
    const closeout = record(projection.closeout, "Landing Unit closeout");
    oneOf(closeout.state, ["complete", "partial_failure"], "closeout state");
    workItemIdList(closeout.covered_work_item_ids, "closeout covered work items");
    nullableText(closeout.packet_digest, "closeout packet digest");
    nullableText(closeout.packet_id, "closeout packet identity");
    ancestorDispositions(closeout.ancestor_dispositions);
    closeoutEntries(closeout.completed, "completed closeout item", "work_item_id");
    closeoutEntries(closeout.failed, "failed closeout item", null);
    closeoutEntries(closeout.parent_closeouts, "parent closeout item", "parent_id");
    closeoutEntries(closeout.skipped_work_items, "skipped closeout item", "work_item_id");
    initiativeDisposition(closeout.initiative_disposition);
  }
  if (projection.lifecycle_context !== undefined) {
    const context = record(projection.lifecycle_context, "lifecycle context");
    if (typeof context.commissioned !== "boolean") {
      invalid("Lifecycle context commissioning state is invalid.");
    }
    exact(context.default_mode, "packet", "lifecycle context mode");
    if (context.latest_binding !== null) {
      record(context.latest_binding, "lifecycle context binding");
    }
    const measurements = record(
      context.measurements,
      "lifecycle context measurements",
    );
    for (const key of ["denied_count", "packet_count", "raw_fallback_count"] as const) {
      nonNegativeInteger(measurements[key], `lifecycle context ${key}`);
    }
  }
  if (projection.configured_path !== undefined) {
    record(projection.configured_path, "configured path projection");
  }
  if (projection.work_contract !== undefined) {
    record(projection.work_contract, "work contract projection");
  }
  if (projection.command_receipt !== undefined) {
    const receipt = record(
      projection.command_receipt,
      "work-session command receipt",
    );
    match(receipt.command_id, commandIdPattern, "receipt command identity");
    text(receipt.caller_id, "receipt caller identity");
    dateTime(receipt.completed_at, "receipt completion time");
    match(receipt.digest, digestPattern, "receipt digest");
    text(receipt.executor_id, "receipt executor identity");
    text(receipt.operator_id, "receipt operator identity");
    match(
      receipt.ref,
      /^oos:\/\/delivery-art\/work-session-command-receipts\//,
      "receipt reference",
    );
    match(receipt.request_digest, digestPattern, "receipt request digest");
    text(receipt.result_state, "receipt result state");
    workItemId(receipt.work_item_id, "receipt work item");
  }
  return value as DeliveryWorkSessionProjection;
}

function checkArchitectureLocation(value: unknown) {
  const location = record(value, "architecture artifact location");
  if (Object.hasOwn(location, "recorded_artifact_digest")) {
    if (Object.keys(location).length !== 1) invalid("The recorded plan binding contains unexpected fields.");
    match(location.recorded_artifact_digest, digestPattern, "recorded Technical Plan digest");
  } else {
    match(location.repo, repoPattern, "architecture artifact repo");
    relativePath(location.relative_path, "architecture artifact path");
  }
}

export function assertDeliveryWorkSessionDecision(
  value: unknown,
  allowDraft = false,
): DeliveryWorkSessionDecision {
  const decision = record(value, "Delivery work-session decision");
  exact(decision.schema_version, 1, "decision schema version");
  exact(
    decision.artifact_type,
    "delivery_art_work_session_decision",
    "decision artifact type",
  );
  workItemId(decision.work_item_id, "decision work item");
  text(decision.caller_id, "decision caller identity");
  workItemIdList(decision.covered_work_item_ids, "covered work items");
  const operator = record(decision.operator, "decision operator");
  text(operator.id, "decision operator identity");
  oneOf(
    operator.decision_source,
    ["operator", "approved-ai-suggestion"],
    "decision source",
  );
  const landingUnit = record(decision.landing_unit, "decision Landing Unit");
  for (const key of [
    "base_ref",
    "branch",
    "id",
    "rollback_boundary",
    "split_reason",
  ]) {
    text(landingUnit[key], `Landing Unit ${key.replaceAll("_", " ")}`);
  }
  match(landingUnit.id, identifierPattern, "Landing Unit identity");
  oneOf(
    landingUnit.decision,
    ["child_isolated_landing_unit", "feature_single_landing_unit"],
    "Landing Unit decision",
  );
  const architecture = record(decision.architecture, "decision architecture");
  if (
    architecture.required !== null &&
    typeof architecture.required !== "boolean"
  ) {
    invalid("Decision architecture requirement is invalid.");
  }
  if (!allowDraft && typeof architecture.required !== "boolean") {
    invalid("Decision architecture requirement is required.");
  }
  if (architecture.artifact_location !== null) {
    checkArchitectureLocation(architecture.artifact_location);
  }
  if (!allowDraft && architecture.required && !architecture.artifact_location) {
    invalid("Required architecture must name its artifact location.");
  }
  const gates = record(
    decision.human_gate_work_item_ids,
    "decision human gates",
  );
  workItemIdList(gates.security_acceptance, "security acceptance work items");
  return value as DeliveryWorkSessionDecision;
}

export function assertDeliveryWorkSessionDecisionInput(
  value: unknown,
): DeliveryWorkSessionDecisionInput {
  const input = record(value, "Delivery work-session decision input");
  if (input.coveredWorkItemIds !== undefined) {
    workItemIdList(input.coveredWorkItemIds, "covered ART items");
    const covered = input.coveredWorkItemIds as string[];
    if (covered.length === 0 || new Set(covered).size !== covered.length) {
      invalid("Covered ART items must be non-empty and unique.");
    }
  }
  oneOf(
    input.landingUnitDecision,
    ["child_isolated_landing_unit", "feature_single_landing_unit"],
    "Landing Unit decision",
  );
  for (const [key, label] of [
    ["branch", "branch"],
    ["landingUnitId", "Landing Unit identity"],
    ["rollbackBoundary", "rollback boundary"],
    ["splitReason", "split reason"],
  ] as const) {
    text(input[key], label);
  }
  const architecture = record(input.architecture, "decision architecture");
  if (typeof architecture.required !== "boolean") {
    invalid("Decision architecture requirement is invalid.");
  }
  if (architecture.artifactLocation !== null) {
    checkArchitectureLocation(architecture.artifactLocation);
  }
  if (architecture.required && architecture.artifactLocation === null) {
    invalid("Required architecture must name its artifact location.");
  }
  return value as DeliveryWorkSessionDecisionInput;
}

export function isDeliveryWorkSessionLiveApiError(
  value: unknown,
): value is DeliveryWorkSessionLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function dateTime(value: unknown, label: string) {
  text(value, label);
  if (Number.isNaN(Date.parse(value as string))) invalid(`${label} is invalid.`);
}

function closeoutEntries(
  value: unknown,
  label: string,
  requiredId: "parent_id" | "work_item_id" | null,
) {
  if (!Array.isArray(value)) invalid(`${label} list is invalid.`);
  for (const entry of value) {
    const item = record(entry, label);
    if (requiredId) workItemId(item[requiredId], `${label} identity`);
    for (const key of ["parent_id", "work_item_id"] as const) {
      if (item[key] !== undefined) workItemId(item[key], `${label} ${key}`);
    }
  }
}

function ancestorDispositions(value: unknown) {
  if (!Array.isArray(value)) invalid("Closeout ancestor disposition list is invalid.");
  for (const entry of value) {
    const item = record(entry, "closeout ancestor disposition");
    workItemId(item.work_item_id, "closeout ancestor work item");
    oneOf(
      item.disposition,
      [
        "closed",
        "initiative-readiness-evaluated-separately",
        "read-failed",
        "ready-for-closeout",
        "retained",
      ],
      "closeout ancestor disposition",
    );
    if (item.open_descendant_count !== undefined) {
      nonNegativeInteger(
        item.open_descendant_count,
        "closeout ancestor open descendant count",
      );
    }
    for (const key of ["reason", "status", "subject", "type"] as const) {
      if (item[key] !== undefined && item[key] !== null) {
        text(item[key], `closeout ancestor ${key}`);
      }
    }
  }
}

function initiativeDisposition(value: unknown) {
  if (value === null) return;
  const item = record(value, "closeout initiative disposition");
  text(item.delivery_id, "closeout initiative delivery identity");
  oneOf(
    item.disposition,
    [
      "closed",
      "ready-for-closeout",
      "retained-closeout-gates",
      "retained-open-work",
    ],
    "closeout initiative disposition",
  );
  for (const key of ["blocked_count", "open_descendant_count"] as const) {
    if (item[key] !== null) {
      nonNegativeInteger(item[key], `closeout initiative ${key}`);
    }
  }
  nullableText(item.epic_status, "closeout initiative status");
  if (typeof item.ready_for_closeout !== "boolean") {
    invalid("Closeout initiative readiness is invalid.");
  }
  stringList(item.reasons, "closeout initiative reasons");
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function invalid(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function match(value: unknown, pattern: RegExp, label: string) {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid(`${label} is invalid.`);
  }
}

function nullableDateTime(value: unknown, label: string) {
  if (value !== null) dateTime(value, label);
}

function nonNegativeInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    invalid(`${label} is invalid.`);
  }
}

function nullableText(value: unknown, label: string) {
  if (value !== null) text(value, label);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function relativePath(value: unknown, label: string) {
  text(value, label);
  const path = value as string;
  if (
    path.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.split("/").includes("..")
  ) {
    invalid(`${label} is invalid.`);
  }
}

function stringList(value: unknown, label: string) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    invalid(`${label} is invalid.`);
  }
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function workItemId(value: unknown, label: string) {
  match(value, workItemIdPattern, label);
}

function workItemIdList(value: unknown, label: string) {
  if (!Array.isArray(value)) invalid(`${label} is invalid.`);
  for (const item of value as unknown[]) workItemId(item, label);
}

export function assertDeliveryWorkSessionRecovery(value: unknown, revision: string): DeliveryWorkSessionRecovery {
  const input = record(value, "recovery decision");
  const unmerged = input.mode === "archive-unmerged";
  const keys = ["session_id", "session_revision", "reason", "pull_request", ...(unmerged ? ["mode", "source"] : input.mode === "archive-merged-evidence" ? ["mode"] : [])];
  if (Object.keys(input).sort().join() !== keys.sort().join() || !/^work-session:delivery-[1-9][0-9]*:[a-z0-9][a-z0-9._:-]*$/.test(String(input.session_id)) ||
    input.session_revision !== revision || !Number.isFinite(Date.parse(revision)) || typeof input.reason !== "string" || input.reason.trim().length < 20 || input.reason.length > 4000) invalid("Review the exact session and give a substantive recovery reason.");
  if (unmerged) {
    const source = record(input.source, "recovery source");
    if (input.pull_request !== null || Object.keys(source).sort().join() !== "local_branch_head,worktree_head" || !/^[a-f0-9]{40}$/.test(String(source.local_branch_head)) || source.worktree_head !== source.local_branch_head) invalid("Recovery must bind the same exact local branch and worktree head.");
  } else {
    const pr = record(input.pull_request, "recovery pull request");
    if (Object.keys(pr).sort().join() !== "head_commit,merge_commit,url" || typeof pr.url !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[1-9][0-9]*$/.test(pr.url) ||
      !/^[a-f0-9]{40}$/.test(String(pr.head_commit)) || !/^[a-f0-9]{40}$/.test(String(pr.merge_commit))) invalid("Recovery must bind the exact merged pull request.");
  }
  return input as DeliveryWorkSessionRecovery;
}

export function recoveryFromWorkSession(current: DeliveryWorkSessionProjection, reason: string): DeliveryWorkSessionRecovery {
  if (current.next_action?.code !== "architecture-recovery-required") invalid("Read the current session before reviewing recovery.");
  const pr = current.pull_request;
  const source = current.architecture_supersession?.pristine_proof?.source;
  const binding = pr?.state === "merged" ? {
    ...(current.facts?.review_packet === "merge-ready" ? { mode: "archive-merged-evidence" } : {}),
    pull_request: { url: pr.url, head_commit: pr.head_commit, merge_commit: pr.merge_commit },
  } : pr?.state === "missing" && source ? {
    mode: "archive-unmerged", pull_request: null,
    source: { local_branch_head: source.local_branch_head, worktree_head: source.worktree_head },
  } : {};
  return assertDeliveryWorkSessionRecovery({ ...binding, session_id: current.session_id, session_revision: current.session_revision, reason: reason.trim() }, current.session_revision ?? "");
}
