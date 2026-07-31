import type { ProposalWorkspaceSummaryMetric } from "../../domain/proposal-types.ts";

export const proposalWorkspaceSummary: ProposalWorkspaceSummaryMetric[] = [
  { id: "total", label: "Total", tone: "info", value: "6" },
  { id: "review", label: "Review", tone: "warn", value: "3" },
  { id: "waiting", label: "Waiting", tone: "warn", value: "2" },
  { id: "parked", label: "Parked", tone: "muted", value: "1" },
  { id: "done", label: "Done", tone: "ok", value: "0" },
];
