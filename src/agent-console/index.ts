import type { ConsoleBoundary } from "../console-architecture";

export { ModelInteractionDock } from "./presentation/model-interaction-dock";
export { AgentRobotIcon } from "./presentation/agent-robot-icon";
export { AgentRuntimePresenceDialog } from "./presentation/agent-runtime-presence-dialog";
export { AgentRuntimeStatusDialog } from "./presentation/agent-runtime-status-dialog";
export {
  AgentConsoleSessionProvider,
  useAgentConsoleSession,
} from "./state/agent-console-session-provider";
export {
  AgentRuntimePresenceProvider,
  useActiveAgentRuntimes,
  useAgentRuntimePresenceRegistration,
} from "./state/agent-runtime-presence-provider";
export { useAgentProviderStatus } from "./state/use-agent-provider-status";
export {
  agentContextBudgetLimitChars,
  agentContextPolicyProfile,
  evaluateAgentContextPolicy,
  projectAgentContextCandidate,
  resolveAgentContextRequest,
} from "./model/agent-context-policy";
export type {
  AgentContextDecision,
  AgentContextDecisionCode,
  AgentContextModelProjection,
  AgentContextRequest,
  AgentInteractionMode,
} from "./model/agent-context-policy";
export {
  hasSecretLikeMaterial,
  inspectAgentInput,
  maxOperatorPromptChars,
} from "./model/agent-input-policy";
export type { AgentInputInspection } from "./model/agent-input-policy";
export {
  agentProviderSafetyMode,
  deriveAgentProviderReadinessState,
  isAgentProviderStatus,
  retainStaleAgentProviderObservation,
} from "./model/agent-provider-status";
export type {
  AgentProviderReadinessState,
  AgentProviderStatus,
} from "./model/agent-provider-status";
export {
  agentRequestTimeoutMs,
  createAgentInvocation,
  createAgentRequestAbortReason,
  isAgentRequestAbortReason,
  settleAgentInvocation,
} from "./model/agent-console-session";
export type {
  AgentConversationTurn,
  AgentInvocation,
  AgentInvocationFailureCode,
  AgentInvocationState,
  AgentRequestAbortCode,
  AgentRequestAbortReason,
  AgentTerminalEntry,
} from "./model/agent-console-session";
export {
  agentRuntimeGovernanceLabel,
  agentRuntimeHeartbeatWindowMs,
  agentRuntimeStateLabel,
  deriveAgentRuntimeActivityState,
  selectActiveAgentRuntimes,
} from "./model/agent-runtime-presence";
export type {
  AgentRuntimeActivityState,
  AgentRuntimeGovernancePosture,
  AgentRuntimeIdentity,
  AgentRuntimeObservation,
  AgentRuntimePresence,
} from "./model/agent-runtime-presence";

export const agentConsoleBoundary: ConsoleBoundary = {
  id: "agent-console",
  mustNotOwn: [
    "governed model profile lifecycle",
    "governed model profile approval",
    "workflow mutation",
    "raw operational context access",
  ],
  owns: [
    "manual operator prompt state",
    "browser session identity bound to OOS-owned Agent Console sessions",
    "structured governed invocation state and receipt display",
    "visible context candidate and CGG admission-boundary display",
    "same-origin OOS Agent Console adapter",
    "freshness-aware governed runtime-path health projection",
    "distinct embedded and docking runtime projections",
    "active runtime presence and heartbeat projection",
    "model profile reference display",
    "receipt-bound read-only guidance",
  ],
  status: "active-contract",
};

export const agentConsoleSafetyMode =
  "manual-only through OOS sessions, CGG model-safe projection, and the governed AI profile";
