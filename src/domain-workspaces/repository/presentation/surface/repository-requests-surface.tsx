"use client";

import { useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasEmptyState, TerasFilterBar, TerasLoadingState,
  TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable, TerasRegisterPanel,
  TerasSelectedPanel, TerasStatusPill, type TerasRecordTableColumn,
} from "@/teras";
import type { ProposalRepositoryGateRequest } from "../../../operation-contracts/proposal-repository-live.ts";
import { repositoryRequestState, repositoryRequestStateLabel } from "../../../operation-integrations/proposal-repository-live-projection.ts";
import type { RepositoryControlController } from "./use-repository-control-controller.ts";

export function RepositoryRequestsSurface({ controller, onOpenProposal }: {
  controller: RepositoryControlController;
  onOpenProposal?: (proposalId: string) => void;
}) {
  const runtime = controller.repositoryRequests;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("attention");
  const [selectedId, setSelectedId] = useState<string | null>(controller.canonicalGate.subjectRef ?? null);
  const records = runtime.requests.filter(request => {
    const state = repositoryRequestState(request);
    return (filter === "all" || (filter === "attention" ? state !== "resolved" : state === filter)) &&
      `${request.title} ${request.proposalId}`.toLowerCase().includes(search.toLowerCase().trim());
  });
  const selected = records.find(request => request.proposalId === selectedId) ?? records[0];
  const loading = runtime.status === "loading";
  const current = runtime.attentionCount !== null;
  const inspect = (request: ProposalRepositoryGateRequest) => {
    setSelectedId(request.proposalId); controller.canonicalGate.openDialog(request.proposalId);
  };
  const columns: TerasRecordTableColumn<ProposalRepositoryGateRequest>[] = [
    { key: "proposal", header: "Request", intent: "primary", render: request =>
      <TerasRecordCellText title={request.title} description="From Proposal" /> },
    { key: "state", header: "Status", intent: "status", render: request =>
      <TerasStatusPill tone={!request.sourceCurrent ? "muted" : repositoryRequestState(request) === "resolved" ? "ok" : "warn"}>
        {request.sourceCurrent ? repositoryRequestStateLabel(request) : "Read-only"}
      </TerasStatusPill> },
    { key: "action", header: "Action", intent: "action", render: request =>
      <TerasActionButton emphasis="secondary" size="table-compact" onClick={event => {
        event.stopPropagation(); inspect(request);
      }}>Review</TerasActionButton> },
  ];
  const empty = loading ? <TerasLoadingState fill label="Loading repository requests…" /> :
    <TerasEmptyState fill>{!current ? "The request source is unavailable or incomplete. Refresh to check for current requests." :
      search.trim() ? "No requests match your search." : filter === "attention" ?
      "No repository requests need attention. Resolved requests remain available in history." :
      "No requests match this status."}</TerasEmptyState>;
  return <TerasRecordControlLayout composition="compact-control" mode="register-selected"
    data-repository-requests-surface="true"
    register={<TerasRegisterPanel title="Repository requests" kicker="Requests" density="compact-control"
      description="Repository requirements raised by Proposals. Review each request before confirming its repository."
      actions={<TerasActionButton emphasis="secondary" onClick={() => { void runtime.refresh(); }}>Refresh requests</TerasActionButton>}
      filterBar={<TerasFilterBar search={{ariaLabel: "Search repository requests", value: search,
        placeholder: "Search proposal…", onValueChange: setSearch}}
        filters={[{label: "Filter request status", value: filter, onValueChange: setFilter, options: [
          {label: "Needs attention", value: "attention"}, {label: "Needs repository", value: "repository"},
          {label: "Finish confirmation", value: "confirmation"}, {label: "Resolved history", value: "resolved"},
          {label: "All requests", value: "all"},
        ]}]} />}>
      {!loading && !current ? <p role="status">Current request count is unavailable. Requests with stale source data are read-only.</p> : null}
      {runtime.error ? <p role="alert">{runtime.error}</p> : null}
      {records.length ? <TerasRecordTable columns={columns} rows={records} fill getRowId={request => request.proposalId}
        selectedRowId={selected?.proposalId ?? null} onSelect={request => setSelectedId(request.proposalId)} /> : empty}
    </TerasRegisterPanel>}
    selected={selected ? <TerasSelectedPanel selected variant="compact" kicker="Request context" title={selected.title}
      tone={selected.sourceCurrent && repositoryRequestState(selected) === "resolved" ? "ok" : "warn"}
      description="This Proposal requested a new repository. Repository confirmation is separate from workspace registration."
      status={{label: selected.sourceCurrent ? repositoryRequestStateLabel(selected) : "Read-only"}}
      meta={[{label: "Requested by", value: "Proposal"}, ...(selected.resolution ? [{label: "Repository", value: selected.resolution.resolved_repo_ref}] : [])]}
      action={{kicker: repositoryRequestState(selected) === "resolved" ? "Available actions" : "Next action",
        title: !selected.sourceCurrent ? "Refresh before making changes" : repositoryRequestStateLabel(selected),
        description: !selected.sourceCurrent ? "The last verified request is available for inspection. Confirmation requires a current source." :
          selected.recovery ? "The repository was recorded, but confirmation was interrupted. Finish using the original receipt and notes." :
          selected.resolution ? "The repository requirement is resolved. No further repository confirmation is needed." :
          "Create a repository or attach one already created for this request, then review and confirm its result. Reusing existing work’s repository is selected in Proposal.",
        node: <TerasActionRow><TerasActionButton onClick={() => inspect(selected)}>
          {selected.resolution && !selected.recovery ? "View confirmation" : "Review request"}</TerasActionButton>
          {onOpenProposal ? <TerasActionButton emphasis="secondary" onClick={() => onOpenProposal(selected.proposalId)}>Open Proposal</TerasActionButton> : null}
        </TerasActionRow>,
      }} /> : loading ? <TerasLoadingState fill label="Preparing request details…" skeleton="details" /> :
      <TerasEmptyState fill>Select a request to review its repository requirement.</TerasEmptyState>} />;
}
