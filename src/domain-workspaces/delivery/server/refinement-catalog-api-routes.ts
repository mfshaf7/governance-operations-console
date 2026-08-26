import { NextRequest, NextResponse } from "next/server";

import { assertCatalogMutationRequest } from "../live-runtime/catalog-live-contract.ts";
import { deliveryLiveIdentity } from "../live-runtime/delivery-live-identity.ts";
import {
  assertRefinementApplyCommand,
  assertRefinementAssistCommand,
} from "../live-runtime/refinement-live-contract.ts";
import {
  DeliveryOosError,
  deliveryOosConfigured,
} from "./delivery-oos-client.ts";
import {
  applyRefinementDraft,
  mutateCatalogValue,
  readCatalogProjection,
  readRefinementProjection,
  readRefinementRun,
  requestRefinementAdvice,
} from "./refinement-catalog-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readRefinementProjectionRoute(packageRef: string) {
  try {
    deliveryLiveIdentity(packageRef);
    if (!deliveryOosConfigured()) return previewSnapshot();
    const projection = await readRefinementProjection(packageRef);
    return currentSnapshot(projection);
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "refinement_adapter_failed");
  }
}

export async function requestRefinementAdviceRoute(
  request: NextRequest,
  packageRef: string,
) {
  try {
    deliveryLiveIdentity(packageRef);
    const command = assertRefinementAssistCommand(
      await request.json().catch(() => null),
    );
    const projection = await readRefinementProjection(packageRef);
    const result = await requestRefinementAdvice(packageRef, projection, command);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "refinement_adapter_request_invalid");
  }
}

export async function applyRefinementRoute(
  request: NextRequest,
  packageRef: string,
) {
  try {
    deliveryLiveIdentity(packageRef);
    const command = assertRefinementApplyCommand(
      await request.json().catch(() => null),
    );
    const projection = await readRefinementProjection(packageRef);
    const run = await applyRefinementDraft(packageRef, projection, command);
    return NextResponse.json(run, { headers: noStoreHeaders, status: 202 });
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "refinement_adapter_request_invalid");
  }
}

export async function readRefinementRunRoute(
  packageRef: string,
  runId: string,
) {
  try {
    deliveryLiveIdentity(packageRef);
    const run = await readRefinementRun(packageRef, requiredText(runId, "run identity"));
    return NextResponse.json(run, { headers: noStoreHeaders });
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "refinement_adapter_request_invalid");
  }
}

export async function readCatalogProjectionRoute() {
  try {
    if (!deliveryOosConfigured()) return previewSnapshot();
    return currentSnapshot(await readCatalogProjection());
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "catalog_adapter_failed");
  }
}

export async function mutateCatalogRoute(
  request: NextRequest,
  catalogItemId: string,
) {
  try {
    const command = assertCatalogMutationRequest(
      await request.json().catch(() => null),
    );
    const projection = await readCatalogProjection();
    const result = await mutateCatalogValue(
      requiredText(catalogItemId, "Catalog item identity"),
      projection,
      command,
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return deliveryAdapterErrorResponse(error, "catalog_adapter_request_invalid");
  }
}

function currentSnapshot(projection: unknown) {
  return NextResponse.json(
    {
      error: null,
      mode: "live",
      observedAt: new Date().toISOString(),
      projection,
      status: "current",
    },
    { headers: noStoreHeaders },
  );
}

function previewSnapshot() {
  return NextResponse.json(
    {
      error: null,
      mode: "disconnected-preview",
      observedAt: new Date().toISOString(),
      projection: null,
      status: "current",
    },
    { headers: noStoreHeaders },
  );
}

function deliveryAdapterErrorResponse(error: unknown, fallbackCode: string) {
  const status = error instanceof DeliveryOosError ? error.status : 400;
  const code = error instanceof DeliveryOosError ? error.code : fallbackCode;
  const message = error instanceof Error ? error.message : "Delivery adapter failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}

function invalid(message: string): never { throw new DeliveryOosError(message, "delivery_adapter_request_invalid", 400); }
function requiredText(value: unknown, label: string) { const result = text(value, label); if (!result.trim()) invalid(`${label} is required.`); return result; }
function text(value: unknown, label: string) { if (typeof value !== "string") invalid(`${label} is invalid.`); return value as string; }
