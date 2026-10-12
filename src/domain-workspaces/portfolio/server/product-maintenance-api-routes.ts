import { NextResponse } from "next/server";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleProductMaintenanceConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { ProductHealthPlatformError } from "./product-health-platform-adapter.ts";
import {
  ProductMaintenanceError,
  productMaintenanceConfigured,
  readProductMaintenanceComposition,
} from "./product-maintenance-service.ts";
import { ProductPublicationOosError } from "./product-publication-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function productMaintenanceModeRoute() {
  if (!productMaintenanceConfigured()) {
    return NextResponse.json(
      { health: null, mode: "disconnected-preview", reason_code: "console_product_maintenance_not_selected" },
      { headers: noStoreHeaders },
    );
  }
  try {
    resolveConsoleProductMaintenanceConfiguration();
    return NextResponse.json({ health: null, mode: "live", reason_code: null }, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function readProductMaintenanceRoute(requestId: string) {
  try {
    return NextResponse.json(await readProductMaintenanceComposition(requestId), { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const status =
    error instanceof ProductMaintenanceError || error instanceof ProductPublicationOosError
      ? error.status
      : error instanceof ProductHealthPlatformError || error instanceof ConsoleRuntimeConfigurationError
        ? 503
        : 502;
  const code =
    error instanceof ProductMaintenanceError ||
    error instanceof ProductPublicationOosError ||
    error instanceof ProductHealthPlatformError ||
    error instanceof ConsoleRuntimeConfigurationError
      ? error.code
      : "product_maintenance_adapter_failed";
  return NextResponse.json(
    {
      code,
      error: error instanceof Error ? error.message : "Product Maintenance adapter failed.",
      mode: "live",
      retryable:
        error instanceof ProductMaintenanceError || error instanceof ProductPublicationOosError
          ? error.retryable
          : false,
    },
    { headers: noStoreHeaders, status },
  );
}
