import type { ConsoleAttentionSourceRegistration } from "./attention-contract";

export const consoleAttentionSourceRegistrations = {
  activity: excluded(
    "governance-activity",
    "Governance Activity",
    "Activity is chronology, not a required-move source.",
  ),
  agentConsole: excluded(
    "agent-console",
    "Agent Console",
    "Agent surfaces provide assistance and do not own business attention.",
  ),
  contextGateway: excluded(
    "context-governance-gateway",
    "Context Governance Gateway",
    "Context admission is not an operator work source.",
  ),
  delivery: admitted(
    "delivery",
    "Delivery",
    "Delivery projects actionable intake, design, refinement, execution, and closeout moves.",
  ),
  devIntegration: admitted(
    "dev-integration",
    "Dev Integration",
    "Dev Integration projects profile admission, recovery, and handoff moves.",
  ),
  governedReleases: admitted(
    "governed-releases",
    "Governed Releases",
    "Governed Releases projects the current product release move.",
  ),
  lifecycleTransitions: admitted(
    "lifecycle-transitions",
    "Lifecycle Transitions",
    "Lifecycle Transitions projects the next owner action for correlated transitions.",
  ),
  modelOperations: reserved(
    "model-operations",
    "Model Operations",
    "Reserved until Model Operations exposes a routed operator move.",
  ),
  orchestration: admitted(
    "orchestration",
    "Orchestration",
    "Orchestration projects definition and run actions that require an operator.",
  ),
  portfolio: admitted(
    "portfolio",
    "Portfolio",
    "Portfolio projects publication, admission, listing, and evidence repair moves.",
  ),
  proposal: admitted(
    "proposal",
    "Proposal",
    "Proposal projects triage, source review, disposition, and handoff moves.",
  ),
  prototype: admitted(
    "prototype",
    "Prototype",
    "Prototype projects the current lifecycle move for active prototype records.",
  ),
  repository: admitted(
    "repository",
    "Repository",
    "Repository projects proposal-gate resolution, admission review, and blocker recovery.",
  ),
  runtimeReadiness: reserved(
    "runtime-readiness",
    "Runtime Readiness",
    "Reserved until runtime alerts expose typed owner routes and required moves.",
  ),
  wgcf: reserved(
    "workspace-governance-control-fabric",
    "Workspace Governance Control Fabric",
    "Reserved until stable escalation and decision-listing reads exist.",
  ),
  workspacePulse: excluded(
    "workspace-pulse",
    "Workspace Pulse",
    "Workspace Pulse is aggregate posture and must not duplicate actionable owner records.",
  ),
} as const satisfies Record<string, ConsoleAttentionSourceRegistration>;

export const consoleAttentionSourceRegistry = Object.values(
  consoleAttentionSourceRegistrations,
);

function admitted(
  id: string,
  label: string,
  reason: string,
): ConsoleAttentionSourceRegistration {
  return { disposition: "admitted", id, label, reason };
}

function excluded(
  id: string,
  label: string,
  reason: string,
): ConsoleAttentionSourceRegistration {
  return { disposition: "excluded", id, label, reason };
}

function reserved(
  id: string,
  label: string,
  reason: string,
): ConsoleAttentionSourceRegistration {
  return { disposition: "reserved", id, label, reason };
}
