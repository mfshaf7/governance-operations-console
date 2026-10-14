import { NextResponse } from "next/server";

import {
  readWorkspaceContinuity,
  workspaceContinuityWgcfConfigured,
  WorkspaceContinuityWgcfError,
} from "./workspace-continuity-wgcf-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readWorkspaceContinuityRoute() {
  try {
    if (!workspaceContinuityWgcfConfigured()) {
      throw new WorkspaceContinuityWgcfError(
        "Workspace continuity is unavailable until its approved WGCF integration is active.",
        "workspace_continuity_live_mode_required",
        503,
      );
    }
    return NextResponse.json(await readWorkspaceContinuity(), {
      headers: noStoreHeaders,
      status: 200,
    });
  } catch (error) {
    const known = error instanceof WorkspaceContinuityWgcfError;
    return NextResponse.json(
      {
        code: known ? error.code : "workspace_continuity_adapter_failed",
        error: error instanceof Error
          ? error.message
          : "Workspace continuity adapter failed.",
        retryable: known && error.retryable,
      },
      {
        headers: noStoreHeaders,
        status: known ? error.status : 502,
      },
    );
  }
}
