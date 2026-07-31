import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";
import {
  proposalRegisterDescription,
  proposalStatusPillLabel,
} from "../shared/proposal-display-model.ts";

export function ProposalWorkspaceRegisterTable({
  onInspectProposal,
  onSelectProposal,
  proposals,
  selectedProposalId,
}: {
  onInspectProposal: (proposal: ProposalWorkspaceScenario) => void;
  onSelectProposal: (proposal: ProposalWorkspaceScenario) => void;
  proposals: ProposalWorkspaceScenario[];
  selectedProposalId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<ProposalWorkspaceScenario>> = [
    {
      header: "No.",
      intent: "index",
      key: "index",
      render: (_proposal, index) => String(index + 1).padStart(2, "0"),
    },
    {
      header: "Proposal",
      intent: "primary",
      key: "proposal",
      render: (proposal) => (
        <TerasRecordCellText
          description={proposalRegisterDescription(proposal)}
          title={proposal.title}
        />
      ),
    },
    {
      header: "Route",
      intent: "secondary",
      key: "route",
      render: (proposal) => (
        <TerasRecordCellText
          description={proposal.owner}
          title={proposal.routeTarget}
        />
      ),
    },
    {
      header: "Status",
      intent: "status",
      key: "state",
      render: (proposal) => (
        <TerasStatusPill tone={proposal.tone}>
          {proposalStatusPillLabel(proposal)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Inspect",
      intent: "action",
      key: "action",
      render: (proposal) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onInspectProposal(proposal);
          }}
          emphasis="secondary"
        >
          Inspect
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(proposal) => proposal.id}
      onSelect={onSelectProposal}
      rows={proposals}
      selectedRowId={selectedProposalId}
    />
  );
}
