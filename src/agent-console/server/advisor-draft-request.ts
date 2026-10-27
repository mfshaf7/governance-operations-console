import { createHash } from "node:crypto";
import type { AdvisorScope } from "../model/advisor-drafts.ts";
import { validateAgentRequest, type GovernedAgentRequest } from "./agent-request-policy.ts";

/** Build the ordinary governed request envelope; the full draft is CGG content. */
export function buildAdvisorAgentRequest(scope: AdvisorScope, prompt: string, session: GovernedAgentRequest["session"], invocationNonce: string): GovernedAgentRequest {
  const now = new Date().toISOString();
  const id = createHash("sha256").update(scope.role + scope.ref).digest("hex").slice(0, 24);
  const candidate = {
    schemaVersion: 1, id: `advisor-${id}`, scope: "page", sourceAuthority: "governance-operations-console",
    sourceMode: "source-projected", surfaceKind: "operator-draft", title: `${scope.role} draft`,
    summary: "Selected operator-authored draft. It is not canonical workflow or decision authority.",
    status: "draft", boundary: "Local draft suggestions only. Final workflow decisions remain separate operator actions.",
    freshness: "Captured for this manual request", observedAt: now, projectedAt: now,
    refs: [`console://advisor/${id}`], safeActions: ["Answer the operator", "Propose requested local draft edits"],
    signals: ["Complete selected draft is separately admitted through CGG; this overview is not the draft payload."],
  };
  const result = validateAgentRequest({ context: { candidate, mode: "focused" }, invocationNonce, message: prompt, session });
  if (!result.ok) throw Error(result.error);
  return result;
}
