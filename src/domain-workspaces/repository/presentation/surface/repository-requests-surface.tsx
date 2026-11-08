"use client";

import { useState } from "react";
import { useRepositoryRequestPage } from "../../live-runtime/use-repository-request-page.ts";
import {
  TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasFieldStack, TerasFilterBar, TerasLoadingState,
  TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable, TerasRegisterPanel, TerasRegisterPagination, useRegisterPage,
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
  const [retainedSelection, setRetainedSelection] = useState<ProposalRepositoryGateRequest | null>(null);
  const matches = runtime.requests.filter(request => {
    const state = repositoryRequestState(request);
    return (filter === "all" || (filter === "attention" ? state !== "resolved" : state === filter)) &&
      `${request.title} ${request.proposalId}`.toLowerCase().includes(search.toLowerCase().trim());
  });
  const localPage = useRegisterPage(matches, JSON.stringify([search.trim().toLowerCase(), filter]), 'Repository requests');
  const native = useRepositoryRequestPage({query: search.trim().toLowerCase(), status: filter}, runtime.mode === "live");
  const live = runtime.mode === "live";
  const page = live ? { ...native, page: native.pageNumber, hasNext: Boolean(native.nextCursor) } : localPage;
  const records = live ? native.records : localPage.rows;
  const selected = records.find(request => request.proposalId === selectedId) ?? (retainedSelection?.proposalId === selectedId ? { ...retainedSelection, sourceCurrent: false } : records[0]);
  const loading = live ? native.loading : runtime.status === "loading";
  const current = live ? !native.loading && !native.error : runtime.status === "current" && (runtime.attentionCount !== null || runtime.coverage?.complete === false);
  const countUnavailable = runtime.status !== "loading" && runtime.attentionCount === null;
  const refresh = () => live ? native.refresh() : runtime.refresh();
  const pageError = live ? native.error : runtime.error;
  const inspect = (request: ProposalRepositoryGateRequest) => {
    setSelectedId(request.proposalId); setRetainedSelection(request); controller.canonicalGate.openDialog(request.proposalId);
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
    <TerasEmptyState fill>{!current || countUnavailable ? "The request source is unavailable or incomplete. Refresh to check for current requests." :
      live && native.nextCursor ? "No matches in this search window. Continue search to check remaining requests." : runtime.coverage?.complete === false && !live ? "No matching requests are visible in the proposals checked so far. The remaining proposals have not been checked." :
      search.trim() ? "No requests match your search." : filter === "attention" ?
      "No repository requests need attention. Resolved requests remain available in history." :
      "No requests match this status."}</TerasEmptyState>;
  return <TerasRecordControlLayout composition="compact-control" mode="register-selected"
    data-repository-requests-surface="true"
    register={<TerasRegisterPanel footer={<TerasRegisterPagination label="Repository requests" offset={page.offset} count={records.length} total={live || runtime.coverage?.complete === false ? undefined : matches.length} page={page.page} pending={loading} unavailable={Boolean(pageError)} hasPrevious={page.hasPrevious} hasNext={page.hasNext} onPrevious={page.previous} onNext={page.next} nextLabel={!records.length && page.hasNext ? "Continue search" : undefined} />} title="Repository requests" kicker="Requests" density="compact-control"
      description="Repository requirements raised by Proposals. Review each request before confirming its repository."
      actions={<TerasActionButton emphasis="secondary" onClick={() => { void refresh(); }}>Refresh requests</TerasActionButton>}
      filterBar={<TerasFilterBar search={{ariaLabel: "Search repository requests", value: search,
        placeholder: "Search proposal…", onValueChange: setSearch}}
        filters={[{label: "Filter request status", value: filter, onValueChange: setFilter, options: [
          {label: "Needs attention", value: "attention"}, {label: "Needs repository", value: "repository"},
          {label: "Finish confirmation", value: "confirmation"}, {label: "Resolved history", value: "resolved"},
          {label: "All requests", value: "all"},
        ]}]} />}>
      <TerasFieldStack fill="last">
      {!loading && (!current || countUnavailable) ? <TerasContentTray role="status" kicker="Request coverage" description="Current request count is unavailable. Requests with stale source data are read-only." /> : null}
      {pageError ? <TerasContentTray role="alert" kicker="Requests unavailable" description={pageError} /> : null}
      {!live && runtime.coverage && !runtime.coverage.complete ? runtime.reading ? <TerasLoadingState inline label="Checking remaining Proposal pages…" /> :
        <TerasContentTray kicker="Incomplete request coverage" description={runtime.coverage.detail ?? "Some proposals have not been checked. The total needing attention is unavailable."} /> : null}
      {records.length ? <TerasRecordTable ariaLabel="Repository requests" columns={columns} rows={records} fill getRowId={request => request.proposalId}
        selectedRowId={selected?.proposalId ?? null} onSelect={request => {setSelectedId(request.proposalId);setRetainedSelection(request);}} /> : empty}
      </TerasFieldStack>
    </TerasRegisterPanel>}
    selected={selected ? <TerasSelectedPanel selected variant="compact" kicker="Request context" title={selected.title}
      tone={selected.sourceCurrent && repositoryRequestState(selected) === "resolved" ? "ok" : "warn"}
      description="This Proposal requested a new repository. Repository confirmation is separate from workspace registration."
      status={{label: selected.sourceCurrent ? repositoryRequestStateLabel(selected) : "Read-only"}}
      meta={[{label: "Requested by", value: "Proposal"}, ...((selected.resolution?.resolved_repo_ref ?? selected.resolvedRepositoryRef) ? [{label: "Repository", value: (selected.resolution?.resolved_repo_ref ?? selected.resolvedRepositoryRef)!}] : [])]}
      action={{kicker: repositoryRequestState(selected) === "resolved" ? "Available actions" : "Next action",
        title: !selected.sourceCurrent ? "Refresh before making changes" : repositoryRequestStateLabel(selected),
        description: !selected.sourceCurrent ? "The last verified request is available for inspection. Confirmation requires a current source." :
          selected.recovery ? "The repository was recorded, but confirmation was interrupted. Finish using the original receipt and notes." :
          repositoryRequestState(selected) === "resolved" ? "The current Proposal records the repository requirement as resolved. Inspect its source and available confirmation evidence." :
          "Create a repository or attach one already created for this request, then review and confirm its result. Reusing existing work’s repository is selected in Proposal.",
        node: <TerasActionRow><TerasActionButton onClick={() => inspect(selected)}>
          {repositoryRequestState(selected) === "resolved" ? selected.resolution ? "View confirmation" : "Inspect source decision" : "Review request"}</TerasActionButton>
          {onOpenProposal ? <TerasActionButton emphasis="secondary" onClick={() => onOpenProposal(selected.proposalId)}>Open Proposal</TerasActionButton> : null}
        </TerasActionRow>,
      }} /> : loading ? <TerasLoadingState fill label="Preparing request details…" skeleton="details" /> :
      <TerasEmptyState fill>Select a request to review its repository requirement.</TerasEmptyState>} />;
}
