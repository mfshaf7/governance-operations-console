import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";

export function proposalRecordFromCaptureCommand({
  bodyPreview,
  id,
  recordedAt,
  title,
}: {
  bodyPreview: string;
  id: string;
  recordedAt: string;
  title: string;
}): ProposalWorkspaceScenario {
  return {
    backendRecordId: `proposal://local/${id}`,
    bodyPreview,
    evidence: [
      {
        detail:
          "Operator entered this proposal through the console capture path.",
        id: "console-capture",
        label: "Console capture",
        observedAt: recordedAt,
        owner: "Workspace Proposals",
        source: {
          kind: "operator",
          label: "Console capture",
          ref: `proposal://local/${id}`,
        },
        state: "informational",
      },
      {
        detail:
          "Canonical create/update is not wired yet; this capture stays local until a backend proposal id is returned.",
        id: "backend-record",
        label: "Prototype-local",
        observedAt: recordedAt,
        owner: "Workspace Proposals",
        requiredAction:
          "Submit through the canonical backend when live wiring is enabled.",
        source: {
          kind: "system",
          label: "Proposal local runtime",
        },
        state: "review",
      },
    ],
    handoffRule:
      "Triage is required before this proposal can be accepted, parked, rejected, or routed.",
    id,
    ingress: "console",
    lastEvent: "Console capture submitted locally",
    lastProjectionUpdate: recordedAt,
    owner: "Workspace Proposals",
    projectionState: "syncing",
    recordVersion: "local-capture",
    recordedAt,
    repoGate: {
      detail: "Repository requirement is not evaluated until triage.",
      mode: "not-required",
      owner: null,
      ref: null,
      state: "not-required",
    },
    routeTarget: "Workspace Proposals",
    scenarioKind: "operator-capture-current",
    status: "captured",
    title,
    tone: "info",
  };
}
