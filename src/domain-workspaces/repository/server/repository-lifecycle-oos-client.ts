import { createHash } from "node:crypto";

import { assertRepositoryCustodyWorkflowResult } from "../live-runtime/repository-custody-live-contract.ts";
import {
  assertRepositoryLifecycleAudit,
  assertRepositoryLifecycleWorkflowResult,
} from "../live-runtime/repository-lifecycle-live-contract.ts";
import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleArtifactRef,
  RepositoryLifecycleAudit,
  RepositoryLifecycleCommandIntent,
  RepositoryLifecycleRequest,
  RepositoryLifecycleState,
  RepositoryLifecycleWorkflowResult,
} from "../live-runtime/repository-lifecycle-live-types.ts";

const requestIdPattern = /^repository-lifecycle-request:[A-Za-z0-9._:-]+$/;
const custodyRequestIdPattern = /^repository-custody-request:[A-Za-z0-9._:-]+$/;
const repositoryIdPattern = /^[1-9][0-9]*$/;
const lifecycleTimeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

type RepositoryLifecycleOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
  operatorId: string;
}>;

export class RepositoryLifecycleOosError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number,
    { retryable = false }: { retryable?: boolean } = {},
  ) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function repositoryLifecycleOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    env.OOS_BASE_URL?.trim() &&
      env.OOS_CALLER_SECRET?.trim() &&
      env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim(),
  );
}

export async function readRepositoryLifecycleAudit(
  identity: { provider: string; providerRepositoryId: string },
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RepositoryLifecycleAudit> {
  assertRepositoryLifecycleIdentity(identity);
  const config = resolveRepositoryLifecycleConfig(env);
  const audit = assertRepositoryLifecycleAudit(
    await repositoryLifecycleOosRequest(
      config,
      `/v1/repository-lifecycle/repositories/${encodeURIComponent(identity.provider)}/${encodeURIComponent(identity.providerRepositoryId)}`,
      { method: "GET" },
      fetchImpl,
    ),
  );
  if (
    audit.repository_identity.provider !== identity.provider ||
    audit.repository_identity.provider_repository_id !==
      identity.providerRepositoryId
  ) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle audit does not match the requested repository identity.",
      "repository_lifecycle_audit_identity_mismatch",
      502,
    );
  }
  return audit;
}

export async function executeRepositoryLifecycleAction(
  intent: RepositoryLifecycleCommandIntent,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RepositoryLifecycleWorkflowResult> {
  assertRepositoryLifecycleIntent(intent);
  const config = resolveRepositoryLifecycleConfig(env);
  const current = await resolveCurrentLifecycleState(intent, config, fetchImpl);
  const request = buildRepositoryLifecycleRequest(intent, current, config, env);
  const result = assertRepositoryLifecycleWorkflowResult(
    await repositoryLifecycleOosRequest(
      config,
      "/v1/repository-lifecycle/requests",
      { body: JSON.stringify(request), method: "POST" },
      fetchImpl,
    ),
  );
  if (canonicalStringify(result.request) !== canonicalStringify(request)) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle result does not match the submitted request.",
      "repository_lifecycle_result_request_mismatch",
      502,
    );
  }
  return result;
}

export async function readRepositoryLifecycleResult(
  requestId: string,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RepositoryLifecycleWorkflowResult> {
  assertRepositoryLifecycleRequestId(requestId);
  const config = resolveRepositoryLifecycleConfig(env);
  const result = assertRepositoryLifecycleWorkflowResult(
    await repositoryLifecycleOosRequest(
      config,
      `/v1/repository-lifecycle/requests/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      fetchImpl,
    ),
  );
  if (result.request.request_id !== requestId) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle result does not match the requested workflow identity.",
      "repository_lifecycle_projection_request_mismatch",
      502,
    );
  }
  return result;
}

export function buildRepositoryLifecycleRequest(
  intent: RepositoryLifecycleCommandIntent,
  current: {
    audit: RepositoryLifecycleAudit | null;
    state: RepositoryLifecycleState;
  },
  config: RepositoryLifecycleOosConfig,
  env: NodeJS.ProcessEnv,
): RepositoryLifecycleRequest {
  assertRepositoryLifecycleIntent(intent);
  const operatorRef = artifactReference(
    `console://operators/${encodeURIComponent(config.operatorId)}`,
    { operator_id: config.operatorId },
  );
  const approvalRef = artifactReference(
    `console://repository-lifecycle/approvals/${encodeURIComponent(intent.requestId)}`,
    {
      action: intent.action,
      approval_note: intent.approvalNote.trim(),
      operator_id: config.operatorId,
      repository_identity: {
        provider: intent.provider,
        provider_repository_id: intent.providerRepositoryId,
      },
      request_id: intent.requestId,
      requested_at: intent.requestedAt,
    },
  );
  const impact = repositoryLifecycleImpact(intent, current.state, config);
  const providerAction = ["archive-provider", "unarchive-provider"].includes(
    intent.action,
  );
  const transfer = intent.action === "transfer-workspace-custody";
  const requestWithoutDigest = {
    schema_version: 1 as const,
    artifact_type: "repository_lifecycle_request" as const,
    request_id: intent.requestId,
    requested_at: intent.requestedAt,
    action: intent.action,
    operator_ref: operatorRef,
    workflow: {
      workflow_id: "repository-lifecycle" as const,
      workflow_version: "1" as const,
      execution_id: repositoryLifecycleExecutionId(intent.requestId),
    },
    repository_identity: {
      provider: intent.provider,
      provider_repository_id: intent.providerRepositoryId,
    },
    current_state: current.state,
    target: repositoryLifecycleTarget(intent),
    impact,
    authority: {
      policy_profile_ref: configuredArtifactRef(env, {
        digestName: "REPOSITORY_LIFECYCLE_POLICY_PROFILE_DIGEST",
        label: "repository lifecycle policy profile",
        uriName: "REPOSITORY_LIFECYCLE_POLICY_PROFILE_URI",
      }),
      approval_ref: approvalRef,
      source_owner_acceptance_ref: transfer
        ? acceptanceReference(
            intent,
            config.operatorId,
            "source",
            intent.sourceOwnerAcceptanceNote,
          )
        : null,
      target_owner_acceptance_ref: transfer
        ? acceptanceReference(
            intent,
            config.operatorId,
            "target",
            intent.targetOwnerAcceptanceNote,
          )
        : null,
      provider_credential_binding_ref: providerAction
        ? configuredArtifactRef(env, {
            digestName:
              "REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_DIGEST",
            label: "repository lifecycle provider credential binding",
            uriName:
              "REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_URI",
          })
        : null,
    },
    reversal_of_receipt_ref: reversalReference(intent.action, current.audit),
    correlation: {
      correlation_id: intent.requestId,
      causation_id:
        current.audit?.latest_terminal_receipt_ref?.uri ??
        intent.sourceCustodyRequestId,
    },
    idempotency_key: intent.requestId,
  };
  return {
    ...requestWithoutDigest,
    request_digest: canonicalDigest(requestWithoutDigest),
  };
}

export function assertRepositoryLifecycleRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle request identity is invalid.",
      "repository_lifecycle_request_identity_invalid",
      400,
    );
  }
  return value;
}

function assertRepositoryLifecycleIntent(
  intent: RepositoryLifecycleCommandIntent,
) {
  assertRepositoryLifecycleRequestId(intent.requestId);
  assertRepositoryLifecycleIdentity({
    provider: intent.provider,
    providerRepositoryId: intent.providerRepositoryId,
  });
  if (
    !intent.repositoryId.trim() ||
    ![
      "archive-provider",
      "restore-workspace-record",
      "retire-workspace-record",
      "transfer-workspace-custody",
      "unarchive-provider",
    ].includes(intent.action) ||
    intent.approvalNote.trim().length < 12 ||
    Number.isNaN(Date.parse(intent.requestedAt)) ||
    (intent.sourceCustodyRequestId !== null &&
      !custodyRequestIdPattern.test(intent.sourceCustodyRequestId))
  ) {
    throw invalidIntent();
  }
  const disposition = intent.impact.blockerDecision;
  if (
    (disposition !== null &&
      !["accept-risk", "defer", "remove", "workaround"].includes(
        disposition,
      )) ||
    (disposition !== null && intent.impact.justification.trim().length < 12)
  ) {
    throw invalidIntent();
  }
  if (
    intent.action === "transfer-workspace-custody" &&
    (!intent.targetWorkspaceOwnerRef.trim() ||
      intent.sourceOwnerAcceptanceNote.trim().length < 12 ||
      intent.targetOwnerAcceptanceNote.trim().length < 12)
  ) {
    throw invalidIntent();
  }
}

function assertRepositoryLifecycleIdentity(identity: {
  provider: string;
  providerRepositoryId: string;
}) {
  if (
    identity.provider !== "github" ||
    !repositoryIdPattern.test(identity.providerRepositoryId)
  ) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle requires the immutable GitHub repository identity.",
      "repository_lifecycle_identity_invalid",
      400,
    );
  }
}

async function resolveCurrentLifecycleState(
  intent: RepositoryLifecycleCommandIntent,
  config: RepositoryLifecycleOosConfig,
  fetchImpl: typeof fetch,
) {
  try {
    const audit = await readRepositoryLifecycleAudit(
      {
        provider: intent.provider,
        providerRepositoryId: intent.providerRepositoryId,
      },
      { env: configAsEnv(config), fetchImpl },
    );
    return { audit, state: audit.current_state };
  } catch (error) {
    if (
      !(error instanceof RepositoryLifecycleOosError) ||
      error.code !== "repository_lifecycle_repository_not_found"
    ) {
      throw error;
    }
  }
  if (!intent.sourceCustodyRequestId) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle has no authoritative OOS state. Complete or refresh the Repository custody workflow before lifecycle action.",
      "repository_lifecycle_source_state_missing",
      409,
    );
  }
  const custody = assertRepositoryCustodyWorkflowResult(
    await repositoryLifecycleOosRequest(
      config,
      `/v1/repository-custody/requests/${encodeURIComponent(intent.sourceCustodyRequestId)}`,
      { method: "GET" },
      fetchImpl,
    ),
  );
  if (
    custody.status !== "succeeded" ||
    !custody.receipt ||
    !custody.receipt_ref ||
    !custody.provider_readback ||
    custody.provider_readback.repository_identity.provider !== intent.provider ||
    custody.provider_readback.repository_identity.provider_repository_id !==
      intent.providerRepositoryId ||
    !["linked", "provisioned"].includes(custody.receipt.custody.after)
  ) {
    throw new RepositoryLifecycleOosError(
      "Repository custody evidence cannot initialize authoritative lifecycle state.",
      "repository_lifecycle_source_state_invalid",
      409,
    );
  }
  return {
    audit: null,
    state: {
      custody_state: custody.receipt.custody.after as "linked" | "provisioned",
      workspace_owner_ref: custody.receipt.custody.workspace_owner_ref,
      provider_lifecycle_state:
        custody.provider_readback.provider_lifecycle_state,
      workspace_record_state: "active" as const,
      custody_version: custody.receipt_ref.digest,
      provider_version: custody.provider_readback.provider_version,
    },
  };
}

function repositoryLifecycleImpact(
  intent: RepositoryLifecycleCommandIntent,
  state: RepositoryLifecycleState,
  config: RepositoryLifecycleOosConfig,
) {
  const disposition = intent.impact.blockerDecision;
  const assessment = {
    action: intent.action,
    blocker_disposition: disposition,
    current_state: state,
    justification: intent.impact.justification.trim() || null,
    operator_id: config.operatorId,
    repository_identity: {
      provider: intent.provider,
      provider_repository_id: intent.providerRepositoryId,
    },
    request_id: intent.requestId,
  };
  return {
    impact_assessment_ref: artifactReference(
      `console://repository-lifecycle/impact/${encodeURIComponent(intent.requestId)}`,
      assessment,
    ),
    finding_count: disposition === null ? 0 : 1,
    blocking_finding_count: disposition === null ? 0 : 1,
    blocker_disposition:
      disposition === null
        ? null
        : {
            decision: disposition,
            justification: intent.impact.justification.trim(),
            evidence_ref: artifactReference(
              `console://repository-lifecycle/impact/${encodeURIComponent(intent.requestId)}/disposition`,
              assessment,
            ),
          },
  };
}

function repositoryLifecycleTarget(intent: RepositoryLifecycleCommandIntent) {
  switch (intent.action) {
    case "transfer-workspace-custody":
      return {
        workspace_owner_ref: intent.targetWorkspaceOwnerRef.trim(),
        provider_lifecycle_state: null,
        workspace_record_state: null,
      };
    case "archive-provider":
      return {
        workspace_owner_ref: null,
        provider_lifecycle_state: "archived" as const,
        workspace_record_state: null,
      };
    case "unarchive-provider":
      return {
        workspace_owner_ref: null,
        provider_lifecycle_state: "active" as const,
        workspace_record_state: null,
      };
    case "retire-workspace-record":
      return {
        workspace_owner_ref: null,
        provider_lifecycle_state: null,
        workspace_record_state: "retired" as const,
      };
    case "restore-workspace-record":
      return {
        workspace_owner_ref: null,
        provider_lifecycle_state: null,
        workspace_record_state: "active" as const,
      };
  }
}

function reversalReference(
  action: RepositoryLifecycleAction,
  audit: RepositoryLifecycleAudit | null,
) {
  const reversedAction =
    action === "unarchive-provider"
      ? "archive-provider"
      : action === "restore-workspace-record"
        ? "retire-workspace-record"
        : null;
  if (!reversedAction) return null;
  const reference = [...(audit?.history ?? [])]
    .reverse()
    .find(
      (item) => item.action === reversedAction && item.outcome === "succeeded",
    )?.receipt_ref;
  if (!reference) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle reversal requires the successful receipt being reversed.",
      "repository_lifecycle_reversal_receipt_missing",
      409,
    );
  }
  return reference;
}

function acceptanceReference(
  intent: RepositoryLifecycleCommandIntent,
  operatorId: string,
  owner: "source" | "target",
  note: string,
) {
  return artifactReference(
    `console://repository-lifecycle/acceptance/${owner}/${encodeURIComponent(intent.requestId)}`,
    {
      acceptance_note: note.trim(),
      action: intent.action,
      operator_id: operatorId,
      owner,
      request_id: intent.requestId,
      workspace_owner_ref:
        owner === "source" ? null : intent.targetWorkspaceOwnerRef.trim(),
    },
  );
}

function resolveRepositoryLifecycleConfig(
  env: NodeJS.ProcessEnv,
): RepositoryLifecycleOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  if (!baseUrl || !callerSecret || !operatorId) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle live integration is missing its OOS endpoint, caller secret, or operator identity.",
      "repository_lifecycle_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle OOS endpoint must use HTTP or HTTPS.",
      "repository_lifecycle_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
    operatorId,
  };
}

function configAsEnv(config: RepositoryLifecycleOosConfig): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    GOVERNANCE_CONSOLE_OPERATOR_ID: config.operatorId,
    OOS_BASE_URL: config.baseUrl,
    OOS_CALLER_ID: config.callerId,
    OOS_CALLER_SECRET: config.callerSecret,
  };
}

function configuredArtifactRef(
  env: NodeJS.ProcessEnv,
  names: { digestName: string; label: string; uriName: string },
): RepositoryLifecycleArtifactRef {
  const digest = env[names.digestName]?.trim();
  const uri = env[names.uriName]?.trim();
  if (!digest || !/^sha256:[a-f0-9]{64}$/.test(digest) || !uri) {
    throw new RepositoryLifecycleOosError(
      `Repository lifecycle live integration is missing its ${names.label} reference.`,
      "repository_lifecycle_authority_not_configured",
      503,
    );
  }
  try {
    new URL(uri);
  } catch {
    throw new RepositoryLifecycleOosError(
      `Repository lifecycle ${names.label} URI is invalid.`,
      "repository_lifecycle_authority_not_configured",
      503,
    );
  }
  return { digest, uri };
}

async function repositoryLifecycleOosRequest(
  config: RepositoryLifecycleOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      redirect: "error",
      signal: AbortSignal.timeout(lifecycleTimeoutMs),
    });
  } catch {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle OOS endpoint is unavailable.",
      "repository_lifecycle_oos_unavailable",
      503,
      { retryable: true },
    );
  }
  const body = await boundedJson(response);
  if (!response.ok) {
    const failure = isRecord(body) ? body : {};
    throw new RepositoryLifecycleOosError(
      typeof failure.message === "string"
        ? failure.message
        : "Repository lifecycle request failed.",
      typeof failure.error === "string"
        ? failure.error
        : "repository_lifecycle_request_failed",
      response.status,
      { retryable: response.status === 429 || response.status >= 500 },
    );
  }
  return body;
}

async function boundedJson(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxResponseBytes) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle response exceeded the allowed size.",
      "repository_lifecycle_response_too_large",
      502,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxResponseBytes) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle response exceeded the allowed size.",
      "repository_lifecycle_response_too_large",
      502,
    );
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle endpoint returned invalid JSON.",
      "repository_lifecycle_response_invalid",
      502,
    );
  }
}

function repositoryLifecycleExecutionId(requestId: string) {
  return `repository-lifecycle-execution:${canonicalDigest({ request_id: requestId }).slice(7, 47)}`;
}

function artifactReference(uri: string, value: unknown) {
  return { digest: canonicalDigest(value), uri };
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return `{${Object.keys(item)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(item[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function invalidIntent() {
  return new RepositoryLifecycleOosError(
    "Repository lifecycle action requires complete impact, confirmation, target, timestamp, and repository identity input.",
    "repository_lifecycle_intent_invalid",
    400,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
