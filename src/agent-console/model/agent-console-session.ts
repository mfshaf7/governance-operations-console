import type {
  AgentContextDecision,
  AgentInteractionMode,
} from "./agent-context-policy";

export type { AgentInteractionMode } from "./agent-context-policy";

export type AgentInvocationState =
  | "cancelled"
  | "completed"
  | "failed"
  | "running";

export type AgentInvocationFailureCode =
  | "empty-response"
  | "provider-request-failed"
  | "request-timeout"
  | "stream-interrupted";

export type AgentInvocation = {
  completedAt: string | null;
  contextAttached: boolean;
  contextBudgetUsedChars: number;
  contextCandidateId: string | null;
  contextDecision: AgentContextDecision["code"];
  contextPolicyProfile: AgentContextDecision["policyProfile"];
  contextSourceMode: AgentContextDecision["sourceMode"];
  cggReceiptRef: null;
  error: string | null;
  failureCode: AgentInvocationFailureCode | null;
  id: string;
  interactionMode: AgentInteractionMode;
  model: string | null;
  provider: string;
  startedAt: string;
  state: AgentInvocationState;
};

export type AgentInvocationSettlement =
  | {
      state: "cancelled" | "completed";
    }
  | {
      error: string;
      failureCode: AgentInvocationFailureCode;
      state: "failed";
    };

export type AgentRequestAbortCode =
  | "operator-cancelled"
  | "request-timeout"
  | "session-ended";

export type AgentRequestAbortReason = {
  code: AgentRequestAbortCode;
  message: string;
  source: "agent-console";
};

export type AgentTerminalEntry = {
  id: string;
  kind: "agent" | "error" | "operator" | "system";
  model?: string | null;
  text: string;
};

export type AgentConversationTurn = {
  content: string;
  role: "assistant" | "user";
};

export const agentRequestTimeoutMs = 180_000;

const agentRequestAbortMessage: Record<AgentRequestAbortCode, string> = {
  "operator-cancelled": "Operator cancelled the request.",
  "request-timeout": "Agent request exceeded the browser time limit.",
  "session-ended": "Agent Console session ended.",
};

export function createAgentRequestAbortReason(
  code: AgentRequestAbortCode,
): AgentRequestAbortReason {
  return {
    code,
    message: agentRequestAbortMessage[code],
    source: "agent-console",
  };
}

export function isAgentRequestAbortReason(
  value: unknown,
): value is AgentRequestAbortReason {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.code === "operator-cancelled" ||
      candidate.code === "request-timeout" ||
      candidate.code === "session-ended") &&
    typeof candidate.message === "string" &&
    candidate.source === "agent-console"
  );
}

export function settleAgentInvocation(
  invocation: AgentInvocation,
  settlement: AgentInvocationSettlement,
  completedAt = new Date().toISOString(),
): AgentInvocation {
  if (settlement.state === "failed") {
    return {
      ...invocation,
      completedAt,
      error: settlement.error,
      failureCode: settlement.failureCode,
      state: "failed",
    };
  }

  return {
    ...invocation,
    completedAt,
    error: null,
    failureCode: null,
    state: settlement.state,
  };
}

export function createAgentInvocation({
  contextDecision,
  model,
  provider,
}: {
  contextDecision: AgentContextDecision;
  model: string | null;
  provider: string;
}): AgentInvocation {
  return {
    completedAt: null,
    contextAttached: contextDecision.attached,
    contextBudgetUsedChars: contextDecision.budgetUsedChars,
    contextCandidateId: contextDecision.candidateId,
    contextDecision: contextDecision.code,
    contextPolicyProfile: contextDecision.policyProfile,
    contextSourceMode: contextDecision.sourceMode,
    cggReceiptRef: null,
    error: null,
    failureCode: null,
    id: `agent-invocation-${crypto.randomUUID()}`,
    interactionMode: contextDecision.mode,
    model,
    provider,
    startedAt: new Date().toISOString(),
    state: "running",
  };
}
