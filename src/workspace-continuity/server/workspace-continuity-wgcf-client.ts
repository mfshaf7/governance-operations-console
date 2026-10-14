import { createHash } from "node:crypto";

import {
  consoleWgcfModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleWgcfConnection,
  type ConsoleWgcfConnection,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import { assertWorkspaceContinuityProjection } from "../workspace-continuity-contract.ts";
import type { WorkspaceContinuityProjection } from "../workspace-continuity-types.ts";

const maxResponseBytes = 2_097_152;
const timeoutMs = 8_000;

export class WorkspaceContinuityWgcfError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "WorkspaceContinuityWgcfError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function workspaceContinuityWgcfConfigured(env = process.env) {
  return consoleWgcfModeSelected(env);
}

export async function readWorkspaceContinuity({
  config,
  fetchImpl = fetch,
}: {
  config?: ConsoleWgcfConnection;
  fetchImpl?: typeof fetch;
} = {}): Promise<WorkspaceContinuityProjection> {
  const resolved = config ?? resolveConfig();
  let response: Response;
  try {
    response = await fetchImpl(
      `${resolved.baseUrl}/v1/projections/workspace-continuity`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "x-wgcf-caller-id": resolved.callerId,
          "x-wgcf-caller-secret": resolved.callerSecret,
        },
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    throw new WorkspaceContinuityWgcfError(
      "Workspace continuity could not reach WGCF.",
      "workspace_continuity_wgcf_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new WorkspaceContinuityWgcfError(
      "Workspace continuity response exceeded the Console limit.",
      "workspace_continuity_response_large",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new WorkspaceContinuityWgcfError(
      "WGCF returned malformed workspace continuity evidence.",
      "workspace_continuity_projection_invalid",
      502,
    );
  }
  if (!response.ok) {
    const failure = typeof body === "object" && body !== null
      ? body as Record<string, unknown>
      : {};
    throw new WorkspaceContinuityWgcfError(
      typeof failure.detail === "string"
        ? failure.detail
        : "WGCF rejected the workspace continuity read.",
      typeof failure.code === "string"
        ? failure.code
        : "workspace_continuity_wgcf_rejected",
      response.status,
      response.status >= 500,
    );
  }
  assertProjectionDigest(body);
  try {
    return assertWorkspaceContinuityProjection(body);
  } catch (error) {
    throw new WorkspaceContinuityWgcfError(
      error instanceof Error
        ? error.message
        : "WGCF returned invalid workspace continuity evidence.",
      "workspace_continuity_projection_invalid",
      502,
    );
  }
}

function assertProjectionDigest(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidProjection("WGCF returned malformed workspace continuity evidence.");
  }
  const projection = value as Record<string, unknown>;
  if (typeof projection.projection_digest !== "string") {
    throw invalidProjection("WGCF continuity omitted its projection digest.");
  }
  const digest = projection.projection_digest;
  const source = Object.fromEntries(
    Object.entries(projection).filter(
      ([key]) => key !== "projection_digest" && key !== "projection_id",
    ),
  );
  const actual = `sha256:${createHash("sha256").update(canonicalStringify(source)).digest("hex")}`;
  if (actual !== digest) {
    throw invalidProjection("WGCF continuity projection digest is invalid.");
  }
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw invalidProjection("WGCF continuity contains an unsupported number.");
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(",")}}`;
  }
  throw invalidProjection("WGCF continuity contains unsupported data.");
}

function invalidProjection(message: string) {
  return new WorkspaceContinuityWgcfError(
    message,
    "workspace_continuity_projection_invalid",
    502,
  );
}

function resolveConfig(env = process.env) {
  try {
    return resolveConsoleWgcfConnection(env);
  } catch (error) {
    const invalidUrl =
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_wgcf_url_invalid";
    throw new WorkspaceContinuityWgcfError(
      invalidUrl
        ? "Workspace continuity WGCF endpoint is invalid."
        : "Workspace continuity is unavailable until the approved WGCF integration is configured.",
      invalidUrl
        ? "workspace_continuity_wgcf_url_invalid"
        : "workspace_continuity_wgcf_not_configured",
      503,
    );
  }
}
