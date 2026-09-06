import { NextRequest, NextResponse } from "next/server";

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
  submitWorkspaceInventoryLifecycle,
  submitWorkspaceInventoryPromotion,
  workspaceRegistryOosConfigured,
  WorkspaceRegistryOosError,
} from "./workspace-registry-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readWorkspaceRegistryRoute() {
  return execute(async () => {
    requireConfigured();
    return readWorkspaceRegistry();
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
