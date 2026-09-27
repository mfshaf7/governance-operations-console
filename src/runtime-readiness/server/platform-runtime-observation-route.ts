import { NextResponse } from "next/server";

import { consoleRuntimeObservationModeSelected } from "../../console-integration/configuration/console-runtime-configuration";
import {
  disconnectedRuntimeComponentProjection,
  readRuntimeComponentProjection,
  RuntimeObservationError,
  unavailableRuntimeComponentProjection,
} from "./platform-runtime-observation-adapter";

export async function GET() {
  if (!consoleRuntimeObservationModeSelected()) {
    return NextResponse.json(disconnectedRuntimeComponentProjection(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    return NextResponse.json(await readRuntimeComponentProjection(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof RuntimeObservationError
        ? error.code
        : "console_runtime_observation_unavailable";
    return NextResponse.json(unavailableRuntimeComponentProjection(code), {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }
}
