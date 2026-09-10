import { createHash } from "node:crypto";

import {
  assertPrototypeMaturityBlocker,
  assertPrototypeMaturityId,
  assertPrototypeMaturityPreparation,
  assertPrototypeMaturityRequestId,
  assertPrototypeMaturityResult,
  assertPrototypeMaturitySubmissionIntent,
  assertPrototypeMaturityTransition,
  PrototypeMaturityContractError,
  samePrototypeMaturityPreparation,
} from "../live-runtime/prototype-maturity-live-contract.ts";
import type {
  PrototypeMaturityDecision,
  PrototypeMaturityPreparation,
  PrototypeMaturityResult,
  PrototypeMaturitySubmissionIntent,
  PrototypeMaturityTransition,
} from "../live-runtime/prototype-maturity-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 2_097_152;

type PrototypeMaturityOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

type RequestOptions = Readonly<{
  config?: PrototypeMaturityOosConfig;
  fetchImpl?: typeof fetch;
}>;

export class PrototypeMaturityOosError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function prototypeMaturityOosConfigured(env = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim() && env.OOS_CALLER_SECRET?.trim());
}

export async function preparePrototypeMaturity(
  prototypeId: string,
  transition: PrototypeMaturityTransition,
  options: RequestOptions = {},
) {
  return projectPreparation(
    await request(
      "/v1/prototype-maturity/preparations",
      {
        body: JSON.stringify({
          prototype_id: assertPrototypeMaturityId(prototypeId),
          transition: assertPrototypeMaturityTransition(transition),
        }),
        method: "POST",
      },
      options,
    ),
  );
}

export async function submitPrototypeMaturity(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertPrototypeMaturitySubmissionIntent(value);
  const current = await preparePrototypeMaturity(
    intent.prototype_id,
    intent.input.transition,
    options,
  );
  if (!samePrototypeMaturityPreparation(intent.reviewed_preparation, current)) {
    throw new PrototypeMaturityOosError(
      "Prototype Studio changed after review. Refresh the promotion before submission.",
      "prototype_maturity_review_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildPrototypeMaturityCommand(intent, current, config.callerId);
  const result = projectResult(
    await request(
      "/v1/prototype-maturity/requests",
      { body: JSON.stringify(command), method: "POST" },
      { ...options, config },
    ),
    intent.request_id,
  );
  assertReturnedBinding(result, command);
  return result;
}

export async function readPrototypeMaturity(
  requestId: string,
  options: RequestOptions = {},
) {
  const id = assertPrototypeMaturityRequestId(requestId);
  return projectResult(
    await request(
      `/v1/prototype-maturity/requests/${encodeURIComponent(id)}`,
      { method: "GET" },
      options,
    ),
    id,
  );
}

export async function decidePrototypeMaturity(
  requestId: string,
  value: unknown,
  options: RequestOptions = {},
) {
  const id = assertPrototypeMaturityRequestId(requestId);
  const input = assertDecisionCommand(value);
  return projectResult(
    await request(
      `/v1/prototype-maturity/requests/${encodeURIComponent(id)}/decisions`,
      { body: JSON.stringify(input), method: "POST" },
      options,
    ),
    id,
  );
}

export async function continuePrototypeMaturity(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandPrototypeMaturity(requestId, "continue", options);
}

export async function cancelPrototypeMaturity(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandPrototypeMaturity(requestId, "cancel", options);
}

async function commandPrototypeMaturity(
  requestId: string,
  action: "cancel" | "continue",
  options: RequestOptions,
) {
  const id = assertPrototypeMaturityRequestId(requestId);
  return projectResult(
    await request(
      `/v1/prototype-maturity/requests/${encodeURIComponent(id)}/${action}`,
      { body: "{}", method: "POST" },
      options,
    ),
    id,
  );
}

export function buildPrototypeMaturityCommand(
  intent: PrototypeMaturitySubmissionIntent,
  preparation: PrototypeMaturityPreparation,
  callerId: string,
) {
  const transition = intent.input.transition;
  const sequence = intent.request_id.split(":").at(-1);
  const request = bindDigest(
    {
      artifact_type: "prototype-maturity-request",
      correlation_id: `prototype-maturity:${prototypeSlug(intent.prototype_id)}:${sequence}`,
      expected_state: preparation.expected_state,
      idempotency_key: `prototype-maturity:${prototypeSlug(intent.prototype_id)}:${sequence}`,
      inputs: {
        editable_values: editableValues(intent),
        source_refs: sourceRefs(intent),
      },
      operator_ref: callerId,
      prototype_id: intent.prototype_id,
      request_id: intent.request_id,
      requested_at: intent.accepted_at,
      schema_version: 1,
      source_lifecycle:
        transition === "candidate-promotion" ? "exploring" : "candidate",
      target_lifecycle:
        transition === "candidate-promotion" ? "candidate" : "baseline-approved",
      transition,
    },
    "request_digest",
  );
  const packet = bindDigest(
    {
      artifact_type: "prototype-maturity-packet",
      assembled_at: intent.accepted_at,
      packet_id: intent.request_id.replace(
        /^prototype-maturity-request:/,
        "prototype-maturity-packet:",
      ),
      packet_kind:
        transition === "candidate-promotion"
          ? "candidate-evidence-packet"
          : "baseline-packet",
      prototype_id: intent.prototype_id,
      request_ref: artifactRef(request, "request_id", "request_digest"),
      schema_version: 1,
      sections: packetSections(intent),
      transition,
    },
    "packet_digest",
  );
  return {
    authority_revision: preparation.authority_revision,
    execution_ref: `console://prototype-maturity/executions/${encodeURIComponent(intent.request_id)}`,
    packet,
    request,
    session_ref: `console://prototype-maturity/sessions/${encodeURIComponent(intent.request_id)}`,
  };
}

function editableValues(intent: PrototypeMaturitySubmissionIntent) {
  if (intent.input.transition === "candidate-promotion") {
    const input = intent.input.input;
    return {
      "accepted-scope": cleanList(input.scope.included),
      "boundary-clarifications": boundaryClarification(intent),
      "excluded-scope": cleanList(input.scope.excluded),
      "expected-proof": `${input.proof.criterion.trim()} (${input.proof.method})`,
      "open-issue-disposition": issueDisposition(intent),
      "prototype-objective": input.objective.trim(),
      "target-user": `${input.audience.label.trim()} (${input.audience.kind})`,
    };
  }
  const input = intent.input.input;
  return {
    "accepted-summary":
      cleanList(intent.record.accepted_scope).join("; ") || input.baselineStatement.trim(),
    "baseline-statement": input.baselineStatement.trim(),
    "baseline-title": input.baselineTitle.trim(),
    "excluded-summary":
      cleanList(intent.record.excluded_scope).join("; ") ||
      "Delivery, runtime, security acceptance, source graduation, and publication remain excluded.",
    "issue-and-risk-disposition": input.issueDisposition.trim(),
    "missing-evidence-disposition": input.evidenceDisposition.trim(),
    "selected-evidence-refs": cleanList(intent.record.evidence_refs),
  };
}

function packetSections(intent: PrototypeMaturitySubmissionIntent) {
  const evidence = sourceRefs(intent);
  const ids =
    intent.input.transition === "candidate-promotion"
      ? ["candidate-brief", "scope-and-non-goals", "boundaries-and-risks"]
      : [
          "definition",
          "design-and-workflow",
          "evidence",
          "boundaries",
          "issues-and-risk-disposition",
        ];
  return ids.map((id) => ({
    evidence_refs: evidence,
    id,
    state: "ready" as const,
  }));
}

function sourceRefs(intent: PrototypeMaturitySubmissionIntent) {
  return cleanList([
    intent.record.landing_receipt_ref,
    intent.record.source_ref,
    ...intent.record.evidence_refs,
  ]);
}

function boundaryClarification(intent: PrototypeMaturitySubmissionIntent) {
  return `Source remains ${intent.record.source_ref}; maturity does not grant Delivery, runtime, Security, source-custody, or publication authority.`;
}

function issueDisposition(intent: PrototypeMaturitySubmissionIntent) {
  return intent.record.blocker
    ? `Blocked by ${intent.record.blocker.issue_ref}; ${intent.record.blocker.required_fix}`
    : "No visible issue blocks this maturity decision.";
}

function cleanList(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function prototypeSlug(prototypeId: string) {
  return prototypeId.slice("prototype:".length);
}

function assertDecisionCommand(value: unknown) {
  if (!isRecord(value)) {
    throw new PrototypeMaturityContractError("Prototype Maturity decision is invalid.");
  }
  const decision = value.decision;
  if (!decisionValue(decision)) {
    throw new PrototypeMaturityContractError("Prototype Maturity decision is invalid.");
  }
  if (decision === "block-promotion" || decision === "block-baseline") {
    return { blocker: assertPrototypeMaturityBlocker(value.blocker), decision };
  }
  if (value.blocker !== undefined && value.blocker !== null) {
    throw new PrototypeMaturityContractError(
      "A non-blocking maturity decision must not carry a blocker.",
    );
  }
  return { decision };
}

function decisionValue(value: unknown): value is PrototypeMaturityDecision {
  return new Set([
    "approve-baseline",
    "block-baseline",
    "block-promotion",
    "promote-candidate",
    "route-closeout",
  ]).has(String(value));
}

function artifactRef<T extends Record<string, unknown>>(
  artifact: T,
  idField: keyof T,
  digestField: keyof T,
) {
  return { digest: artifact[digestField], id: artifact[idField] };
}

function assertReturnedBinding(
  result: PrototypeMaturityResult,
  command: ReturnType<typeof buildPrototypeMaturityCommand>,
) {
  if (
    canonicalStringify(result.request) !== canonicalStringify(command.request) ||
    canonicalStringify(result.packet) !== canonicalStringify(command.packet) ||
    result.session_ref !== command.session_ref ||
    result.execution_ref !== command.execution_ref
  ) {
    throw projectionError(
      new Error("OOS returned a different Prototype Maturity command binding."),
    );
  }
}

function resolveConfig(env = process.env): PrototypeMaturityOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity is unavailable until its approved OOS integration is configured.",
      "prototype_maturity_oos_not_configured",
      503,
    );
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity OOS endpoint is invalid.",
      "prototype_maturity_oos_url_invalid",
      503,
    );
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity OOS endpoint is invalid.",
      "prototype_maturity_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
  };
}

async function request(path: string, init: RequestInit, options: RequestOptions) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity could not reach OOS.",
      "prototype_maturity_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity response exceeded the Console limit.",
      "prototype_maturity_response_large",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity returned an invalid response.",
      "prototype_maturity_response_invalid",
      502,
    );
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new PrototypeMaturityOosError(
      typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : "OOS rejected the Prototype Maturity operation.",
      typeof source.code === "string"
        ? source.code
        : "prototype_maturity_oos_rejected",
      response.status,
      source.retryable === true || response.status >= 500,
    );
  }
  return body;
}

function projectPreparation(value: unknown) {
  try {
    return assertPrototypeMaturityPreparation(value);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    return assertPrototypeMaturityResult(value, requestId);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectionError(error: unknown) {
  return new PrototypeMaturityOosError(
    error instanceof Error
      ? error.message
      : "Prototype Maturity returned malformed authority evidence.",
    "prototype_maturity_projection_invalid",
    502,
  );
}

function bindDigest<T extends Record<string, unknown>, K extends string>(
  value: T,
  field: K,
) {
  return { ...value, [field]: canonicalDigest(value) } as T & Record<K, string>;
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    if (!wellFormed(value)) {
      throw new PrototypeMaturityContractError(
        "Prototype Maturity command contains invalid Unicode.",
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort(compareUnicodeCodePoints)
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(",")}}`;
  }
  throw new PrototypeMaturityContractError(
    "Prototype Maturity command contains unsupported data.",
  );
}

function compareUnicodeCodePoints(left: string, right: string) {
  const a = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const b = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function wellFormed(value: string) {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
