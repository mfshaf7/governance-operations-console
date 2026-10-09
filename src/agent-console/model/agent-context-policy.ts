import type {
  AgentContextCandidate,
  AgentContextSourceMode,
} from "../../console-shell/context/agent-context-candidate";

export type AgentInteractionMode = "focused" | "general" | "workspace";

export type AgentContextDecisionCode =
  | "context-budget-exceeded"
  | "context-unavailable"
  | "cgg-required"
  | "general-detached"
  | "workspace-unavailable";

export type AgentContextDecision = {
  attached: boolean;
  budgetLimitChars: number;
  budgetUsedChars: number;
  candidateChars: number;
  candidateId: string | null;
  cggReceiptRef: null;
  code: AgentContextDecisionCode;
  mode: AgentInteractionMode;
  policyProfile: typeof agentContextPolicyProfile;
  reason: string;
  sourceMode: AgentContextSourceMode | null;
};

export type AgentContextRequest = {
  candidate: AgentContextCandidate | null;
  mode: AgentInteractionMode;
};

export type AgentContextModelProjection = Omit<
  AgentContextCandidate,
  "displayTone"
>;

export const agentContextPolicyProfile = "governed-cgg-required/v1";
export const agentContextBudgetLimitChars = 3_500;

export function projectAgentContextCandidate(
  candidate: AgentContextCandidate,
): AgentContextModelProjection {
  const { displayTone: _displayTone, ...projection } = candidate;

  return projection;
}

function decision({
  attached,
  budgetUsedChars = 0,
  candidate,
  candidateChars,
  code,
  mode,
  reason,
}: {
  attached: boolean;
  budgetUsedChars?: number;
  candidate: AgentContextCandidate | null;
  candidateChars: number;
  code: AgentContextDecisionCode;
  mode: AgentInteractionMode;
  reason: string;
}): AgentContextDecision {
  return {
    attached,
    budgetLimitChars: agentContextBudgetLimitChars,
    budgetUsedChars,
    candidateChars,
    candidateId: candidate?.id ?? null,
    cggReceiptRef: null,
    code,
    mode,
    policyProfile: agentContextPolicyProfile,
    reason,
    sourceMode: candidate?.sourceMode ?? null,
  };
}

export function evaluateAgentContextPolicy({
  candidate,
  mode,
}: AgentContextRequest): AgentContextDecision {
  const projection = candidate
    ? projectAgentContextCandidate(candidate)
    : null;
  const candidateChars = projection
    ? JSON.stringify(projection).length
    : 0;

  if (mode === "general") {
    return decision({
      attached: false,
      candidate,
      candidateChars,
      code: "general-detached",
      mode,
      reason:
        "General mode does not attach page or workspace context.",
    });
  }

  if (mode === "workspace") {
    if (!candidate || candidate.scope !== "workspace" || candidate.sourceMode === "unavailable") {
      return decision({
        attached: false,
        candidate,
        candidateChars,
        code: "workspace-unavailable",
        mode,
        reason: "Workspace mode requires a current workspace context candidate.",
      });
    }
  }

  if (!candidate || candidate.sourceMode === "unavailable") {
    return decision({
      attached: false,
      candidate,
      candidateChars,
      code: "context-unavailable",
      mode,
      reason:
        "No model-eligible focused context candidate is available.",
    });
  }

  if (candidateChars > agentContextBudgetLimitChars) {
    return decision({
      attached: false,
      candidate,
      candidateChars,
      code: "context-budget-exceeded",
      mode,
      reason: `The synthetic candidate exceeds the ${agentContextBudgetLimitChars} character prototype context budget.`,
    });
  }

  return decision({
    attached: false,
    candidate,
    candidateChars,
    code: "cgg-required",
    mode,
    reason:
      "The candidate must be admitted and redacted by CGG before governed model projection.",
  });
}

export function resolveAgentContextRequest(
  request: AgentContextRequest,
): {
  decision: AgentContextDecision;
  projection: AgentContextModelProjection | null;
} {
  const decisionResult = evaluateAgentContextPolicy(request);

  return {
    decision: decisionResult,
    projection:
      decisionResult.attached && request.candidate
        ? projectAgentContextCandidate(request.candidate)
        : null,
  };
}
