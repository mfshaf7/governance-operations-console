import { NextResponse } from "next/server";

import { projectConsoleRuntimeCapabilities } from "./console-runtime-configuration.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export function readConsoleRuntimeCapabilitiesRoute() {
  return NextResponse.json(projectConsoleRuntimeCapabilities(), {
    headers: noStoreHeaders,
  });
}
