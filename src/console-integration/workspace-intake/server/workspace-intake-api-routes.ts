import { NextRequest, NextResponse } from "next/server";

import {
  assertWorkspaceIntakeRequestId,
  assertWorkspaceIntakeTarget,
  assertWorkspaceIntakeCustodyPreparation,
  WorkspaceIntakeContractError,
} from "../workspace-intake-live-contract.ts";
import {
  cancelWorkspaceIntake,
  continueWorkspaceIntake,
  prepareWorkspaceIntake,
  readWorkspaceIntake,
  listWorkspaceIntakeRequests,
  listDirectWorkspaceIntakeRequests,
  submitWorkspaceIntake,
  workspaceIntakeOosConfigured,
  WorkspaceIntakeOosError,
} from "./workspace-intake-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listWorkspaceIntakeRequestsRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const parameters = request.nextUrl.searchParams, keys = [...parameters.keys()];
    if (new Set(keys).size !== keys.length || keys.some(key => !["target_kind", "target_name", "source_class", "custody_request_id", "cursor"].includes(key))) {
      throw new WorkspaceIntakeContractError("Retained Intake list parameters are invalid.");
    }
    if (parameters.has("source_class")) {
      const target = assertWorkspaceIntakeTarget({ kind: parameters.get("target_kind"), name: parameters.get("target_name") });
      const cursor = parameters.get("cursor");
      if (parameters.get("source_class") !== "direct" || parameters.has("custody_request_id") ||
          (target.kind !== "product" && target.kind !== "component") || (cursor !== null && !/^[0-9a-f]{64}$/.test(cursor))) {
        throw new WorkspaceIntakeContractError("Direct Intake requires one product/component selector without custody.");
      }
      return listDirectWorkspaceIntakeRequests(target.kind, target.name, cursor);
    }
    if (parameters.has("target_kind")) throw new WorkspaceIntakeContractError("Custody Intake uses the existing repository selector.");
    const target = assertWorkspaceIntakeTarget({ kind: "repo", name: parameters.get("target_name") });
    const custody = parameters.get("custody_request_id"), cursor = parameters.get("cursor");
    if (!custody || custody.length > 256 || (cursor !== null && !/^[0-9a-f]{64}$/.test(cursor))) {
      throw new WorkspaceIntakeContractError("Retained Intake requires an exact custody selector and optional cursor.");
    }
    return listWorkspaceIntakeRequests(target.name, custody, cursor);
  });
}

export async function prepareWorkspaceIntakeRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    if (Object.keys(input).some((key) => !["target", "repository_custody"].includes(key))) {
      throw new WorkspaceIntakeContractError("Workspace Intake preparation fields are invalid.");
    }
    const target = assertWorkspaceIntakeTarget(input.target);
    const custody = input.repository_custody === undefined ? undefined : assertWorkspaceIntakeCustodyPreparation(input.repository_custody);
    if (custody && target.kind !== "repo") throw new WorkspaceIntakeContractError("Custody preparation requires a repository target.");
    return prepareWorkspaceIntake(target, {}, custody);
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
