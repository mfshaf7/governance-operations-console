import {
  consoleOosModeSelected,
  resolveConsoleOosOperatorConfiguration,
  type ConsoleOosOperatorConfiguration,
  ConsoleRuntimeConfigurationError,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
  type ConsoleSourceAuthorityExpectation,
} from "../../../console-integration/source-authority/console-source-authority.ts";

import {
  assertProposalOosCommandResult,
  assertProposalOosHandoffApplicationResult,
  assertProposalOosHistory,
  assertProposalOosProjection,
  assertProposalTargetApplicationResult,
} from "../live-runtime/proposal-live-contract.ts";
import type {
  ProposalLiveCaptureRequest,
  ProposalLiveCommandRequest,
  ProposalLiveHandoffApplicationRequest,
  ProposalLiveRecord,
  ProposalOosCommandResult,
  ProposalOosHandoffApplicationResult,
  ProposalOosHistory,
  ProposalOosProjection,
  ProposalOosRoute,
  ProposalLiveTargetApplicationRequest,
  ProposalTargetApplicationResult,
} from "../live-runtime/proposal-live-types.ts";

const proposalListLimit = 25;
const proposalOosTimeoutMs = 8_000;

type ProposalOosConfig = ConsoleOosOperatorConfiguration;

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
  return consoleOosModeSelected(env);
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

export async function applyProposalDeliveryHandoff(
  request: ProposalLiveHandoffApplicationRequest,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<ProposalOosHandoffApplicationResult> {
  const config = resolveProposalOosConfig(env);
  const result = await proposalOosRequest(
    config,
    `/v1/proposals/${encodeURIComponent(request.proposalId)}/handoff/apply`,
    {
      body: JSON.stringify({
        application_id: proposalDeliveryApplicationId(request.proposalId),
        authority: {
          mutation_adapter: "operator-orchestration-service",
          record_project: "workspace-proposals",
          record_system: "openproject",
        },
        operator: proposalOperator(config),
        proposal_id: request.proposalId,
        schema_version: 1,
        source: {
          handoff_packet_ref: request.source.handoffPacketRef,
          record_ref: request.source.recordRef,
          record_version: request.source.recordVersion,
          status: request.source.status,
        },
      }),
      method: "POST",
    },
    fetchImpl,
  );
  return assertProposalOosHandoffApplicationResult(result);
}

export async function startProposalTargetApplication(
  request: ProposalLiveTargetApplicationRequest,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<ProposalTargetApplicationResult> {
  const config = resolveProposalOosConfig(env);
  const projection = await readProposalProjection(
    config,
    request.proposalId,
    fetchImpl,
  );
  assertProposalTargetApplicationSource(request, projection);
  const prototypeId = proposalTargetPrototypeId(request.proposalId);
  const preparation = assertProposalTargetPreparation(
    await proposalOosRequest(
      config,
      "/v1/proposal-target-applications/preparations",
      {
        body: JSON.stringify({
          proposal_id: request.proposalId,
        }),
        method: "POST",
      },
      fetchImpl,
    ),
    request,
    prototypeId,
  );
  const applicationId = proposalTargetApplicationId(request.proposalId);
  const submitted = assertProposalTargetApplicationResult(
    await proposalOosRequest(
      config,
      "/v1/proposal-target-applications",
      {
        body: JSON.stringify({
          application_id: applicationId,
          correlation_id: `console:proposal-target:${request.proposalId}`,
          execution_ref: `console:proposal-target:${request.proposalId}:${request.source.recordVersion}`,
          idempotency_key: applicationId,
          operator_approval_ref: `console-approval:${config.operatorId}:${request.proposalId}:${request.source.recordVersion}`,
          proposal: {
            handoff_packet_digest:
              preparation.proposal.handoff_packet_digest,
            handoff_packet_ref: preparation.proposal.handoff_packet_ref,
            proposal_id: preparation.proposal.proposal_id,
            record_ref: preparation.proposal.record_ref,
            record_version: preparation.proposal.record_version,
          },
          prototype: {
            id: prototypeId,
            suggested_name: projection.title,
            suggested_objective:
              projection.body ?? projection.route?.rationale ?? projection.title,
          },
          session_ref: `console-session:${request.proposalId}:${request.source.recordVersion}`,
          target: {
            authority_revision: preparation.authority_revision,
            expected_state: preparation.expected_state,
          },
        }),
        method: "POST",
      },
      fetchImpl,
    ),
  );
  if (
    submitted.application_id !== applicationId ||
    submitted.proposal_id !== request.proposalId ||
    submitted.prototype_id !== prototypeId
  ) {
    throw new ProposalOosError(
      "OOS returned a different Proposal target application identity.",
      "proposal_target_projection_invalid",
      502,
    );
  }
  return submitted.status === "accepted" || submitted.status === "preparing"
    ? commandProposalTargetApplication(request.proposalId, "continue", {
        env,
        fetchImpl,
      })
    : submitted;
}

export async function commandProposalTargetApplication(
  proposalId: string,
  action: "cancel" | "continue",
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
) {
  const config = resolveProposalOosConfig(env);
  const applicationId = proposalTargetApplicationId(proposalId);
  const result = assertProposalTargetApplicationResult(
    await proposalOosRequest(
      config,
      `/v1/proposal-target-applications/${encodeURIComponent(applicationId)}/${action}`,
      { body: "{}", method: "POST" },
      fetchImpl,
    ),
  );
  if (
    result.application_id !== applicationId ||
    result.proposal_id !== proposalId ||
    result.prototype_id !== proposalTargetPrototypeId(proposalId)
  ) {
    throw new ProposalOosError(
      "OOS returned a different Proposal target application binding.",
      "proposal_target_projection_invalid",
      502,
    );
  }
  return result;
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
    proposalSourceExpectation(proposalId),
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
    proposalSourceExpectation(proposalId),
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
  try {
    return resolveConsoleOosOperatorConfiguration(env);
  } catch (error) {
    const invalidUrl =
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_url_invalid";
    throw new ProposalOosError(
      error instanceof Error
        ? error.message
        : "Proposal live integration configuration is invalid.",
      invalidUrl ? "proposal_oos_url_invalid" : "proposal_oos_not_configured",
      503,
    );
  }
}

function proposalOperator(config: ProposalOosConfig) {
  return {
    id: config.callerId,
  };
}

function proposalDeliveryApplicationId(proposalId: string) {
  const numericId = proposalId.match(/^idea-([1-9][0-9]*)$/)?.[1];
  if (!numericId) {
    throw new ProposalOosError(
      "Delivery handoff requires a canonical Proposal identity.",
      "proposal_handoff_application_identity_invalid",
      400,
    );
  }
  return `proposal-application:${numericId}:delivery-1`;
}

export function proposalTargetApplicationId(proposalId: string) {
  const numericId = proposalNumericId(proposalId);
  return `proposal-prototype-application:proposal-${numericId}:${numericId}`;
}

function proposalTargetPrototypeId(proposalId: string) {
  return `prototype:proposal-${proposalNumericId(proposalId)}`;
}

function proposalNumericId(proposalId: string) {
  const numericId = proposalId.match(/^idea-([1-9][0-9]*)$/)?.[1];
  if (!numericId) {
    throw new ProposalOosError(
      "Target application requires a canonical Proposal identity.",
      "proposal_target_application_identity_invalid",
      400,
    );
  }
  return numericId;
}

function assertProposalTargetApplicationSource(
  request: ProposalLiveTargetApplicationRequest,
  projection: ProposalOosProjection,
) {
  if (
    projection.proposal_id !== request.proposalId ||
    projection.record_ref !== request.source.recordRef ||
    projection.record_version !== request.source.recordVersion ||
    projection.status !== request.source.status ||
    projection.projection_state !== "current" ||
    projection.route?.target !== "prototype" ||
    projection.route.source_custody.repository_gate_state !== "resolved" ||
    projection.handoff.state !== "ready" ||
    projection.handoff.packet_ref !== request.source.handoffPacketRef
  ) {
    throw new ProposalOosError(
      "Proposal target application requires the current accepted Prototype route, resolved repository gate, and exact prepared handoff.",
      "proposal_target_source_stale",
      409,
    );
  }
}

function assertProposalTargetPreparation(
  value: unknown,
  request: ProposalLiveTargetApplicationRequest,
  prototypeId: string,
) {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    value.workflow_id !== "proposal-target-application" ||
    value.prototype_id !== prototypeId ||
    typeof value.authority_revision !== "string" ||
    !/^[0-9a-f]{40}$/.test(value.authority_revision) ||
    !isRecord(value.expected_state) ||
    value.expected_state.source_revision !== value.authority_revision ||
    typeof value.expected_state.registry_digest !== "string" ||
    value.expected_state.record_present !== false ||
    value.expected_state.record_digest !== null ||
    !isRecord(value.proposal) ||
    value.proposal.proposal_id !== request.proposalId ||
    value.proposal.record_ref !== request.source.recordRef ||
    value.proposal.record_version !== request.source.recordVersion ||
    value.proposal.handoff_packet_ref !== request.source.handoffPacketRef ||
    typeof value.proposal.handoff_packet_digest !== "string" ||
    value.canonical_mutation !== false
  ) {
    throw new ProposalOosError(
      "OOS returned invalid Proposal target preparation evidence.",
      "proposal_target_preparation_invalid",
      502,
    );
  }
  return value as {
    authority_revision: string;
    expected_state: {
      record_digest: null;
      record_present: false;
      registry_digest: string;
      source_revision: string;
    };
    proposal: {
      handoff_packet_digest: string;
      handoff_packet_ref: string;
      proposal_id: string;
      record_ref: string;
      record_version: string;
    };
  };
}

function proposalSourceExpectation(
  proposalId: string,
): ConsoleSourceAuthorityExpectation {
  const numericId = proposalId.match(/^idea-([1-9][0-9]*)$/)?.[1];
  return {
    authority: "operator-orchestration-service",
    recordRef: numericId
      ? `openproject://work_packages/${numericId}`
      : `proposal://${proposalId}`,
    sourceOwner: "workspace-proposals",
  };
}

async function proposalOosRequest(
  config: ProposalOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  sourceExpectation?: ConsoleSourceAuthorityExpectation,
) {
  const signal = AbortSignal.timeout(proposalOosTimeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(sourceExpectation
          ? consoleSourceProjectionHeaders(init.headers)
          : Object.fromEntries(new Headers(init.headers).entries())),
        ...consoleMutationAttributionHeaders(),
        ...(!sourceExpectation ? { Accept: "application/json" } : {}),
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
  if (!sourceExpectation) return body;
  try {
    return acceptCurrentConsoleSourceProjection(body, sourceExpectation);
  } catch (error) {
    if (error instanceof ConsoleSourceAuthorityError) {
      throw new ProposalOosError(error.message, error.code, 502);
    }
    throw error;
  }
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
