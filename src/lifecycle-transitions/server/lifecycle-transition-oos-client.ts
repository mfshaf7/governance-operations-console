import {
  consoleOosModeSelected,
  resolveConsoleOosConnection,
  ConsoleRuntimeConfigurationError,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import {
  consoleMutationAttributionHeaders,
} from "../../console-integration/identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
  parseConsoleSourceProjection,
} from "../../console-integration/source-authority/console-source-authority.ts";
import {
  projectLifecycleTransitionOwnerProjection,
} from "../live-runtime/lifecycle-transition-live-contract.ts";
import type {
  LifecycleTransitionProjection,
} from "../read-model/lifecycle-transition-projection-types.ts";

const pageSize = 100;
const pageLimit = 5;
const requestTimeoutMs = 8_000;

export class LifecycleTransitionOosError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "LifecycleTransitionOosError";
    this.code = code;
    this.status = status;
  }
}

export function lifecycleTransitionOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return consoleOosModeSelected(env);
}

export async function listLifecycleTransitionOwnerProjections({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
} = {}): Promise<Readonly<{
  observedAt: string;
  transitions: readonly LifecycleTransitionProjection[];
  truncated: boolean;
}>> {
  const config = resolveConsoleOosConnection(env);
  const transitions: LifecycleTransitionProjection[] = [];
  const identities = new Set<string>();
  let cursor: string | null = null;
  let observedAt = new Date(0).toISOString();

  for (let page = 0; page < pageLimit; page += 1) {
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (cursor) query.set("cursor", cursor);
    const body = await lifecycleTransitionOosRequest(
      config,
      `/v1/lifecycle-transitions?${query.toString()}`,
      fetchImpl,
    );
    const result = record(body, "Lifecycle Transition list");
    if (result.schema_version !== 1 || !Array.isArray(result.transitions)) {
      throw invalid("OOS returned an invalid Lifecycle Transition list.");
    }

    for (const value of result.transitions) {
      const envelope = parseConsoleSourceProjection(value);
      const raw = record(envelope.projection, "Lifecycle Transition projection");
      const transitionId = requiredText(raw.transition_id, "transition identity");
      const projection = acceptCurrentConsoleSourceProjection(value, {
        authority: "operator-orchestration-service",
        recordRef: `lifecycle-transition://${transitionId}`,
        sourceOwner: "operator-orchestration-service",
      });
      const projected = projectLifecycleTransitionOwnerProjection(projection);
      if (identities.has(projected.transitionId)) {
        throw invalid("OOS returned a duplicate Lifecycle Transition identity.");
      }
      identities.add(projected.transitionId);
      transitions.push(projected);
      if (envelope.freshness.observed_at > observedAt) {
        observedAt = envelope.freshness.observed_at;
      }
    }

    cursor = result.next_cursor === null
      ? null
      : requiredText(result.next_cursor, "Lifecycle Transition list cursor");
    if (!cursor) {
      return {
        observedAt: observedAt === new Date(0).toISOString()
          ? new Date().toISOString()
          : observedAt,
        transitions: transitions.sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        ),
        truncated: false,
      };
    }
  }

  return {
    observedAt: observedAt === new Date(0).toISOString()
      ? new Date().toISOString()
      : observedAt,
    transitions: transitions.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    ),
    truncated: true,
  };
}

async function lifecycleTransitionOosRequest(
  config: ReturnType<typeof resolveConsoleOosConnection>,
  path: string,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        ...consoleSourceProjectionHeaders(),
        ...consoleMutationAttributionHeaders(),
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      method: "GET",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new LifecycleTransitionOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "lifecycle_transition_oos_unavailable",
      502,
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = isRecord(body) ? body : {};
    throw new LifecycleTransitionOosError(
      typeof failure.error === "string"
        ? failure.error
        : response.statusText || "OOS rejected the Lifecycle Transition read.",
      typeof failure.code === "string"
        ? failure.code
        : "lifecycle_transition_oos_rejected",
      response.status,
    );
  }
  return body;
}

function invalid(message: string) {
  return new LifecycleTransitionOosError(
    message,
    "lifecycle_transition_projection_invalid",
    502,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw invalid(`${label} is invalid.`);
  return value;
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw invalid(`${label} is invalid.`);
  }
  return value;
}

export function normalizeLifecycleTransitionOosError(error: unknown) {
  if (
    error instanceof LifecycleTransitionOosError ||
    error instanceof ConsoleRuntimeConfigurationError
  ) {
    return error;
  }
  if (error instanceof ConsoleSourceAuthorityError) {
    return new LifecycleTransitionOosError(error.message, error.code, 502);
  }
  return new LifecycleTransitionOosError(
    error instanceof Error ? error.message : "Lifecycle Transition adapter failed.",
    "lifecycle_transition_adapter_failed",
    502,
  );
}
