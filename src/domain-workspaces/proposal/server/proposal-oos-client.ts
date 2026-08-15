import {
  assertProposalOosCommandResult,
  assertProposalOosHistory,
  assertProposalOosProjection,
} from "../live-runtime/proposal-live-contract.ts";
import type {
  ProposalLiveCaptureRequest,
  ProposalLiveCommandRequest,
  ProposalLiveRecord,
  ProposalOosCommandResult,
  ProposalOosHistory,
  ProposalOosProjection,
  ProposalOosRoute,
} from "../live-runtime/proposal-live-types.ts";

const proposalListLimit = 25;
const proposalOosTimeoutMs = 8_000;

type ProposalOosConfig = {
  baseUrl: string;
  callerId: string;
  callerSecret: string;
  operatorHandle?: string;
  operatorId: string;
};

type ProposalIdeaListItem = {
  created_at?: string | null;
  idea_id: string;
};

export class ProposalOosError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function proposalOosConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim());
}

export async function listProposalLiveRecords({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
} = {}): Promise<ProposalLiveRecord[]> {
  const config = resolveProposalOosConfig(env);
  const list = await proposalOosRequest(
    config,
    `/v1/ideas?limit=${proposalListLimit}&offset=1`,
    { method: "GET" },
    fetchImpl,
  );
  if (!isRecord(list) || !Array.isArray(list.ideas)) {
    throw new ProposalOosError(
      "OOS returned an invalid Proposal list.",
      "proposal_list_invalid",
      502,
    );
  }

  const ideas = list.ideas.map(assertIdeaListItem);
  return Promise.all(
    ideas.map(async (idea) => {
      const [projection, history] = await Promise.all([
        readProposalProjection(config, idea.idea_id, fetchImpl),
        readProposalHistory(config, idea.idea_id, fetchImpl),
      ]);
      return {
        createdAt: idea.created_at ?? projection.updated_at,
        history,
        projection,
      };
    }),
  );
}

export async function captureProposal(
  request: ProposalLiveCaptureRequest,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
) {
  const config = resolveProposalOosConfig(env);
  const result = await proposalOosRequest(
    config,
    "/v1/ideas/capture",
    {
      body: JSON.stringify({
        body: request.body,
        operator: proposalOperator(config),
        source: {
          context_ref: { request_id: request.requestId },
          integration_id: "governance-operations-console",
          native_ref: {
            command: "proposal-capture",
            request_id: request.requestId,
          },
          surface: "governance-operations-console",
        },
        title: request.title,
      }),
      method: "POST",
    },
    fetchImpl,
  );
  if (!isRecord(result) || typeof result.idea_id !== "string") {
    throw new ProposalOosError(
      "OOS returned an invalid Proposal capture result.",
      "proposal_capture_invalid",
      502,
    );
  }
  return result.idea_id;
}

export async function applyProposalCommand(
  request: ProposalLiveCommandRequest,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<ProposalOosCommandResult> {
  const config = resolveProposalOosConfig(env);
  const currentProjection =
    request.payload.step === "handoff"
      ? await readProposalProjection(config, request.proposalId, fetchImpl)
      : null;
  const command = proposalOosCommand(request, config, currentProjection);
  const result = await proposalOosRequest(
    config,
    `/v1/proposals/${encodeURIComponent(request.proposalId)}/commands`,
    { body: JSON.stringify(command), method: "POST" },
    fetchImpl,
  );
  return assertProposalOosCommandResult(result);
}

export async function readProposalProjection(
  config: ProposalOosConfig,
  proposalId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProposalOosProjection> {
  const value = await proposalOosRequest(
    config,
    `/v1/proposals/${encodeURIComponent(proposalId)}/projection`,
    { method: "GET" },
    fetchImpl,
  );
  return assertProposalOosProjection(value);
}

export async function readProposalHistory(
  config: ProposalOosConfig,
  proposalId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProposalOosHistory> {
  const value = await proposalOosRequest(
    config,
    `/v1/proposals/${encodeURIComponent(proposalId)}/history`,
    { method: "GET" },
    fetchImpl,
  );
  return assertProposalOosHistory(value);
}

function proposalOosCommand(
  request: ProposalLiveCommandRequest,
  config: ProposalOosConfig,
  currentProjection: ProposalOosProjection | null,
) {
  return {
    authority: {
      mutation_adapter: "operator-orchestration-service",
      record_project: "workspace-proposals",
      record_system: "openproject",
    },
    command: proposalOosCommandPayload(request, currentProjection),
    command_id: request.commandId,
    operator: proposalOperator(config),
    proposal_id: request.proposalId,
    schema_version: 1,
    source: {
      projection_state: request.source.projectionState,
      record_ref: request.source.recordRef,
      record_version: request.source.recordVersion,
      status: request.source.status,
    },
  };
}

function proposalOosCommandPayload(
  request: ProposalLiveCommandRequest,
  currentProjection: ProposalOosProjection | null,
) {
  const { payload } = request;
  if (payload.step === "triage") {
    return { summary: payload.summary, type: "triage" };
  }
  if (payload.step === "disposition") {
    return {
      notes: payload.decision.notes,
      outcome: payload.decision.outcome,
      route: payload.route ? proposalOosRoute(payload.route) : null,
      type: "disposition",
    };
  }

  const route = currentProjection?.route;
  if (!route) {
    throw new ProposalOosError(
      "Handoff requires the canonical route projection.",
      "handoff_route_missing",
      400,
    );
  }
  return {
    notes: payload.notes,
    packet_ref:
      payload.result === "ready"
        ? `proposal-handoff:${request.proposalId}:${request.source.recordVersion}`
        : null,
    result: payload.result,
    route,
    type: "handoff",
  };
}

function proposalOosRoute(
  route: NonNullable<
    Extract<ProposalLiveCommandRequest["payload"], { step: "disposition" }>["route"]
  >,
): ProposalOosRoute {
  const target = route.routeTarget === "Delivery" ? "delivery" : "prototype";
  if (route.repoMode === "existing") {
    return {
      rationale: route.rationale,
      source_custody: {
        classification: "existing-repo",
        owner: route.repoOwner,
        rationale: "The selected route uses an existing owner repository.",
        repository_gate_state: "resolved",
        repository_mode: "existing",
        source_ref: route.repoRef,
      },
      target,
    };
  }
  if (route.repoMode === "new") {
    return {
      rationale: route.rationale,
      source_custody: {
        classification: "new-repo-required",
        owner: null,
        rationale: "Repository Operation must resolve source custody before Handoff.",
        repository_gate_state: "pending",
        repository_mode: "new",
        source_ref: null,
      },
      target,
    };
  }
  return {
    rationale: route.rationale,
    source_custody: {
      classification: "non-source-work",
      owner: target,
      rationale: "The selected route does not require repository custody.",
      repository_gate_state: "not-required",
      repository_mode: "not-required",
      source_ref: null,
    },
    target,
  };
}

function resolveProposalOosConfig(env: NodeJS.ProcessEnv): ProposalOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  if (!baseUrl || !callerSecret || !operatorId) {
    throw new ProposalOosError(
      "Proposal live integration is missing its OOS endpoint, caller secret, or operator identity.",
      "proposal_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ProposalOosError(
      "Proposal OOS endpoint must use HTTP or HTTPS.",
      "proposal_oos_url_invalid",
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

function proposalOperator(config: ProposalOosConfig) {
  return {
    ...(config.operatorHandle ? { handle: config.operatorHandle } : {}),
    id: config.operatorId,
  };
}

async function proposalOosRequest(
  config: ProposalOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
) {
  const signal = AbortSignal.timeout(proposalOosTimeoutMs);
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
      signal,
    });
  } catch (error) {
    throw new ProposalOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "proposal_oos_unavailable",
      502,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isRecord(body) && typeof body.error === "string" ? body.error : response.statusText;
    const code = isRecord(body) && typeof body.code === "string" ? body.code : "proposal_oos_rejected";
    throw new ProposalOosError(error || "OOS rejected the Proposal request.", code, response.status);
  }
  return body;
}

function assertIdeaListItem(value: unknown): ProposalIdeaListItem {
  if (!isRecord(value) || typeof value.idea_id !== "string") {
    throw new ProposalOosError("OOS returned an invalid Proposal list item.", "proposal_list_invalid", 502);
  }
  return value as unknown as ProposalIdeaListItem;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
