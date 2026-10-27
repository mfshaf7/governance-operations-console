import { NextRequest, NextResponse } from "next/server";

import { effectiveModelLabel } from "../../console-integration/governed-ai/model-selection.ts";
import { hasSecretLikeMaterial } from "../model/agent-input-policy.ts";
import { assertAdvisorScope, parseAdvisorReply } from "../model/advisor-drafts.ts";
import { AgentConsoleOosError, invokeGovernedAgent } from "./agent-console-oos-client.ts";
import { buildAdvisorAgentRequest } from "./advisor-draft-request.ts";

const noStore = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function boundedBody(request: Request) {
  if (!request.body) throw Error("An advisor request is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 256_000) { await reader.cancel(); throw Error("Advisor request exceeds its bounded size."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw Error("Advisor request must be valid UTF-8 JSON."); }
}

export async function requestAdvisorDraftRoute(request: NextRequest) {
    try {
      const body = await boundedBody(request);
      if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some((key) => !["scope", "prompt", "session", "invocationNonce", "conversation"].includes(key))) {
        throw Error("Malformed advisor request.");
      }
      const scope = assertAdvisorScope(body.scope);
      if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 2000) throw Error("A manual chat request of at most 2000 characters is required.");
      if (!body.session || !uuid.test(body.session.nonce) || !Number.isFinite(Date.parse(body.session.openedAt)) || !uuid.test(body.invocationNonce)) {
        throw Error("Advisor session binding is invalid.");
      }
      const conversation = body.conversation ?? [];
      if (!Array.isArray(conversation) || conversation.length > 8 || conversation.some((turn) =>
        !turn || typeof turn !== "object" || Object.keys(turn).some((key) => !["role", "text"].includes(key)) ||
        !["operator", "advisor"].includes(turn.role) || typeof turn.text !== "string" || turn.text.length > 2000)) {
        throw Error("Advisor conversation exceeds its bounded context.");
      }
      if (hasSecretLikeMaterial(JSON.stringify({ scope, prompt: body.prompt, conversation }))) {
        throw Error("Secret-like material cannot enter advisor context. Remove it from the selected draft.");
      }
      if (["work-design-context", "work-design-tree", "refinement-metadata"].includes(scope.role)) {
        throw Error("Use this workflow's existing governed advisor path so its configured model route is preserved.");
      }
      const input = buildAdvisorAgentRequest(scope, body.prompt, body.session, body.invocationNonce);
      const result = await invokeGovernedAgent(input, { signal: request.signal, draftContext: { scope, conversation } });
      const reply = parseAdvisorReply(result.text, scope);
      return NextResponse.json({ ...reply, evidence: {
        profileId: result.modelProfileId, auditRef: result.auditRef, contextRef: result.projectionReceiptRef,
        receiptRef: result.receiptRef, invocationId: result.invocationId,
        ...(result.effectiveSelection ? { effectiveModel: effectiveModelLabel(result.effectiveSelection) } : {}),
      } }, { headers: noStore });
    } catch (error) {
      const status = error instanceof AgentConsoleOosError ? error.status :
        (error && typeof error === "object" && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 600 ? error.status : 422);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Governed advisor unavailable.", status: "failed" }, { status, headers: noStore });
    }
}
