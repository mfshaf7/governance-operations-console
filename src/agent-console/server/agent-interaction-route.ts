import { NextRequest, NextResponse } from "next/server";

import { authorizeConsoleMutation } from "../../console-integration/identity/server/console-session-authorization.ts";

import {
  AgentConsoleOosError,
  closeGovernedAgentSession,
  governedAgentProfileId,
  governedAgentProvider,
  governedAgentSafetyMode,
  invokeGovernedAgent,
  probeGovernedAgentPath,
} from "./agent-console-oos-client.ts";
import {
  validateAgentRequest,
  validateAgentSessionCloseRequest,
} from "./agent-request-policy.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await probeGovernedAgentPath();
    return NextResponse.json({
      checkedAt,
      endpoint: null,
      freshness: "live",
      model: governedAgentProfileId,
      modelCount: 1,
      observedAt: checkedAt,
      provider: governedAgentProvider,
      safetyMode: governedAgentSafetyMode,
      status: "online",
    }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({
      checkedAt,
      endpoint: null,
      error: error instanceof Error ? error.message : "Governed Agent Console path is unavailable.",
      freshness: "live",
      model: governedAgentProfileId,
      modelCount: 0,
      observedAt: checkedAt,
      provider: governedAgentProvider,
      safetyMode: governedAgentSafetyMode,
      status: "offline",
    }, { headers: noStoreHeaders });
  }
}

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => submitGovernedAgentRequest(request));
}

async function submitGovernedAgentRequest(request: NextRequest) {
  const validation = validateAgentRequest(await request.json().catch(() => null));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { headers: noStoreHeaders, status: validation.status });
  }
  try {
    const result = await invokeGovernedAgent(validation, { signal: request.signal });
    return new Response(result.text, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Agent-Audit-Ref": result.auditRef,
        "X-Agent-CGG-Receipt": result.projectionReceiptRef,
        "X-Agent-Context-Admitted": "true",
        "X-Agent-Context-Artifact": result.contextArtifactDigest,
        "X-Agent-Invocation": result.invocationId,
        "X-Agent-Model": result.modelProfileId,
        "X-Agent-Provider": governedAgentProvider,
        "X-Agent-Receipt": result.receiptRef,
        "X-Agent-Receipt-Digest": result.receiptDigest,
        "X-Agent-Safety-Mode": governedAgentSafetyMode,
        "X-Agent-Session": result.sessionId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  return authorizeConsoleMutation(request, () => closeGovernedAgentRequest(request));
}

async function closeGovernedAgentRequest(request: NextRequest) {
  const validation = validateAgentSessionCloseRequest(await request.json().catch(() => null));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { headers: noStoreHeaders, status: validation.status });
  }
  try {
    return NextResponse.json(await closeGovernedAgentSession({
      mode: validation.mode,
      session: validation.session,
    }), { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const known = error instanceof AgentConsoleOosError;
  return NextResponse.json({
    code: known ? error.code : "agent_console_adapter_failed",
    error: error instanceof Error ? error.message : "Agent Console adapter failed.",
    retryable: known ? error.retryable : false,
    status: "failed",
  }, {
    headers: noStoreHeaders,
    status: known ? error.status : 502,
  });
}
