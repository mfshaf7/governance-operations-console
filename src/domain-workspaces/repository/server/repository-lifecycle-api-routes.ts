import { NextRequest, NextResponse } from "next/server";

import type {
  RepositoryLifecycleBlockerDecision,
  RepositoryLifecycleCommandIntent,
} from "../live-runtime/repository-lifecycle-live-types.ts";
import {
  assertRepositoryLifecycleRequestId,
  executeRepositoryLifecycleAction,
  readRepositoryLifecycleAudit,
  readRepositoryLifecycleResult,
  repositoryLifecycleOosConfigured,
  RepositoryLifecycleOosError,
} from "./repository-lifecycle-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readRepositoryLifecycleAuditRoute(
  provider: string,
  providerRepositoryId: string,
) {
  const observedAt = new Date().toISOString();
  if (!repositoryLifecycleOosConfigured()) {
    return NextResponse.json(
      {
        audit: null,
        error: null,
        mode: "disconnected-preview",
        observedAt,
        status: "not-initialized",
      },
      { headers: noStoreHeaders },
    );
  }
  try {
    const audit = await readRepositoryLifecycleAudit({
      provider,
      providerRepositoryId,
    });
    return NextResponse.json(
      { audit, error: null, mode: "live", observedAt, status: "current" },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (
      error instanceof RepositoryLifecycleOosError &&
      error.code === "repository_lifecycle_repository_not_found"
    ) {
      return NextResponse.json(
        {
          audit: null,
          error: null,
          mode: "live",
          observedAt,
          status: "not-initialized",
        },
        { headers: noStoreHeaders },
      );
    }
    return repositoryLifecycleErrorResponse(error);
  }
}

export async function executeRepositoryLifecycleActionRoute(
  request: NextRequest,
) {
  try {
    requireLiveMode();
    const result = await executeRepositoryLifecycleAction(
      lifecycleIntent(await request.json().catch(() => null)),
    );
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return repositoryLifecycleErrorResponse(error);
  }
}

export async function readRepositoryLifecycleResultRoute(requestId: string) {
  try {
    requireLiveMode();
    const result = await readRepositoryLifecycleResult(
      assertRepositoryLifecycleRequestId(requestId),
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return repositoryLifecycleErrorResponse(error);
  }
}

function lifecycleIntent(value: unknown): RepositoryLifecycleCommandIntent {
  const input = record(value);
  const impact = record(input.impact);
  return {
    action: text(input.action) as RepositoryLifecycleCommandIntent["action"],
    approvalNote: text(input.approvalNote),
    impact: {
      blockerDecision:
        impact.blockerDecision === null
          ? null
          : (text(impact.blockerDecision) as RepositoryLifecycleBlockerDecision),
      justification: text(impact.justification),
    },
    provider: text(input.provider) as "github",
    providerRepositoryId: text(input.providerRepositoryId),
    repositoryId: text(input.repositoryId),
    requestedAt: text(input.requestedAt),
    requestId: text(input.requestId),
    sourceCustodyRequestId: nullableText(input.sourceCustodyRequestId),
    sourceOwnerAcceptanceNote: text(input.sourceOwnerAcceptanceNote),
    targetOwnerAcceptanceNote: text(input.targetOwnerAcceptanceNote),
    targetWorkspaceOwnerRef: text(input.targetWorkspaceOwnerRef),
  };
}

function requireLiveMode() {
  if (!repositoryLifecycleOosConfigured()) {
    throw new RepositoryLifecycleOosError(
      "Repository lifecycle actions are unavailable in disconnected preview mode.",
      "repository_lifecycle_live_mode_required",
      503,
    );
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidIntent();
  }
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  if (typeof value !== "string") throw invalidIntent();
  return value;
}

function nullableText(value: unknown) {
  if (value === null) return null;
  return text(value);
}

function invalidIntent() {
  return new RepositoryLifecycleOosError(
    "Repository lifecycle request input is invalid.",
    "repository_lifecycle_intent_invalid",
    400,
  );
}

function repositoryLifecycleErrorResponse(error: unknown) {
  const status = error instanceof RepositoryLifecycleOosError ? error.status : 502;
  const code =
    error instanceof RepositoryLifecycleOosError
      ? error.code
      : "repository_lifecycle_adapter_failed";
  const message =
    error instanceof Error
      ? error.message
      : "Repository lifecycle adapter failed.";
  return NextResponse.json(
    {
      code,
      error: message,
      mode: "live",
      retryable:
        error instanceof RepositoryLifecycleOosError && error.retryable,
      status: "offline",
    },
    { headers: noStoreHeaders, status },
  );
}
