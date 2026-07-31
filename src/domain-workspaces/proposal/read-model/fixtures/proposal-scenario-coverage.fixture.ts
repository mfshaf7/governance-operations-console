import type { ProposalWorkspaceScenarioCoverage } from "../../domain/proposal-types.ts";

export const proposalWorkspaceScenarioCoverage: ProposalWorkspaceScenarioCoverage[] =
  [
    {
      kind: "operator-capture-current",
      operatorState: "current",
      proves:
        "Console-created proposal starts at Triage with Disposition and Handoff locked until local receipts exist.",
      status: "captured",
    },
    {
      kind: "parked-decision-revisitable",
      operatorState: "current",
      proves:
        "Parked read-model proposal reopens Disposition so the operator can accept, reject, or keep it parked.",
      status: "parked",
    },
    {
      kind: "handoff-review-current",
      operatorState: "ready",
      proves:
        "Route-clear read-model proposal opens Handoff as the current local review step without claiming a backend mutation.",
      status: "ready-to-route",
    },
    {
      kind: "source-context-stale",
      operatorState: "stale",
      proves:
        "Missing source context keeps Disposition locked and routes the operator to source/projection repair.",
      status: "waiting-on-source",
    },
    {
      kind: "repository-gate-blocked",
      operatorState: "blocked",
      proves:
        "Repository-required proposal keeps its route target while Handoff remains blocked by the repo gate.",
      status: "waiting-on-repository",
    },
  ];
