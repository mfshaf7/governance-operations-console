import { createHash } from "node:crypto";

import {
  assertRepositoryCustodyWorkflowResult,
} from "../live-runtime/repository-custody-live-contract.ts";
import type {
  RepositoryCustodyArtifactRef,
  RepositoryCustodyLinkIntent,
  RepositoryCustodyRequest,
  RepositoryCustodyWorkflowResult,
} from "../live-runtime/repository-custody-live-types.ts";

const repositoryCustodyOosTimeoutMs = 12_000;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const requestIdPattern = /^repository-custody-request:[A-Za-z0-9._:-]+$/;
const repositoryIdPattern = /^[1-9][0-9]*$/;

type RepositoryCustodyOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
  credentialBindingRef: RepositoryCustodyArtifactRef;
  operatorId: string;
  policyProfileRef: RepositoryCustodyArtifactRef;
}>;

export class RepositoryCustodyOosError extends Error {
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

export async function linkExistingRepositoryCustody(
  intent: RepositoryCustodyLinkIntent,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RepositoryCustodyWorkflowResult> {
  const config = resolveRepositoryCustodyOosConfig(env);
  const request = buildRepositoryCustodyRequest(intent, config);
  const result = assertRepositoryCustodyWorkflowResult(
    await repositoryCustodyOosRequest(
      config,
      "/v1/repository-custody/requests",
      { body: JSON.stringify(request), method: "POST" },
      fetchImpl,
    ),
  );
  assertCanonicalRepositoryCustodyRequest(result.request);
  if (canonicalStringify(result.request) !== canonicalStringify(request)) {
    throw new RepositoryCustodyOosError(
      "Repository custody result does not match its submitted request.",
      "repository_custody_result_request_mismatch",
      502,
    );
  }
  return result;
}

export async function readRepositoryCustodyResult(
  requestId: string,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<RepositoryCustodyWorkflowResult> {
  assertRepositoryCustodyRequestId(requestId);
  const config = resolveRepositoryCustodyOosConfig(env);
  const result = assertRepositoryCustodyWorkflowResult(
    await repositoryCustodyOosRequest(
      config,
      `/v1/repository-custody/requests/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      fetchImpl,
    ),
  );
  assertCanonicalRepositoryCustodyRequest(result.request);
  if (result.request.request_id !== requestId) {
    throw new RepositoryCustodyOosError(
      "Repository custody projection does not match the requested identity.",
      "repository_custody_projection_request_mismatch",
      502,
    );
  }
  return result;
}

export function buildRepositoryCustodyRequest(
  intent: RepositoryCustodyLinkIntent,
  config: RepositoryCustodyOosConfig,
): RepositoryCustodyRequest {
  assertRepositoryCustodyLinkIntent(intent);
  const executionToken = canonicalDigest({ request_id: intent.requestId }).slice(
    "sha256:".length,
    40,
  );
  const operatorRef = artifactReference(
    `console://operators/${encodeURIComponent(config.operatorId)}`,
    { operator_id: config.operatorId },
  );
  const approvalRef = artifactReference(
    `console://repository-custody/approvals/${encodeURIComponent(intent.requestId)}`,
    {
      approval_note: intent.approvalNote.trim(),
      decision: "approve-link-existing",
      operator_id: config.operatorId,
      request_id: intent.requestId,
      requested_at: intent.requestedAt,
    },
  );
  const requestWithoutDigest = {
    schema_version: 1 as const,
    artifact_type: "repository_custody_request" as const,
    request_id: intent.requestId,
    requested_at: intent.requestedAt,
    action: "link-existing" as const,
    operator_ref: operatorRef,
    workflow: {
      workflow_id: "repository-custody" as const,
      workflow_version: "1" as const,
      execution_id: `repository-custody-execution:${executionToken}`,
    },
    target: {
      provider: "github" as const,
      provider_host: intent.providerHost,
      owner: intent.repositoryOwner.trim(),
      name: intent.repositoryName.trim(),
      provider_repository_id: intent.providerRepositoryId.trim(),
    },
    requested_custody: {
      workspace_owner_ref: intent.workspaceOwnerRef.trim(),
      custody_kind: intent.custodyKind,
    },
    authority: {
      policy_profile_ref: config.policyProfileRef,
      approval_ref: approvalRef,
      credential_binding_ref: config.credentialBindingRef,
    },
    correlation: {
      correlation_id: intent.requestId,
      causation_id: null,
    },
    idempotency_key: intent.requestId,
  };
  return {
    ...requestWithoutDigest,
    request_digest: canonicalDigest(requestWithoutDigest),
  };
}

export function assertRepositoryCustodyRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw new RepositoryCustodyOosError(
      "Repository custody request identity is invalid.",
      "repository_custody_request_identity_invalid",
      400,
    );
  }
  return value;
}

function assertRepositoryCustodyLinkIntent(
  value: RepositoryCustodyLinkIntent,
) {
  assertRepositoryCustodyRequestId(value.requestId);
  if (
    !value.repositoryId.trim() ||
    !value.repositoryOwner.trim() ||
    !value.repositoryName.trim() ||
    value.providerHost !== "github.com" ||
    !repositoryIdPattern.test(value.providerRepositoryId.trim()) ||
    !value.workspaceOwnerRef.trim() ||
    ![
      "dedicated-owner-repo",
      "external-repo",
      "incubation-repo",
      "shared-owner-repo",
    ].includes(value.custodyKind) ||
    value.approvalNote.trim().length < 12 ||
    Number.isNaN(Date.parse(value.requestedAt))
  ) {
    throw new RepositoryCustodyOosError(
      "Repository custody linkage requires complete provider identity, custody, timestamp, and operator approval input.",
      "repository_custody_link_intent_invalid",
      400,
    );
  }
}

function resolveRepositoryCustodyOosConfig(
  env: NodeJS.ProcessEnv,
): RepositoryCustodyOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  const policyProfileRef = configuredArtifactRef(env, {
    digestName: "REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST",
    label: "repository custody policy profile",
    uriName: "REPOSITORY_CUSTODY_POLICY_PROFILE_URI",
  });
  const credentialBindingRef = configuredArtifactRef(env, {
    digestName: "REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST",
    label: "repository custody credential binding",
    uriName: "REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI",
  });
  if (!baseUrl || !callerSecret || !operatorId) {
    throw new RepositoryCustodyOosError(
      "Repository custody live integration is missing its OOS endpoint, caller secret, or operator identity.",
      "repository_custody_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new RepositoryCustodyOosError(
      "Repository custody OOS endpoint must use HTTP or HTTPS.",
      "repository_custody_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
    credentialBindingRef,
    operatorId,
    policyProfileRef,
  };
}

function configuredArtifactRef(
  env: NodeJS.ProcessEnv,
  names: { digestName: string; label: string; uriName: string },
): RepositoryCustodyArtifactRef {
  const digest = env[names.digestName]?.trim();
  const uri = env[names.uriName]?.trim();
  if (!digest || !digestPattern.test(digest) || !uri) {
    throw new RepositoryCustodyOosError(
      `Repository custody live integration is missing its ${names.label} reference.`,
      "repository_custody_authority_not_configured",
      503,
    );
  }
  try {
    new URL(uri);
  } catch {
    throw new RepositoryCustodyOosError(
      `Repository custody ${names.label} URI is invalid.`,
      "repository_custody_authority_not_configured",
      503,
    );
  }
  return { digest, uri };
}

async function repositoryCustodyOosRequest(
  config: RepositoryCustodyOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(repositoryCustodyOosTimeoutMs),
    });
  } catch (error) {
    throw new RepositoryCustodyOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "repository_custody_oos_unavailable",
      502,
      { retryable: true },
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const item = isRecord(body) ? body : {};
    throw new RepositoryCustodyOosError(
      typeof item.message === "string"
        ? item.message
        : typeof item.error === "string"
          ? item.error
          : response.statusText || "OOS rejected the repository custody request.",
      typeof item.code === "string"
        ? item.code
        : "repository_custody_oos_rejected",
      response.status,
      { retryable: item.retryable === true },
    );
  }
  return body;
}

function artifactReference(uri: string, content: unknown) {
  return { digest: canonicalDigest(content), uri };
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function assertCanonicalRepositoryCustodyRequest(
  request: RepositoryCustodyRequest,
) {
  const { request_digest: requestDigest, ...content } = request;
  if (canonicalDigest(content) !== requestDigest) {
    throw new RepositoryCustodyOosError(
      "Repository custody result contains a request with invalid canonical integrity.",
      "repository_custody_result_request_integrity_invalid",
      502,
    );
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
