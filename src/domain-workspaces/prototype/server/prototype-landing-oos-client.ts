import { createHash } from "node:crypto";

import {
  assertPrototypeLandingId,
  assertPrototypeLandingPreparation,
  assertPrototypeLandingRequestId,
  assertPrototypeLandingResult,
  assertPrototypeLandingSubmissionIntent,
  PrototypeLandingContractError,
  samePrototypeLandingPreparation,
} from "../live-runtime/prototype-landing-live-contract.ts";
import type {
  PrototypeLandingCanonicalSupportProfile,
  PrototypeLandingPreparation,
  PrototypeLandingResult,
  PrototypeLandingSubmissionIntent,
} from "../live-runtime/prototype-landing-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 2_097_152;

type PrototypeLandingOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

type RequestOptions = Readonly<{
  config?: PrototypeLandingOosConfig;
  fetchImpl?: typeof fetch;
}>;

export class PrototypeLandingOosError extends Error {
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

export function prototypeLandingOosConfigured(env = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim() && env.OOS_CALLER_SECRET?.trim());
}

export async function preparePrototypeLanding(
  prototypeId: string,
  options: RequestOptions = {},
) {
  const body = await request(
    "/v1/prototype-landings/preparations",
    {
      body: JSON.stringify({ prototype_id: assertPrototypeLandingId(prototypeId) }),
      method: "POST",
    },
    options,
  );
  return projectPreparation(body);
}

export async function submitPrototypeLanding(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertPrototypeLandingSubmissionIntent(value);
  const current = await preparePrototypeLanding(intent.prototype_id, options);
  if (!samePrototypeLandingPreparation(intent.reviewed_preparation, current)) {
    throw new PrototypeLandingOosError(
      "Prototype Studio changed after review. Refresh the Landing setup before submission.",
      "prototype_landing_review_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildPrototypeLandingCommand(intent, current, config.callerId);
  const body = await request(
    "/v1/prototype-landings",
    { body: JSON.stringify(command), method: "POST" },
    { ...options, config },
  );
  const result = projectResult(body, intent.request_id);
  assertReturnedBinding(result, command);
  return result;
}

export async function readPrototypeLanding(
  requestId: string,
  options: RequestOptions = {},
) {
  const id = assertPrototypeLandingRequestId(requestId);
  return projectResult(
    await request(
      `/v1/prototype-landings/${encodeURIComponent(id)}`,
      { method: "GET" },
      options,
    ),
    id,
  );
}

export async function continuePrototypeLanding(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandPrototypeLanding(requestId, "continue", options);
}

export async function cancelPrototypeLanding(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandPrototypeLanding(requestId, "cancel", options);
}

async function commandPrototypeLanding(
  requestId: string,
  action: "cancel" | "continue",
  options: RequestOptions,
) {
  const id = assertPrototypeLandingRequestId(requestId);
  return projectResult(
    await request(
      `/v1/prototype-landings/${encodeURIComponent(id)}/${action}`,
      { body: "{}", method: "POST" },
      options,
    ),
    id,
  );
}

export function buildPrototypeLandingCommand(
  intent: PrototypeLandingSubmissionIntent,
  preparation: PrototypeLandingPreparation,
  callerId: string,
) {
  const slug = intent.prototype_id.slice("prototype:".length);
  const entry = bindDigest(
    {
      artifact_type: "prototype-entry-packet",
      captured_at: intent.accepted_at,
      constraints: [],
      entry_id: `prototype-entry:${intent.ingress_class}:${sourceIdentity(intent)}`,
      ingress_class: intent.ingress_class,
      requested_by: callerId,
      schema_version: 1,
      source: {
        authority: intent.source.authority,
        digest: canonicalDigest({
          authority: intent.source.authority,
          ingress_class: intent.ingress_class,
          ref: intent.source.ref,
          revision: intent.source.revision,
        }),
        ref: intent.source.ref,
        revision: intent.source.revision,
      },
      suggestions: intent.suggestions,
    },
    "packet_digest",
  );
  const sourcePlan = {
    imported_content_digest: intent.source.imported_content_digest,
    origin_digest: intent.source.origin_digest,
    posture: intent.source.posture,
    source_ref:
      intent.source.posture === "create-studio-source"
        ? `repo://workspace-prototype-studio/prototypes/${slug}`
        : intent.source.ref,
    source_revision: intent.source.revision,
  };
  const requestArtifact = bindDigest(
    {
      artifact_type: "prototype-landing-request",
      correlation_id: correlationRef(intent.request_id),
      entry_packet_ref: artifactRef(entry, "entry_id", "packet_digest"),
      expected_state: preparation.expected_state,
      idempotency_key: `landing:${slug}:${requestSequence(intent.request_id)}`,
      operator_accepted: true,
      operator_ref: callerId,
      prototype: {
        id: intent.prototype_id,
        name: intent.draft.name.trim(),
        objective: intent.draft.summary.trim(),
      },
      request_id: intent.request_id,
      requested_at: intent.accepted_at,
      schema_version: 1,
      setup: {
        data_mode: intent.draft.dataMode,
        mutation_boundary: mutationBoundary(intent.draft.mutationBoundary),
        preview_mode: previewMode(intent.draft.previewNeed),
        scaffold_profile: intent.draft.basePlatform,
        support_profile: supportProfile(intent.draft.supportProfile),
        support_rows: intent.draft.supportRows.map((row) => ({
          detail: row.detail.trim() || row.summary.trim() || row.label,
          dimension: row.id,
          generated: intent.draft.supportProfile !== "custom-support",
          state: row.state,
        })),
        visibility: visibility(intent.draft.visibilityTier),
      },
      source_plan: sourcePlan,
      starting_lifecycle: "exploring",
    },
    "request_digest",
  );
  const mutationSet = mutationSetFor(intent);
  const targets = mutationTargets(slug);
  const plan = bindDigest(
    {
      artifact_type: "prototype-landing-plan",
      expected_outputs: mutationSet.map((kind) => ({
        kind,
        required: true,
        target_ref: targets[kind],
      })),
      mutation_set: mutationSet,
      next_action: "candidate-promotion",
      plan_id: intent.request_id.replace(
        /^prototype-landing-request:/,
        "prototype-landing-plan:",
      ),
      planned_at: intent.accepted_at,
      prototype_id: intent.prototype_id,
      request_ref: artifactRef(requestArtifact, "request_id", "request_digest"),
      schema_version: 1,
      source_plan: sourcePlan,
    },
    "plan_digest",
  );
  return {
    authority_revision: preparation.authority_revision,
    entry_packet: entry,
    execution_ref: `console://prototype-landing/executions/${encodeURIComponent(intent.request_id)}`,
    operator_approval_ref: `console://prototype-landing/approvals/${encodeURIComponent(intent.request_id)}`,
    plan,
    request: requestArtifact,
    session_ref: `console://prototype-landing/sessions/${encodeURIComponent(intent.request_id)}`,
  };
}

function mutationSetFor(intent: PrototypeLandingSubmissionIntent) {
  const result = ["registry-record", "prototype-docs"];
  if (
    intent.source.posture === "create-studio-source" ||
    intent.source.posture === "import-to-studio"
  ) {
    result.push("prototype-source");
  }
  if (
    intent.draft.supportRows.some(
      (row) => row.id === "interface" && row.state !== "not-needed",
    ) &&
    intent.source.posture !== "reference-dedicated-owner-source" &&
    intent.source.posture !== "reference-shared-owner-source"
  ) {
    result.push("fixtures");
  }
  if (
    intent.draft.previewNeed !== "none" &&
    intent.draft.supportRows.some(
      (row) => row.id === "runtime" && row.state !== "not-needed",
    )
  ) {
    result.push("preview-profile-draft");
  }
  result.push("validation-plan");
  return result;
}

function mutationTargets(slug: string): Record<string, string> {
  return {
    "fixtures": `fixtures/prototypes/${slug}`,
    "preview-profile-draft": `records/prototype-preview-profiles/${slug}.yaml`,
    "prototype-docs": `docs/prototypes/${slug}`,
    "prototype-source": `prototypes/${slug}`,
    "registry-record": "prototypes.yaml",
    "validation-plan": `records/prototype-landings/${slug}/validation-plan.yaml`,
  };
}

function supportProfile(value: string): PrototypeLandingCanonicalSupportProfile {
  const mapped = {
    "custom-support": "custom",
    "interactive-prototype": "interactive",
    "simple-prototype": "simple",
  }[value] ?? value;
  return mapped as PrototypeLandingCanonicalSupportProfile;
}

function previewMode(value: string) {
  return {
    "future-dev-integration": "prototype-devint",
    "static-review": "static",
  }[value] ?? value;
}

function mutationBoundary(value: string) {
  return {
    "external-sandbox": "sandbox",
    "prototype-local": "local-only",
    "read-only": "none",
    "real-system": "real-system-blocked",
  }[value] ?? value;
}

function visibility(value: string) {
  return value === "private-internal" ? "private" : value;
}

function sourceIdentity(intent: PrototypeLandingSubmissionIntent) {
  return canonicalDigest({
    ingress_class: intent.ingress_class,
    source: intent.source,
  }).slice("sha256:".length, "sha256:".length + 32);
}

function requestSequence(requestId: string) {
  return requestId.split(":").at(-1);
}

function correlationRef(requestId: string) {
  return requestId.replace(/^prototype-landing-request:/, "correlation:");
}

function artifactRef<T extends Record<string, unknown>>(
  artifact: T,
  idField: keyof T,
  digestField: keyof T,
) {
  return { digest: artifact[digestField], id: artifact[idField] };
}

function assertReturnedBinding(
  result: PrototypeLandingResult,
  command: ReturnType<typeof buildPrototypeLandingCommand>,
) {
  if (
    canonicalStringify(result.entry_packet) !==
      canonicalStringify(command.entry_packet) ||
    canonicalStringify(result.request) !== canonicalStringify(command.request) ||
    canonicalStringify(result.plan) !== canonicalStringify(command.plan) ||
    result.session_ref !== command.session_ref ||
    result.execution_ref !== command.execution_ref
  ) {
    throw projectionError(
      new Error("OOS returned a different Prototype Landing command binding."),
    );
  }
}

function resolveConfig(env = process.env): PrototypeLandingOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new PrototypeLandingOosError(
      "Prototype Landing is unavailable until its approved OOS integration is configured.",
      "prototype_landing_oos_not_configured",
      503,
    );
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new PrototypeLandingOosError(
      "Prototype Landing OOS endpoint is invalid.",
      "prototype_landing_oos_url_invalid",
      503,
    );
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new PrototypeLandingOosError(
      "Prototype Landing OOS endpoint is invalid.",
      "prototype_landing_oos_url_invalid",
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
    throw new PrototypeLandingOosError(
      "Prototype Landing could not reach OOS.",
      "prototype_landing_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new PrototypeLandingOosError(
      "Prototype Landing response exceeded the Console limit.",
      "prototype_landing_response_large",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new PrototypeLandingOosError(
      "Prototype Landing returned an invalid response.",
      "prototype_landing_response_invalid",
      502,
    );
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new PrototypeLandingOosError(
      typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : "OOS rejected the Prototype Landing operation.",
      typeof source.code === "string"
        ? source.code
        : "prototype_landing_oos_rejected",
      response.status,
      source.retryable === true || response.status >= 500,
    );
  }
  return body;
}

function projectPreparation(value: unknown) {
  try {
    return assertPrototypeLandingPreparation(value);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    return assertPrototypeLandingResult(value, requestId);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectionError(error: unknown) {
  return new PrototypeLandingOosError(
    error instanceof Error
      ? error.message
      : "Prototype Landing returned malformed authority evidence.",
    "prototype_landing_projection_invalid",
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
      throw new PrototypeLandingContractError(
        "Prototype Landing command contains invalid Unicode.",
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
  throw new PrototypeLandingContractError(
    "Prototype Landing command contains unsupported data.",
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
