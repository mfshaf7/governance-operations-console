"use client";
import { useState } from "react";
import { TerasLoadingState, TerasActionButton, TerasActionRow, TerasDialog, TerasEmptyState, TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasSignalItem, TerasStatusItem, TerasTechnicalDetails } from "@/teras";
import type { DevIntegrationProfilesRuntime } from "../../live-runtime/use-dev-integration-profiles.ts";
import { operationTime } from "../../read-model/platform-operation-display.ts";
export function DevIntegrationRequestHistory({ runtime }: {
  runtime: DevIntegrationProfilesRuntime;
}) {
  const [selectedId, select] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = runtime.requests.find(row => row.request_id === selectedId);
  return <>
    <TerasPanel fit="content" frame="padded" treatment="neutral" spacing="normal">
      <TerasPanelHeader busy={pending || runtime.historyLoading} busyLabel="Reading profile requests…" kicker="Profile requests" title="Request history"
        description="Recorded requests and their original recovery state. A recorded request does not admit or start a profile."
        statusLabel={runtime.historyLoading ? "Reading history" : runtime.historyCurrent ? `${runtime.requests.length} loaded` : "History unavailable"} statusTone={runtime.historyLoading || runtime.historyCurrent ? "info" : "warn"}
        actions={<TerasActionButton busy={runtime.historyLoading} emphasis="secondary" onClick={() => void runtime.loadHistory()}>Refresh requests</TerasActionButton>}/>
      {runtime.historyLoading && !runtime.requests.length ? <TerasLoadingState label="Loading profile request history…" /> : runtime.requests.length ? <TerasList frame="contained">{runtime.requests.map(row => <TerasSignalItem key={row.request_id}
        ariaLabel={`Inspect profile request ${row.request_id}`} actionLabel="Inspect request" label={row.request.profileId}
        title="Request recorded"
        detail={operationTime(row.created_at)} tone={row.state === "recorded" ? "info" : "warn"} onSelect={() => {select(row.request_id);setError(null);}}/>)}</TerasList>
        : <TerasEmptyState>{runtime.historyCurrent ? "No profile requests are loaded for this operator." : "The request service could not be read. No empty-history claim can be made."}</TerasEmptyState>}
      {runtime.pendingId() && !runtime.requests.some(row => row.request_id === runtime.pendingId()) ? <TerasStatusItem label="Unconfirmed submission"
        status="Read original" detail={`Request ${runtime.pendingId()} has no confirmed response.`} tone="warn"/> : null}
      <TerasActionRow>
        {runtime.pendingId() ? <TerasActionButton disabled={pending} onClick={async () => { const id=runtime.pendingId();if(!id)return;setPending(true);try{await runtime.read(id);select(id);setError(null);}catch(error){setError(error instanceof Error ? error.message : "Original request unavailable.");}finally{setPending(false);}}}>Read original submission</TerasActionButton> : null}
        {runtime.requestPage.next_offset !== null ? <TerasActionButton busy={runtime.historyLoading} emphasis="secondary" onClick={() => void runtime.loadHistory(runtime.requestPage.next_offset!)}>Load more requests</TerasActionButton> : null}
      </TerasActionRow>
      {error && !selected ? <TerasStatusItem label="Request readback" status="Unavailable" detail={error} tone="warn"/> : null}
    </TerasPanel>
    <TerasDialog busy={pending} busyLabel="Reading original profile request…" open={Boolean(selectedId)} onClose={() => {if(!pending){select(null);setError(null);}}} closeDisabled={pending}
      title="Profile request" kicker={selected?.request.profileId ?? "Original request"} width="standard" height="content" contentOverflow="auto"
      description={selected?.next_action.reason ?? "The original request is not loaded."}
      actions={<><TerasActionButton emphasis="secondary" disabled={pending} onClick={() => select(null)}>Back to requests</TerasActionButton>
        {selected ? <TerasActionButton disabled={pending} onClick={async () => {setPending(true);try{await runtime.read(selected.request_id);setError(null);}catch(error){setError(error instanceof Error ? error.message : "Original request unavailable.");}finally{setPending(false);}}}>Refresh original request</TerasActionButton> : null}
        </>}>
      {selected ? <><TerasMetadataList columns={2} items={[{label:"State",value:"Request recorded"},
        {label:"Admission",value:selected.admission.state === "registered" ? selected.admission.lifecycle ?? "Unknown" : selected.admission.state === "not-registered" ? "Pending registration" : selected.admission.state === "different-request" ? "A different request is registered" : selected.admission.state === "not-checked" ? "Not checked" : "Unavailable"},
        {label:"Readback",value:selected.readback},{label:"Requested",value:operationTime(selected.created_at)},{label:"Implementation repository",value:selected.request.ownerRepo}]}/>
        {error ? <TerasStatusItem label="Readback" status="Unavailable" detail={error} tone="warn"/> : null}
        <TerasTechnicalDetails summary="Original request details" items={[{label:"Request",value:selected.request_id},{label:"Attributed operator",value:selected.operator_id},
          {label:"Request record",value:selected.request_ref},{label:"Registry source",value:selected.expected_source_version},{label:"Intent digest",value:selected.intent_digest},
          {label:"Recording receipt",value:JSON.stringify(selected.receipt,null,2)},{label:"Admission readback",value:JSON.stringify(selected.admission,null,2)},
          {label:"Structured request",value:JSON.stringify(selected.request,null,2)}]}/></> : <TerasEmptyState>Refresh request history to inspect its original identity.</TerasEmptyState>}
    </TerasDialog>
  </>;
}
