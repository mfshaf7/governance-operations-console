import { createHash } from "node:crypto";

import {
  assertWorkDesignOosApplyResult,
  assertWorkDesignOosAssistResult,
  assertWorkDesignOosProjection,
  workDesignLiveIdentity,
  workDesignOosNode,
} from "../live-runtime/work-design-live-contract.ts";
import type {
  WorkDesignApplyCommand,
  WorkDesignContextAssistCommand,
  WorkDesignOosApplyResult,
  WorkDesignOosAssistResult,
  WorkDesignOosProjection,
  WorkDesignTreeAssistCommand,
} from "../live-runtime/work-design-live-types.ts";

const workDesignOosTimeoutMs = 12_000;

type WorkDesignOosConfig = {
  baseUrl: string;
  callerId: string;
  callerSecret: string;
  operatorHandle?: string;
  operatorId: string;
};

export class WorkDesignOosError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function workDesignOosConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim());
}

export async function readWorkDesignProjection(
  packageRef: string,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<WorkDesignOosProjection> {
  const config = resolveWorkDesignOosConfig(env);
  const identity = workDesignLiveIdentity(packageRef);
  const value = await workDesignOosRequest(
    config,
    `/v1/delivery-work-design/${encodeURIComponent(packageRef)}/projection?source_ref=${encodeURIComponent(identity.sourceRef)}`,
    { method: "GET" },
    fetchImpl,
  );
  const projection = assertWorkDesignOosProjection(value);
  if (
    projection.package_ref !== packageRef ||
    projection.source.ref !== identity.sourceRef
  ) {
    throw new WorkDesignOosError(
      "OOS returned Work Design projection for a different source.",
      "work_design_projection_mismatch",
      502,
    );
  }
  return projection;
}

export async function requestWorkDesignContextAdvice(
  packageRef: string,
  command: WorkDesignContextAssistCommand,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<WorkDesignOosAssistResult> {
  return requestWorkDesignAdvice(
    packageRef,
    {
      context_draft: {
        decision: command.contextDecision,
        note: command.contextNote,
      },
      operator_prompt: command.operatorPrompt,
      source_revision: command.sourceRevision,
      task_kind: "context_advice",
    },
    options,
  );
}

export async function requestWorkDesignTreeAdvice(
  packageRef: string,
  command: WorkDesignTreeAssistCommand,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<WorkDesignOosAssistResult> {
  const tree = workDesignOosNode(command.tree);
  return requestWorkDesignAdvice(
    packageRef,
    {
      operator_prompt: command.operatorPrompt,
      source_revision: command.sourceRevision,
      task_kind: "tree_advice",
      tree_draft: {
        selected_node_id: command.selectedNodeId,
        tree,
        tree_digest: canonicalDigest(tree),
      },
    },
    options,
  );
}

export async function applyWorkDesignDraft(
  packageRef: string,
  command: WorkDesignApplyCommand,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<WorkDesignOosApplyResult> {
  const config = resolveWorkDesignOosConfig(env);
  const identity = workDesignLiveIdentity(packageRef);
  const tree = workDesignOosNode(command.tree);
  const draftDigest = canonicalDigest(tree);
  const request = {
    schema_version: 1,
    request_id: stableId("console-work-design-apply", command.acceptanceId),
    correlation_id: stableId("console-work-design-correlation", command.acceptanceId),
    idempotency_key: stableId("console-work-design-idempotency", command.acceptanceId),
    delivery_id: identity.deliveryId,
    package_ref: packageRef,
    source_ref: identity.sourceRef,
    source_revision: command.sourceRevision,
    operator: workDesignOperator(config),
    acceptance: {
      decision: "apply",
      accepted_at: command.acceptedAt,
      accepted_by: config.operatorId,
      ...(command.note.trim() ? { note: command.note.trim() } : {}),
    },
    accepted_draft: {
      draft_id: stableId("work-design-draft", draftDigest),
      draft_digest: draftDigest,
      tree,
    },
    ...(command.advisorEvidence.length > 0
      ? {
          advisor_evidence: command.advisorEvidence.map((evidence) => ({
            gateway_audit_ref: evidence.gatewayAuditRef,
            response_id: evidence.responseId,
          })),
        }
      : {}),
  };
  const result = assertWorkDesignOosApplyResult(
    await workDesignOosRequest(
      config,
      `/v1/delivery-work-design/${encodeURIComponent(packageRef)}/apply`,
      { body: JSON.stringify(request), method: "POST" },
      fetchImpl,
    ),
  );
  if (
    result.accepted_draft_digest !== draftDigest ||
    result.applied_by !== config.operatorId ||
    result.target.readback_complete !== true
  ) {
    throw new WorkDesignOosError(
      "OOS returned Work Design apply evidence that does not match the accepted draft.",
      "work_design_apply_mismatch",
      502,
    );
  }
  return result;
}

type WorkDesignAdviceInput = {
  context_draft?: { decision: string; note: string };
  operator_prompt: string;
  source_revision: string;
  task_kind: "context_advice" | "tree_advice";
  tree_draft?: {
    selected_node_id: string | null;
    tree: ReturnType<typeof workDesignOosNode>;
    tree_digest: string;
  };
};

async function requestWorkDesignAdvice(
  packageRef: string,
  input: WorkDesignAdviceInput,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
) {
  const config = resolveWorkDesignOosConfig(env);
  const identity = workDesignLiveIdentity(packageRef);
  const requestIdentity = canonicalDigest({ packageRef, ...input }).slice(7, 47);
  const request = {
    schema_version: 1,
    request_id: `console-work-design-request:${requestIdentity}`,
    correlation_id: `console-work-design-correlation:${requestIdentity}`,
    delivery_id: identity.deliveryId,
    package_ref: packageRef,
    source_ref: identity.sourceRef,
    source_revision: input.source_revision,
    operator: workDesignOperator(config),
    task: {
      kind: input.task_kind,
      contract_ref: "oos.delivery-work-design.v1",
      version: "1.0",
    },
    operator_prompt: input.operator_prompt,
    ...(input.context_draft ? { context_draft: input.context_draft } : {}),
    ...(input.tree_draft ? { tree_draft: input.tree_draft } : {}),
  };
  const result = assertWorkDesignOosAssistResult(
    await workDesignOosRequest(
      config,
      `/v1/delivery-work-design/${encodeURIComponent(packageRef)}/assist`,
      { body: JSON.stringify(request), method: "POST" },
      fetchImpl,
    ),
  );
  if (
    result.request_id !== request.request_id ||
    result.correlation_id !== request.correlation_id ||
    result.task_kind !== input.task_kind
  ) {
    throw new WorkDesignOosError(
      "OOS returned Work Design advice for a different request.",
      "work_design_assist_mismatch",
      502,
    );
  }
  return result;
}

function resolveWorkDesignOosConfig(env: NodeJS.ProcessEnv): WorkDesignOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  if (!baseUrl || !callerSecret || !operatorId) {
    throw new WorkDesignOosError(
      "Work Design live integration is missing its OOS endpoint, caller secret, or operator identity.",
      "work_design_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new WorkDesignOosError(
      "Work Design OOS endpoint must use HTTP or HTTPS.",
      "work_design_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
    operatorHandle: env.GOVERNANCE_CONSOLE_OPERATOR_HANDLE?.trim() || undefined,
    operatorId,
  };
}

function workDesignOperator(config: WorkDesignOosConfig) {
  return {
    ...(config.operatorHandle ? { handle: config.operatorHandle } : {}),
    id: config.operatorId,
  };
}

async function workDesignOosRequest(
  config: WorkDesignOosConfig,
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
      signal: AbortSignal.timeout(workDesignOosTimeoutMs),
    });
  } catch (error) {
    throw new WorkDesignOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "work_design_oos_unavailable",
      502,
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : isRecord(body) && typeof body.error === "string"
          ? body.error
          : response.statusText || "OOS rejected the Work Design request.";
    const code =
      isRecord(body) && typeof body.code === "string"
        ? body.code
        : "work_design_oos_rejected";
    throw new WorkDesignOosError(message, code, response.status);
  }
  return body;
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableId(prefix: string, value: string) {
  return `${prefix}:${createHash("sha256").update(value).digest("hex").slice(0, 40)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
