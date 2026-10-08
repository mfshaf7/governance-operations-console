import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleModelOperationsConfiguration,
  type ConsoleModelOperationsConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
} from "../../../console-integration/source-authority/console-source-authority.ts";
import {
  assertModelProfileRequestDraft,
  assertModelProfileRequestProjection,
  operationalExpectations,
  parseRegisteredCallers,
} from "../live-runtime/model-operations-live-contract.ts";
import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../live-runtime/model-operations-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

export class ModelOperationsOosError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "ModelOperationsOosError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

type Options = Readonly<{
  config?: ConsoleModelOperationsConfiguration;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}>;

export async function listModelProfileRequests(
  options: Options = {},
): Promise<ModelProfileRequestProjection[]> {
  const list = record(await request("/v1/model-profile-requests?limit=100", { method: "GET" }, options));
  if (list.schema_version !== 1 || !Array.isArray(list.requests) || list.next_cursor !== null) {
    throw projectionError("OOS returned an invalid or truncated model-profile request list.");
  }
  const ids = list.requests.map((value) => {
    const item = assertModelProfileRequestProjection(value);
    return item.request_id;
  });
  if (new Set(ids).size !== ids.length) {
    throw projectionError("OOS returned duplicate model-profile request identities.");
  }
  return Promise.all(ids.map((requestId) => readModelProfileRequest(requestId, options)));
}

export async function readModelProfileRequest(
  requestId: string,
  options: Options = {},
) {
  const value = await request(
    `/v1/model-profile-requests/${encodeURIComponent(requestId)}`,
    { method: "GET" },
    options,
    requestId,
  );
  return assertModelProfileRequestProjection(value);
}

export async function submitCreateModelProfileRequest(
  value: unknown,
  options: Options = {},
) {
  const draft = assertModelProfileRequestDraft(value);
  const config = options.config ?? resolveConfig();
  const now = options.now?.() ?? new Date();
  const requestValue = createRequest(draft, config.operatorId, now);
  const created = assertModelProfileRequestProjection(
    await request(
      "/v1/model-profile-requests",
      { body: JSON.stringify(requestValue), method: "POST" },
      { ...options, config },
    ),
  );
  if (created.request_id !== draft.requestId || created.review_state !== "draft") {
    throw projectionError("OOS returned another model-profile request binding.");
  }
  const submitted = assertModelProfileRequestProjection(
    await request(
      `/v1/model-profile-requests/${encodeURIComponent(draft.requestId)}/commands`,
      {
        body: JSON.stringify({
          schema_version: 1,
          command_id: `model-profile-command:${draft.requestId.split(":").slice(1).join(":")}:submit`,
          request_id: draft.requestId,
          expected_revision: created.revision,
          action: "submit",
          operator_id: config.operatorId,
          issued_at: (options.now?.() ?? new Date()).toISOString(),
          reason: null,
          decision_ref: null,
          requirements: [],
          revised_profile_intent: null,
          idempotency_key: `${draft.requestId}:submit:v1`,
        }),
        method: "POST",
      },
      { ...options, config },
    ),
  );
  if (
    submitted.request_id !== draft.requestId ||
    submitted.review_state !== "submitted" ||
    submitted.revision !== created.revision + 1
  ) throw projectionError("OOS did not return the submitted model-profile request.");
  return submitted;
}

function createRequest(
  draft: ModelProfileRequestDraft,
  operatorId: string,
  now: Date,
) {
  return {
    schema_version: 1,
    request_id: draft.requestId,
    intent: "create",
    requested_at: now.toISOString(),
    operator_id: operatorId,
    profile_intent: {
      profile_id: null,
      source: null,
      display_name: draft.displayName.trim(),
      intended_purpose: draft.purpose.trim(),
      requesting_owner: draft.ownerRepo.trim(),
      registered_callers: parseRegisteredCallers(draft.registeredCallers),
      requested_environments: [draft.environment],
      input_data_classification: draft.dataClassification,
      admitted_context_ref: {
        uri: draft.admittedContextUri.trim(),
        digest: draft.admittedContextDigest,
      },
      required_output_schema_ref: {
        repo: draft.outputSchemaRepo.trim(),
        path: draft.outputSchemaPath.trim(),
        version: draft.outputSchemaVersion.trim(),
      },
      human_approval_required: true,
      operational_expectations: operationalExpectations(
        draft.operationalExpectations,
      ),
      operator_justification: draft.justification.trim(),
    },
    delivery_ref: null,
    correlation_id: `console-model-profile:${draft.requestId.split(":").slice(1).join(":")}`,
    causation_id: null,
    idempotency_key: `${draft.requestId}:create:v1`,
  };
}

function resolveConfig() {
  try {
    return resolveConsoleModelOperationsConfiguration();
  } catch (error) {
    throw new ModelOperationsOosError(
      "Model Operations is unavailable until its approved OOS and Platform integration is configured.",
      error instanceof ConsoleRuntimeConfigurationError
        ? error.code
        : "model_operations_configuration_invalid",
      503,
    );
  }
}

async function request(
  path: string,
  init: RequestInit,
  options: Options,
  sourceRequestId?: string,
) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(sourceRequestId
          ? consoleSourceProjectionHeaders(init.headers)
          : Object.fromEntries(new Headers(init.headers).entries())),
        ...consoleMutationAttributionHeaders(),
        ...(!sourceRequestId ? { Accept: "application/json" } : {}),
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
        "x-oos-operator-id": config.operatorId,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ModelOperationsOosError(
      "Model Operations could not reach OOS.",
      "model_operations_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new ModelOperationsOosError(
      "Model Operations response exceeded the Console limit.",
      "model_operations_response_large",
      502,
    );
  }
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw projectionError("Model Operations received an invalid OOS response.");
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new ModelOperationsOosError(
      typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : "OOS rejected the Model Operations request.",
      typeof source.code === "string" ? source.code : "model_operations_oos_rejected",
      response.status,
      source.retryable === true,
    );
  }
  if (!sourceRequestId) return body;
  try {
    return acceptCurrentConsoleSourceProjection(body, {
      authority: "operator-orchestration-service",
      recordRef: `oos://model-profile-requests/${sourceRequestId}`,
      sourceOwner: "operator-orchestration-service",
    });
  } catch (error) {
    if (error instanceof ConsoleSourceAuthorityError) {
      throw new ModelOperationsOosError(error.message, error.code, 502);
    }
    throw error;
  }
}

function projectionError(message: string) {
  return new ModelOperationsOosError(
    message,
    "model_operations_projection_invalid",
    502,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw projectionError("Expected an OOS response object.");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
