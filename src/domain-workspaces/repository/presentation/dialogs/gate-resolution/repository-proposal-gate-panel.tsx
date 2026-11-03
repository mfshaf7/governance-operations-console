"use client";

import { RepositoryRequestAttachment } from "./repository-request-attachment.tsx";
import { repositoryCreationForProposal, repositoryFulfilmentForProposal, repositoryAttachmentProposalId } from "../../../../operation-integrations/proposal-repository-custody.ts";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack, TerasMetadataList, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasSegmentedControl, TerasTechnicalDetails, TerasTrayStack } from "@/teras";
import type { useProposalRepositoryGateRuntime } from "../../../../operation-integrations/use-proposal-repository-gate-runtime.ts";
import { repositoryRequestStateLabel } from "../../../../operation-integrations/proposal-repository-live-projection.ts";
import type { RepositoryCustodyWorkflowResult, RepositoryCustodyLinkIntent } from "../../../live-runtime/repository-custody-live-types.ts";

export function RepositoryProposalGatePanel({ subjectRef, custodyResults, custodyCurrent, onDirtyChange, runtime, onCreateRepository, creationAvailable = false, onAttachRepository, attachmentAvailable = false, onBusyChange }: {
  onCreateRepository?: (proposalId: string) => void; creationAvailable?: boolean;
  onAttachRepository?: (intent: RepositoryCustodyLinkIntent) => Promise<RepositoryCustodyWorkflowResult>; attachmentAvailable?: boolean;
  onBusyChange?: (busy: boolean) => void;
  subjectRef?: string; custodyResults: RepositoryCustodyWorkflowResult[]; custodyCurrent: boolean;
  runtime: ReturnType<typeof useProposalRepositoryGateRuntime>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [method,setMethod] = useState<"create" | "attach">("create");
  const [attachmentDirty,setAttachmentDirty] = useState(false);
  const [attachmentBusy,setAttachmentBusy] = useState(false);
  useEffect(()=>{onBusyChange?.(attachmentBusy);},[attachmentBusy,onBusyChange]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { custodyId: string; notes: string }>>({});
  const dirty = attachmentDirty || Object.entries(drafts).some(([id, draft]) => {
    const request = runtime.requests.find(request => request.proposalId === id);
    return Boolean((draft.custodyId || draft.notes.trim()) && (!request?.resolution || request.recovery));
  });
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const target = subjectRef ?? selectedId;
  // An explicit route must never resolve a different request if its source disappears.
  const request = target ? runtime.requests.find(entry => entry.proposalId === target) :
    runtime.requests.find(entry => !entry.resolution || entry.recovery) ?? runtime.requests[0];
  const recovery = request?.recovery;
  const resolved = Boolean(request?.resolution && !recovery);
  const current = Boolean(request?.sourceCurrent);
  const draft = request ? drafts[request.proposalId] ?? { custodyId: "", notes: "" } : { custodyId: "", notes: "" };
  const notes = recovery?.notes ?? draft.notes;
  const options = [...new Map(custodyResults.filter(result => result.status === "succeeded" && result.receipt_ref && result.provider_readback &&
      request && repositoryFulfilmentForProposal(result, request.proposalId))
    .map(result => [result.request.request_id, result])).values()];
  const custodyId = recovery?.custody_request_id ?? (draft.custodyId || (options.length === 1 ? options[0].request.request_id : ""));
  const custody = options.find(result => result.request.request_id === custodyId);
  const needsSelection = options.length > 1 || Boolean(draft.custodyId && !custody);
  const creation = request ? custodyResults.filter(result => repositoryCreationForProposal(result, request.proposalId))
    .sort((a, b) => a.request.requested_at.localeCompare(b.request.requested_at)).at(-1) : undefined;
  const readyToConfirm = Boolean(recovery || options.length);
  const creationStatus = creation?.status === "applying" ? "Creation in progress" : creation ? "Creation needs attention" : "Needs repository";
  const canSubmit = Boolean(request && !resolved && current && custodyCurrent &&
    !runtime.pending && notes.trim() && (recovery || custody?.receipt_ref));
  function update(patch: Partial<typeof draft>) {
    if (request) setDrafts(current => ({ ...current, [request.proposalId]: { ...draft, ...patch } }));
  }
  return <TerasPanel frame="padded" treatment="rail" fit="content" tone={resolved ? "ok" : "warn"}>
    <TerasPanelHeader kicker="From Proposal" title={request?.title ?? "Request unavailable"}
      description={resolved ? "The repository requirement has been confirmed." : recovery ?
        "Finish the interrupted confirmation using its original receipt and notes." :
        readyToConfirm ? "Review the repository associated with this request, then confirm it." :
        "Create a repository, or attach one already created to fulfil this request."}
      statusLabel={runtime.pending ? "Recording" : !current ? runtime.status === "loading" ? "Loading" : "Read-only" : request ? resolved ? repositoryRequestStateLabel(request) : readyToConfirm ? "Ready to confirm" : custodyCurrent ? creationStatus : "Results unavailable" : "Unavailable"}
      statusTone={resolved ? "ok" : "warn"} />
    <TerasTrayStack spacing="loose" topOffset="section">
      {runtime.error ? <p role="alert">{runtime.error}</p> : null}
      {!current ? <><p role="status">{request ? "This retained request is read-only. Refresh its source before confirming." :
        target ? "The requested Proposal requirement is not available. Refresh its source or return to Requests." :
        "No current repository request is available."}</p>
        <TerasActionButton emphasis="secondary" onClick={() => { void runtime.refresh(); }}>Refresh request</TerasActionButton></> : null}
      {request ? <>
        {!subjectRef ? <TerasSelectField label="Proposal request" aria-label="Proposal repository request" value={request.proposalId}
          onValueChange={setSelectedId} disabled={runtime.pending || attachmentBusy || attachmentDirty}
          options={runtime.requests.map(entry => ({ label: entry.title, value: entry.proposalId }))} /> : null}
        {request.resolution ? <TerasMetadataList items={[{label: "Repository", value: request.resolution.resolved_repo_ref}]} /> : null}
        {!resolved ? !custodyCurrent ? <TerasContentTray kicker="Repository result" title="Results unavailable"
          description="Repository creation results could not be verified. Refresh Repositories before creating or confirming a repository." /> :
          !readyToConfirm ? <TerasFieldStack spacing="loose">
            <TerasActionRow><TerasSegmentedControl ariaLabel="Repository method" value={method} onValueChange={setMethod} disabled={runtime.pending || attachmentBusy}
              options={[{value:"create",label:"Create new"},{value:"attach",label:"Already created"}]} /></TerasActionRow>
            {method === "create" ? <TerasContentTray kicker="Create new"
            title={creation ? creationStatus : "Create the requested repository"}
            description={creation ? "A creation attempt is already recorded for this request. Review its result and continue the same attempt where available." :
              "Review the creation details and approval next. After success, return here to confirm the result."}>
            {onCreateRepository ? <TerasActionRow><TerasActionButton disabled={runtime.pending || (!creation && (!current || !creationAvailable))}
              onClick={() => onCreateRepository(request.proposalId)}>{creation ? "Review repository creation" : "Create repository for this request"}</TerasActionButton></TerasActionRow> : null}
          </TerasContentTray> : null}
          {onAttachRepository ? <div hidden={method!=="attach"}><RepositoryRequestAttachment key={request.proposalId}
            proposalId={request.proposalId} results={custodyResults.filter(result=>{
              const origin=repositoryAttachmentProposalId(result);
              return (!origin || origin===request.proposalId) && !runtime.requests.some(other=>other.proposalId!==request.proposalId && other.resolution?.custody_request_id===result.request.request_id);
            })} enabled={current && custodyCurrent && !runtime.pending} attachmentAvailable={attachmentAvailable} onAttach={onAttachRepository}
            onDirtyChange={setAttachmentDirty} onBusyChange={setAttachmentBusy} onAttached={notes=>update({notes})} /></div> : null}
          </TerasFieldStack> : <TerasFieldStack spacing="loose">
          {recovery ? null : needsSelection ? <TerasSelectField label="Repository result" aria-label="Repository result" value={custodyId}
            disabled={!current || runtime.pending} onValueChange={value => update({ custodyId: value })}
            helper="Only verified creation or attachment results associated with this request are listed."
            options={[{label: "Select a verified result for this request", value: ""},
              ...options.map(entry => ({label: entry.provider_readback!.canonical_url, value: entry.request.request_id}))]} /> :
            <TerasContentTray kicker={custody?.request.action==="link-existing"?"Attached repository":"Created repository"} title={custody?.provider_readback?.canonical_url}
              description="This verified repository is associated with the request. Review the result and confirm." />}
          <TerasNoteField label="Confirmation notes" aria-label="Repository resolution notes" value={notes}
            placeholder="Explain why this repository meets the Proposal’s requirement."
            disabled={!current || Boolean(recovery) || runtime.pending} onValueChange={value => update({ notes: value })} />
          <TerasActionButton disabled={!canSubmit} onClick={() => {
            if (!canSubmit || !request) return;
            void runtime.resolve({ proposalId: request.proposalId, recordRef: request.recordRef,
              recordVersion: recovery?.source_version ?? request.recordVersion,
              custodyRequestId: recovery?.custody_request_id ?? custody!.request.request_id,
              custodyReceiptRef: recovery?.custody_receipt_ref ?? custody!.receipt_ref!, notes });
          }}>{recovery ? "Finish confirmation" : "Confirm repository"}</TerasActionButton>
        </TerasFieldStack> : null}
        <TerasTechnicalDetails items={[
          { label: "Proposal source", value: `${request.proposalId} / ${request.recordVersion}` },
          { label: "Request", value: `repo-request://proposal/${request.proposalId}` },
          ...(request.resolution ? [{ label: "Owner receipt", value: request.resolution.receipt_ref }] : []),
          ...(custody?.receipt_ref ? [{ label: "Reviewed custody receipt", value: custody.receipt_ref.uri },
            {label: "Provider repository", value: custody.provider_readback!.repository_identity.provider_repository_id}] : []),
        ]} />
      </> : null}
    </TerasTrayStack>
  </TerasPanel>;
}
