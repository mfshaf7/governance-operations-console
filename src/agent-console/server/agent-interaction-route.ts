import { NextRequest, NextResponse } from "next/server";
import { agentProviderSafetyMode } from "../model/agent-provider-status";
import { createAgentResponseStream } from "./agent-response-stream";
import { validateAgentRequest } from "./agent-request-policy";
import {
  fetchOllamaChatStream,
  resolveOllama,
} from "./ollama-adapter";

export async function GET() {
  try {
    const resolved = await resolveOllama();
    const observedAt = new Date().toISOString();

    return NextResponse.json(
      {
        checkedAt: observedAt,
        endpoint: resolved.baseUrl,
        freshness: "live",
        model: resolved.selectedModel,
        modelCount: resolved.models.length,
        observedAt,
        provider: "ollama",
        safetyMode: agentProviderSafetyMode,
        status: "online",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const observedAt = new Date().toISOString();

    return NextResponse.json(
      {
        checkedAt: observedAt,
        endpoint: null,
        error: error instanceof Error ? error.message : String(error),
        freshness: "live",
        model: null,
        modelCount: 0,
        observedAt,
        provider: "ollama",
        safetyMode: agentProviderSafetyMode,
        status: "offline",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 200,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validation = validateAgentRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const resolved = await resolveOllama(request.signal);
    const ollamaStream = await fetchOllamaChatStream(
      resolved.baseUrl,
      resolved.selectedModel,
      validation.messages,
      request.signal,
    );

    return new Response(
      createAgentResponseStream(ollamaStream),
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Agent-Context-Attached": String(
            validation.contextDecision.attached,
          ),
          "X-Agent-Context-Budget": `${validation.contextDecision.budgetUsedChars}/${validation.contextDecision.budgetLimitChars}`,
          "X-Agent-Context-Candidate":
            validation.contextDecision.candidateId ?? "none",
          "X-Agent-Context-Decision": validation.contextDecision.code,
          "X-Agent-Context-Policy":
            validation.contextDecision.policyProfile,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Agent-Model": resolved.selectedModel,
          "X-Agent-Provider": "ollama",
          "X-Agent-Safety-Mode": agentProviderSafetyMode,
          "X-Ollama-Endpoint": resolved.baseUrl,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        status: "failed",
      },
      { status: 502 },
    );
  }
}
