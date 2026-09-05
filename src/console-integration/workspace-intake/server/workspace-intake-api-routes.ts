import { NextRequest, NextResponse } from "next/server";

import {
  assertWorkspaceIntakeRequestId,
  assertWorkspaceIntakeTarget,
  WorkspaceIntakeContractError,
} from "../workspace-intake-live-contract.ts";
import {
  cancelWorkspaceIntake,
  continueWorkspaceIntake,
  prepareWorkspaceIntake,
  readWorkspaceIntake,
  submitWorkspaceIntake,
  workspaceIntakeOosConfigured,
  WorkspaceIntakeOosError,
} from "./workspace-intake-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function prepareWorkspaceIntakeRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    return prepareWorkspaceIntake(assertWorkspaceIntakeTarget(input.target));
  });
}

export async function submitWorkspaceIntakeRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    return submitWorkspaceIntake(await request.json().catch(() => null));
  }, 202);
}

export async function readWorkspaceIntakeRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return readWorkspaceIntake(assertWorkspaceIntakeRequestId(requestId));
  });
}

export async function continueWorkspaceIntakeRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return continueWorkspaceIntake(assertWorkspaceIntakeRequestId(requestId));
  });
}

export async function cancelWorkspaceIntakeRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return cancelWorkspaceIntake(assertWorkspaceIntakeRequestId(requestId));
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
      error instanceof WorkspaceIntakeOosError ||
      error instanceof WorkspaceIntakeContractError;
    return NextResponse.json(
      {
        code: known ? error.code : "workspace_intake_adapter_failed",
        error:
          error instanceof Error
            ? error.message
            : "Workspace Intake adapter failed.",
        retryable: error instanceof WorkspaceIntakeOosError && error.retryable,
      },
      {
        headers: noStoreHeaders,
        status:
          error instanceof WorkspaceIntakeOosError
            ? error.status
            : error instanceof WorkspaceIntakeContractError
              ? 400
              : 502,
      },
    );
  }
}

function requireConfigured() {
  if (!workspaceIntakeOosConfigured()) {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake is unavailable until its approved OOS integration is active.",
      "workspace_intake_live_mode_required",
      503,
    );
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WorkspaceIntakeContractError("Workspace Intake input is invalid.");
  }
  return value as Record<string, unknown>;
}
