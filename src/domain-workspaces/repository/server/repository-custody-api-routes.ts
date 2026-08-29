import { NextRequest, NextResponse } from "next/server";

import type { RepositoryCustodyLinkIntent } from "../live-runtime/repository-custody-live-types.ts";
import {
  assertRepositoryCustodyRequestId,
  linkExistingRepositoryCustody,
  readRepositoryCustodyResult,
  RepositoryCustodyOosError,
} from "./repository-custody-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function linkExistingRepositoryCustodyRoute(
  request: NextRequest,
) {
  try {
    const result = await linkExistingRepositoryCustody(
      assertLinkIntent(await request.json().catch(() => null)),
    );
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

export async function readRepositoryCustodyResultRoute(requestId: string) {
  try {
    const result = await readRepositoryCustodyResult(
      assertRepositoryCustodyRequestId(requestId),
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

function assertLinkIntent(value: unknown): RepositoryCustodyLinkIntent {
  if (!isRecord(value)) {
    throw invalidIntent();
  }
  return {
    approvalNote: text(value.approvalNote),
    custodyKind: text(value.custodyKind) as RepositoryCustodyLinkIntent["custodyKind"],
    providerHost: text(value.providerHost),
    providerRepositoryId: text(value.providerRepositoryId),
    repositoryId: text(value.repositoryId),
    repositoryName: text(value.repositoryName),
    repositoryOwner: text(value.repositoryOwner),
    requestedAt: text(value.requestedAt),
    requestId: text(value.requestId),
    workspaceOwnerRef: text(value.workspaceOwnerRef),
  };
}

function text(value: unknown) {
  if (typeof value !== "string") throw invalidIntent();
  return value;
}

function invalidIntent() {
  return new RepositoryCustodyOosError(
    "Repository custody request input is invalid.",
    "repository_custody_link_intent_invalid",
    400,
  );
}

function repositoryCustodyErrorResponse(error: unknown) {
  const status = error instanceof RepositoryCustodyOosError ? error.status : 502;
  const code =
    error instanceof RepositoryCustodyOosError
      ? error.code
      : "repository_custody_adapter_failed";
  const message =
    error instanceof Error ? error.message : "Repository custody adapter failed.";
  return NextResponse.json(
    {
      code,
      error: message,
      mode: "live",
      retryable:
        error instanceof RepositoryCustodyOosError && error.retryable,
      status: "offline",
    },
    { headers: noStoreHeaders, status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
