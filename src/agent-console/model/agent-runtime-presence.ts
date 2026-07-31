export type AgentRuntimeActivityState =
  | "failed"
  | "idle"
  | "waiting"
  | "working";

export type AgentRuntimeGovernancePosture =
  | "governed"
  | "prototype-local"
  | "unresolved";

export type AgentRuntimePresence = {
  callerId: string;
  currentOperation: string | null;
  displayName: string;
  governancePosture: AgentRuntimeGovernancePosture;
  interactionMode: string;
  invocationRef: string | null;
  lastActivityAt: string;
  lastHeartbeatAt: string;
  model: string | null;
  modelProfileRef: string | null;
  modelProfileVersion: string | null;
  operationRunRef: string | null;
  ownerSurface: string;
  provider: string;
  runtimeId: string;
  sourceAuthority: string;
  sourceRef: string;
  startedAt: string;
  state: AgentRuntimeActivityState;
};

export type AgentRuntimeIdentity = Pick<
  AgentRuntimePresence,
  | "callerId"
  | "displayName"
  | "ownerSurface"
  | "runtimeId"
  | "sourceAuthority"
  | "sourceRef"
>;

export type AgentRuntimeObservation = Pick<
  AgentRuntimePresence,
  | "currentOperation"
  | "governancePosture"
  | "interactionMode"
  | "invocationRef"
  | "model"
  | "modelProfileRef"
  | "modelProfileVersion"
  | "operationRunRef"
  | "provider"
  | "runtimeId"
  | "state"
>;

export const agentRuntimeHeartbeatWindowMs = 15_000;

export function deriveAgentRuntimeActivityState({
  invocationState,
  providerStatus,
}: {
  invocationState: "cancelled" | "completed" | "failed" | "running" | null;
  providerStatus: "offline" | "online" | "probing";
}): AgentRuntimeActivityState {
  if (invocationState === "running") {
    return "working";
  }

  if (providerStatus === "probing") {
    return "waiting";
  }

  return providerStatus === "online" ? "idle" : "failed";
}

const runtimeStatePriority: Record<AgentRuntimeActivityState, number> = {
  working: 0,
  failed: 1,
  waiting: 2,
  idle: 3,
};

export const agentRuntimeStateLabel: Record<
  AgentRuntimeActivityState,
  string
> = {
  failed: "Failed",
  idle: "Idle",
  waiting: "Waiting",
  working: "Working",
};

export const agentRuntimeGovernanceLabel: Record<
  AgentRuntimeGovernancePosture,
  string
> = {
  governed: "Governed profile",
  "prototype-local": "Prototype-local only",
  unresolved: "Profile unresolved",
};

export function selectActiveAgentRuntimes(
  runtimes: AgentRuntimePresence[],
  observedAt = Date.now(),
) {
  return runtimes
    .filter((runtime) => {
      const heartbeatAt = Date.parse(runtime.lastHeartbeatAt);

      return (
        Number.isFinite(heartbeatAt) &&
        observedAt - heartbeatAt <= agentRuntimeHeartbeatWindowMs
      );
    })
    .sort(
      (left, right) =>
        runtimeStatePriority[left.state] - runtimeStatePriority[right.state] ||
        left.displayName.localeCompare(right.displayName),
    );
}
