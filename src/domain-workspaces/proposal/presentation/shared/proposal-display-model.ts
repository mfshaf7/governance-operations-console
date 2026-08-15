import type { TerasMetadataItem } from "@/teras";
import type {
  ProposalIngressKind,
  ProposalWorkspaceScenario,
  ProposalWorkspaceScenarioStatus,
  ProposalWorkspaceSummaryMetric,
} from "../../read-model/proposal-workspace-read-model.ts";

export type ProposalIngressFilter = ProposalIngressKind | "all";
export type ProposalStatusFilter = ProposalWorkspaceScenarioStatus | "all";

export function proposalIngressLabel(ingress: ProposalIngressKind) {
  switch (ingress) {
    case "agent":
      return "Agent-fed";
    case "api":
      return "API-fed";
    case "console":
      return "Console-created";
    case "system":
      return "System-fed";
  }
}

export function proposalStatusPillLabel(proposal: ProposalWorkspaceScenario) {
  switch (proposal.status) {
    case "captured":
      return "Captured";
    case "done":
      return "Done";
    case "parked":
      return "Parked";
    case "triaged":
      return "Triaged";
    case "ready-to-route":
      return "Review";
    case "waiting-on-repository":
      return "Repo Needed";
    case "waiting-on-source":
      return "Needs Source";
  }
}

export function proposalScenarioStatusLabel(
  status: ProposalWorkspaceScenarioStatus,
) {
  switch (status) {
    case "captured":
      return "Captured";
    case "done":
      return "Done";
    case "parked":
      return "Parked";
    case "triaged":
      return "Triaged";
    case "ready-to-route":
      return "Handoff review";
    case "waiting-on-repository":
      return "Waiting on repository";
    case "waiting-on-source":
      return "Waiting on source";
  }
}

export function proposalRepoGateLabel(proposal: ProposalWorkspaceScenario) {
  switch (proposal.repoGate.state) {
    case "blocked":
      return "Repo Needed";
    case "clear":
      return "Repo Clear";
    case "not-required":
      return "No Repo";
  }
}

export function proposalRepoGateTone(proposal: ProposalWorkspaceScenario) {
  switch (proposal.repoGate.state) {
    case "blocked":
      return "warn";
    case "clear":
      return "ok";
    case "not-required":
      return "muted";
  }
}

export function proposalRepoGateTitle(proposal: ProposalWorkspaceScenario) {
  switch (proposal.repoGate.state) {
    case "blocked":
      return "Handoff blocked";
    case "clear":
      return "Repository clear";
    case "not-required":
      return "Repository not required";
  }
}

export function proposalRegisterDescription(
  proposal: ProposalWorkspaceScenario,
) {
  return `${proposalIngressLabel(proposal.ingress)} / ${proposal.routeTarget} / ${proposal.owner}`;
}

export function proposalRegisterEvidence(proposal: ProposalWorkspaceScenario) {
  return `${proposal.id} / ${proposal.lastEvent}`;
}

export function proposalSubjectMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Proposal", value: proposal.id },
    { label: "Ingress", value: proposalIngressLabel(proposal.ingress) },
    { label: "Version", value: proposal.recordVersion },
  ];
}

export function proposalSelectedPanelMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Proposal", value: proposal.id },
    { label: "Ingress", value: proposalIngressLabel(proposal.ingress) },
    { label: "Route", value: proposal.routeTarget },
    { label: "Repo Gate", value: proposalRepoGateLabel(proposal) },
    { label: "Version", value: proposal.recordVersion },
  ];
}

export function proposalStatusFilterOptions(
  proposals: ProposalWorkspaceScenario[],
) {
  return [
    { label: "All states", value: "all" as const },
    ...Array.from(
      new Map(
        proposals.map((proposal) => [
          proposal.status,
          {
            label: proposalScenarioStatusLabel(proposal.status),
            value: proposal.status,
          },
        ]),
      ).values(),
    ),
  ];
}

export function proposalWorkspaceSummaryMetrics(
  proposals: ProposalWorkspaceScenario[],
): ProposalWorkspaceSummaryMetric[] {
  const parkedCount = proposals.filter(
    (proposal) => proposal.status === "parked",
  ).length;
  const waitingCount = proposals.filter(
    (proposal) =>
      proposal.status === "waiting-on-repository" ||
      proposal.status === "waiting-on-source",
  ).length;
  const doneCount = proposals.filter(
    (proposal) => proposal.status === "done",
  ).length;
  const reviewCount = Math.max(
    0,
    proposals.length - waitingCount - parkedCount - doneCount,
  );

  return [
    {
      id: "total",
      label: "Total",
      tone: "info",
      value: String(proposals.length),
    },
    { id: "review", label: "Review", tone: "warn", value: String(reviewCount) },
    {
      id: "waiting",
      label: "Waiting",
      tone: "warn",
      value: String(waitingCount),
    },
    {
      id: "parked",
      label: "Parked",
      tone: "muted",
      value: String(parkedCount),
    },
    { id: "done", label: "Done", tone: "ok", value: String(doneCount) },
  ];
}

export function proposalFilterRegisterRows({
  ingressFilter,
  proposals,
  search,
  statusFilter,
}: {
  ingressFilter: ProposalIngressFilter;
  proposals: ProposalWorkspaceScenario[];
  search: string;
  statusFilter: ProposalStatusFilter;
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return proposals.filter((proposal) => {
    const matchesIngress =
      ingressFilter === "all" || proposal.ingress === ingressFilter;
    const matchesStatus =
      statusFilter === "all" || proposal.status === statusFilter;
    const matchesSearch = normalizedSearch
      ? [
          proposal.backendRecordId,
          proposal.bodyPreview,
          proposal.id,
          proposal.ingress,
          proposal.lastEvent,
          proposal.owner,
          proposal.recordVersion,
          proposal.repoGate.detail,
          proposal.repoGate.mode,
          proposal.repoGate.ref ?? "",
          proposal.repoGate.state,
          proposal.routeTarget,
          proposal.status,
          proposalScenarioStatusLabel(proposal.status),
          proposal.title,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      : true;

    return matchesIngress && matchesStatus && matchesSearch;
  });
}

export const proposalIngressFilterOptions: Array<{
  label: string;
  value: ProposalIngressFilter;
}> = [
  { label: "All ingress", value: "all" },
  { label: "Agent-fed", value: "agent" },
  { label: "API-fed", value: "api" },
  { label: "Console-created", value: "console" },
  { label: "System-fed", value: "system" },
];
