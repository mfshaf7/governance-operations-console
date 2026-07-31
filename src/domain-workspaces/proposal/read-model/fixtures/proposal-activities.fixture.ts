import type { ProposalWorkspaceActivityItem } from "../../domain/proposal-types.ts";

export const proposalWorkspaceActivities: ProposalWorkspaceActivityItem[] = [
  {
    detail: "The proposal source admitted a packet and queued it for triage.",
    label: "External ingress received",
    tone: "info",
    when: "09:42",
  },
  {
    detail:
      "Repository gate needs an owner repo before Delivery handoff can proceed.",
    label: "Repository requirement detected",
    tone: "warn",
    when: "09:18",
  },
  {
    detail:
      "Accepted proposal selected Prototype Studio for exploration handoff.",
    label: "Prototype route selected",
    tone: "ok",
    when: "08:56",
  },
];
