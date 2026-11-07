import { NextResponse } from "next/server";

import {
  lifecycleTransitionOosConfigured,
  listLifecycleTransitionOwnerProjections,
  normalizeLifecycleTransitionOosError,
  LifecycleTransitionOosError,
} from "./lifecycle-transition-oos-client.ts";

import {readLifecycleTransitionJournal} from "./lifecycle-transition-register-query.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listLifecycleTransitionsRoute(request: Request) {
  if (!lifecycleTransitionOosConfigured()) {
    return NextResponse.json(
      {
        error: null,
        mode: "disconnected-preview",
        observedAt: new Date().toISOString(),
        status: "current",
        transitions: [],
        truncated: false,
      },
      { headers: noStoreHeaders },
    );
  }

  try {
    const query=request?new URL(request.url).searchParams:null;
    if(query?.get("view")==="journal")return NextResponse.json(await readLifecycleTransitionJournal(query,{},request?.signal),{headers:noStoreHeaders});
    const result = await listLifecycleTransitionOwnerProjections();
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: result.observedAt,
        status: "current",
        transitions: result.transitions,
        truncated: result.truncated,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const normalized = normalizeLifecycleTransitionOosError(error);
    const status = normalized instanceof LifecycleTransitionOosError
      ? normalized.status
      : 502;
    const code = "code" in normalized
      ? normalized.code
      : "lifecycle_transition_adapter_failed";
    return NextResponse.json(
      {
        code,
        error: normalized.message,
        mode: "live",
        status: "offline",
      },
      { headers: noStoreHeaders, status },
    );
  }
}
