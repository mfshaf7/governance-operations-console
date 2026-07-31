import type { ProposalWorkspaceScenario } from "./proposal-workspace-read-model.ts";

export type ProposalRequiredMove = Readonly<{
  buttonLabel: string;
  description: string;
  statusTitle: string;
  target: "disposition" | "handoff" | "history" | "triage";
  title: string;
  tone: "info" | "muted" | "ok" | "warn";
}>;

export function proposalRequiredMove(
  proposal: ProposalWorkspaceScenario,
): ProposalRequiredMove {
  switch (proposal.status) {
    case "captured":
      return {
        buttonLabel: "Start Triage",
        description:
          "Open triage source review before Disposition records accepted, parked, or rejected.",
        statusTitle: "Triage Required",
        target: "triage",
        title: "Start Triage",
        tone: "warn",
      };
    case "done":
      return {
        buttonLabel: "Open History",
        description:
          "Review the recorded Proposal decision and handoff evidence.",
        statusTitle: "Proposal Complete",
        target: "history",
        title: "Review Proposal History",
        tone: "ok",
      };
    case "parked":
      return {
        buttonLabel: "Revisit Decision",
        description:
          "Open Disposition to accept, reject, or keep this proposal parked with decision notes.",
        statusTitle: "Parked Proposal",
        target: "disposition",
        title: "Revisit Parked Proposal",
        tone: "warn",
      };
    case "ready-to-route":
      return {
        buttonLabel: "Open Handoff",
        description: "Record the handoff review for this route-clear proposal.",
        statusTitle: "Handoff Review",
        target: "handoff",
        title: "Review Handoff",
        tone: "warn",
      };
    case "waiting-on-repository":
      return {
        buttonLabel: "Open Handoff",
        description:
          "Review the repository gate that blocks the selected route from handoff.",
        statusTitle: "Repository Gate Blocks Handoff",
        target: "handoff",
        title: "Review Repository Gate",
        tone: "warn",
      };
    case "waiting-on-source":
      return {
        buttonLabel: "Review Source Gap",
        description:
          "Review the missing source context before triage or route decisions continue.",
        statusTitle: "Waiting On Source",
        target: "triage",
        title: "Review Source Gap",
        tone: "warn",
      };
  }
}
