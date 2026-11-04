import { NextRequest, NextResponse } from "next/server";
import { repositoryStatusNames } from "../workspace-repository-status.ts";

import {
  assertWorkspaceInventoryLifecycleRequestId,
  assertWorkspaceInventoryRequestId,
  assertWorkspaceRegistryTarget,
  WorkspaceRegistryContractError,
} from "../workspace-registry-contract.ts";
import {
  cancelWorkspaceInventoryLifecycle,
  cancelWorkspaceInventoryPromotion,
  continueWorkspaceInventoryLifecycle,
  continueWorkspaceInventoryPromotion,
  prepareWorkspaceInventoryLifecycle,
  prepareWorkspaceInventoryPromotion,
  readWorkspaceInventoryLifecycle,
  readWorkspaceInventoryPromotion,
  readWorkspaceRegistry,
  readRepositoryRegistrationStatus,
  readWorkspaceInventoryRequestJournal,
  submitWorkspaceInventoryLifecycle,
  submitWorkspaceInventoryPromotion,
  workspaceRegistryOosConfigured,
  WorkspaceRegistryOosError,
} from "./workspace-registry-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readRepositoryRegistrationStatusRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    if ([...request.nextUrl.searchParams.keys()].some(key => key !== "name")) throw new WorkspaceRegistryContractError("Select exact repository names.");
    const names = request.nextUrl.searchParams.getAll("name");
    try { repositoryStatusNames(names); } catch { throw new WorkspaceRegistryContractError("Select at most 25 exact ordered repository names."); }
    return readRepositoryRegistrationStatus(names);
  });
}

export async function listWorkspaceInventoryRoute(request: NextRequest, family: "promotion" | "lifecycle") {
  return execute(async () => {
    requireConfigured();
    const query = request.nextUrl.searchParams;
    const keys = [...query.keys()];
    if (keys.some(key => !["target_kind", "target_name", "cursor"].includes(key)) || new Set(keys).size !== keys.length) {
      throw new WorkspaceRegistryContractError("Original-request selectors are invalid.");
    }
    const kind = query.get("target_kind"), name = query.get("target_name");
    const target = assertWorkspaceRegistryTarget({ kind, name, record_id: `${kind}:${name}` });
    return readWorkspaceInventoryRequestJournal(family, target, query.get("cursor") ?? undefined);
  });
}

export async function readWorkspaceRegistryRoute(request?: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const query = request?.nextUrl.searchParams ?? new URLSearchParams();
    const keys = [...query.keys()], scope = query.get("scope") ?? "inventory", search = query.get("query") ?? "", after = query.get("after");
    if (new Set(keys).size !== keys.length || keys.some(key => !["scope", "query", "after"].includes(key)) ||
        !["inventory", "eligible"].includes(scope) || search.length > 128 || (after !== null && !/^repo:[a-z0-9][a-z0-9._-]{0,185}$/.test(after))) throw new WorkspaceRegistryContractError("Select one bounded Registry page.");
    return readWorkspaceRegistry({ selection: { scope: scope as "inventory" | "eligible", query: search.trim().toLowerCase(), after } });
  });
}

export async function prepareWorkspaceInventoryRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    return prepareWorkspaceInventoryPromotion(
      assertWorkspaceRegistryTarget(input.target),
    );
  });
}

export async function submitWorkspaceInventoryRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    return submitWorkspaceInventoryPromotion(
      await request.json().catch(() => null),
    );
  }, 202);
}

export async function prepareWorkspaceInventoryLifecycleRoute(
  request: NextRequest,
) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    return prepareWorkspaceInventoryLifecycle(
      assertWorkspaceRegistryTarget(input.target),
    );
  });
}

export async function submitWorkspaceInventoryLifecycleRoute(
  request: NextRequest,
) {
  return execute(async () => {
    requireConfigured();
    return submitWorkspaceInventoryLifecycle(
      await request.json().catch(() => null),
    );
  }, 202);
}

export async function readWorkspaceInventoryLifecycleRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return readWorkspaceInventoryLifecycle(
      assertWorkspaceInventoryLifecycleRequestId(requestId),
    );
  });
}

export async function continueWorkspaceInventoryLifecycleRoute(
  requestId: string,
) {
  return execute(async () => {
    requireConfigured();
    return continueWorkspaceInventoryLifecycle(
      assertWorkspaceInventoryLifecycleRequestId(requestId),
    );
  });
}

export async function cancelWorkspaceInventoryLifecycleRoute(
  requestId: string,
) {
  return execute(async () => {
    requireConfigured();
    return cancelWorkspaceInventoryLifecycle(
      assertWorkspaceInventoryLifecycleRequestId(requestId),
    );
  });
}

export async function readWorkspaceInventoryRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return readWorkspaceInventoryPromotion(
      assertWorkspaceInventoryRequestId(requestId),
    );
  });
}

export async function continueWorkspaceInventoryRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return continueWorkspaceInventoryPromotion(
      assertWorkspaceInventoryRequestId(requestId),
    );
  });
}

export async function cancelWorkspaceInventoryRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return cancelWorkspaceInventoryPromotion(
      assertWorkspaceInventoryRequestId(requestId),
    );
  });
}

async function execute(operation: () => Promise<unknown>, successStatus = 200) {
  try {
    return NextResponse.json(await operation(), {
      headers: noStoreHeaders,
      status: successStatus,
    });
  } catch (error) {
    const known =
      error instanceof WorkspaceRegistryOosError ||
      error instanceof WorkspaceRegistryContractError;
    return NextResponse.json(
      {
        code: known ? error.code : "workspace_registry_adapter_failed",
        error:
          error instanceof Error
            ? error.message
            : "Workspace Registry adapter failed.",
        retryable: error instanceof WorkspaceRegistryOosError && error.retryable,
      },
      {
        headers: noStoreHeaders,
        status:
          error instanceof WorkspaceRegistryOosError
            ? error.status
            : error instanceof WorkspaceRegistryContractError
              ? 400
              : 502,
      },
    );
  }
}

function requireConfigured() {
  if (!workspaceRegistryOosConfigured()) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry is unavailable until its approved OOS integration is active.",
      "workspace_registry_live_mode_required",
      503,
    );
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WorkspaceRegistryContractError("Workspace Registry input is invalid.");
  }
  return value as Record<string, unknown>;
}
