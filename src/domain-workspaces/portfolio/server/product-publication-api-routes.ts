import { NextRequest, NextResponse } from "next/server";

import { resolveConsoleProductPublicationConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import {
  productPublicationOosConfigured,
  ProductPublicationOosError,
  readGovernedProductPublication,
  submitGovernedProductPublication,
} from "./product-publication-oos-client.ts";
import { ProductPublicationLiveContractError } from "../live-runtime/product-publication-live-contract.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function productPublicationModeRoute() {
  if (!productPublicationOosConfigured()) {
    return NextResponse.json(
      {
        mode: "disconnected-preview",
        reason_code: "console_product_publication_not_selected",
      },
      { headers: noStoreHeaders },
    );
  }
  try {
    resolveConsoleProductPublicationConfiguration();
    return NextResponse.json(
      { mode: "live", reason_code: null },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return productPublicationErrorResponse(error);
  }
}

export async function submitProductPublicationRoute(request: NextRequest) {
  try {
    const result = await submitGovernedProductPublication(
      await request.json().catch(() => null),
    );
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.resolution === "created" ? 201 : 200,
    });
  } catch (error) {
    return productPublicationErrorResponse(error);
  }
}

export async function readProductPublicationRoute(requestId: string) {
  try {
    return NextResponse.json(await readGovernedProductPublication(requestId), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return productPublicationErrorResponse(error);
  }
}

function productPublicationErrorResponse(error: unknown) {
  const known =
    error instanceof ProductPublicationOosError ||
    error instanceof ProductPublicationLiveContractError;
  return NextResponse.json(
    {
      code: known
        ? error instanceof ProductPublicationOosError
          ? error.code
          : error.code
        : "product_publication_adapter_failed",
      error:
        error instanceof Error
          ? error.message
          : "Product Publication adapter failed.",
      mode: "live",
      retryable:
        error instanceof ProductPublicationOosError && error.retryable,
    },
    {
      headers: noStoreHeaders,
      status: error instanceof ProductPublicationOosError ? error.status : known ? 400 : 502,
    },
  );
}
