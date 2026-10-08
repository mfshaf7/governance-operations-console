import { NextRequest, NextResponse } from "next/server";

import { consoleModelOperationsModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { modelOperationsReadModel } from "../read-model/model-operations-read-model.ts";
import { projectLiveModelOperationsReadModel } from "../live-runtime/model-operations-live-projection.ts";
import { projectModelOperationsOperatingEvidence } from "../live-runtime/model-operations-operating-projection.ts";
import {
  listModelProfileRequests,
  ModelOperationsOosError,
  readModelProfileRequest,
  submitCreateModelProfileRequest,
} from "./model-operations-oos-client.ts";
import {
  ModelOperationsPlatformError,
  readPlatformModelOperationsArtifacts,
} from "./model-operations-platform-adapter.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listModelOperationsRoute() {
  if (!consoleModelOperationsModeSelected()) {
    return NextResponse.json(
      {
        error: null,
        mode: "disconnected-preview",
        observedAt: new Date().toISOString(),
        readModel: modelOperationsReadModel,
        requests: [],
        source: null,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  }
  try {
    const [artifacts, requests] = await Promise.all([
      readPlatformModelOperationsArtifacts(),
      listModelProfileRequests(),
    ]);
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        readModel: projectLiveModelOperationsReadModel(artifacts),
        requests,
        source: sourceSummary(artifacts),
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function submitModelProfileRequestRoute(request: NextRequest) {
  try {
    requireLiveMode();
    return NextResponse.json(
      await submitCreateModelProfileRequest(await request.json().catch(() => null)),
      { headers: noStoreHeaders, status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function modelOperationsOperatingProjectionRoute(requestId: string) {
  try {
    requireLiveMode();
    const [artifacts, request] = await Promise.all([
      readPlatformModelOperationsArtifacts(),
      readModelProfileRequest(requestId),
    ]);
    const projection = projectModelOperationsOperatingEvidence(request, artifacts);
    return NextResponse.json(projection, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

function sourceSummary(artifacts: Awaited<ReturnType<typeof readPlatformModelOperationsArtifacts>>) {
  const source = record(artifacts.sourceProjection.source);
  return {
    lifecycleReceiptDigest: text(artifacts.lifecycleReceipt.digest),
    mergedReadbackDigest: text(artifacts.mergedReadback.digest),
    projectionDigest: text(artifacts.sourceProjection.digest),
    sourceVersion: text(source.source_version),
  };
}

function requireLiveMode() {
  if (!consoleModelOperationsModeSelected()) {
    throw new ModelOperationsOosError(
      "Model Operations live integration is not selected.",
      "model_operations_live_mode_required",
      503,
    );
  }
}

function errorResponse(error: unknown) {
  const known =
    error instanceof ModelOperationsOosError ||
    error instanceof ModelOperationsPlatformError;
  return NextResponse.json(
    {
      code: known ? error.code : "model_operations_adapter_failed",
      error: error instanceof Error ? error.message : "Model Operations adapter failed.",
      mode: "live",
      status: "offline",
    },
    {
      headers: noStoreHeaders,
      status: known ? error.status : 502,
    },
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelOperationsPlatformError(
      "Model Operations reconciliation evidence is malformed.",
      "console_model_operations_reconciliation_invalid",
    );
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new ModelOperationsPlatformError(
      "Model Operations reconciliation evidence is malformed.",
      "console_model_operations_reconciliation_invalid",
    );
  }
  return value;
}
