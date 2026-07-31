import type { ProposalHubProjection } from "./proposal-hub-types.ts";

export function proposalHubHistory(): ProposalHubProjection["history"] {
  return {
    actionDisabled: false,
    actionLabel: "View History",
    description:
      "Open the read-only proposal history. History never advances the workflow.",
    title: "Proposal History",
    tone: "muted",
  };
}
