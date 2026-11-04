"use client";

import { useEffect, useRef, useState } from "react";
import { TerasLoadingState, TerasActionButton, TerasActionRow, TerasContentTray, TerasDialog, TerasEmptyState, TerasFieldStack, TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasSignalItem, TerasStatusItem, TerasTechnicalDetails, TerasTimeline, TerasTimelineItem } from "@/teras";
import type { PlatformOperationRecord } from "../../live-runtime/platform-operation-types.ts";
import { operationStateLabel, operationTime, operationTone, platformActionLabel, platformSubjectLabel } from "../../read-model/platform-operation-display.ts";

export function PlatformOperationHistory({ onControl, onRead, operations, controlsAvailable = true, onLoadMore, nextPageAvailable=false, focusRecordRef, loading = false }: {
  onLoadMore?:()=>Promise<unknown>;
  nextPageAvailable?:boolean;
  loading?:boolean;
  onControl: (operationId: string, action: "cancel" | "retry", reason: string) => Promise<PlatformOperationRecord>;
  onRead?: (operationId: string) => Promise<PlatformOperationRecord>;
  operations: readonly PlatformOperationRecord[]; controlsAvailable?: boolean; focusRecordRef?: string | null;
}) {
  const [visible, setVisible] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(focusRecordRef && operations.some(item => item.operation_id === focusRecordRef) ? focusRecordRef : null);
  const appliedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (focusRecordRef && appliedFocus.current !== focusRecordRef && operations.some(item => item.operation_id === focusRecordRef)) {
      appliedFocus.current = focusRecordRef; setSelectedId(focusRecordRef);
    }
  }, [focusRecordRef, operations]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = operations.find(item => item.operation_id === selectedId) ?? null;
  const selectedReleasePending = Boolean(selected?.provider_operation.release_workflow && !["succeeded", "failed", "cancelled"].includes(selected.state));
  useEffect(() => {
    if (!selectedId || !selectedReleasePending || !onRead) return;
    let active = true;
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (active && !busy && !document.hidden) {
        busy = true;
        try { await onRead(selectedId); }
        catch { if (active) setError("Original operation progress could not be refreshed. Existing evidence is retained; inspect the original workflow or refresh again."); }
        finally { busy = false; }
      }
      if (active) timer = setTimeout(tick, 15_000);
    };
    const visible = () => { if (!document.hidden && !busy) { clearTimeout(timer); void tick(); } };
    void tick();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { active = false; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [selectedId, selectedReleasePending, onRead]);
  const cancelling = operations.find(item => item.operation_id === cancelId) ?? null;
  const sorted = [...operations].sort((a,b) => Date.parse(b.updated_at)-Date.parse(a.updated_at));
  async function control(operationId: string, action: "cancel" | "retry") {
    const current = operations.find(item => item.operation_id === operationId);
    if (pending || !controlsAvailable || !current || !(action === "cancel" ? current.provider_operation.cancel_available : current.provider_operation.retryable)) return;
    setPending(true); setError(null);
    try { await onControl(operationId,action, action === "cancel" ? "Cancel this exact retained operation without assuming rollback." : "Retry this exact retained operation after reviewing its current source state."); setCancelId(null); }
    catch(caught) {setError(caught instanceof Error ? caught.message : "The service could not confirm this control. Refresh the original operation before retrying.");}
    finally {setPending(false);}
  }
  async function read() {
    if (!selected || !onRead || pending) return;
    setPending(true); setError(null);
    try {await onRead(selected.operation_id);} catch(caught) {setError(caught instanceof Error ? caught.message : "The original operation could not be refreshed.");} finally {setPending(false);}
  }
  const close = () => {if(!pending){setSelectedId(null);setError(null);}};
  return <>
    <TerasPanel spacing="normal" fit="content" frame="padded" treatment="neutral">
      <TerasPanelHeader busy={pending} busyLabel="Reading operation history…" kicker="Recorded operations" title="Operation history" description="Inspect an original operation, its recorded events and receipt. These are loaded records, not a complete lifetime total."
        statusLabel={`${Math.min(visible,operations.length)} of ${operations.length} loaded`} statusTone="info"/>
      {loading && !sorted.length ? <TerasLoadingState label="Loading operation history…" /> : sorted.length ? <TerasList frame="contained">{sorted.slice(0,visible).map(operation => <TerasSignalItem key={operation.operation_id} ariaLabel={`Inspect operation ${operation.operation_id}`} actionLabel="Inspect operation" onSelect={() => {setSelectedId(operation.operation_id);setError(null);}}
        label={platformSubjectLabel(operation.command.subject.ref)} title={`${platformActionLabel(operation.command.action)} · ${operationStateLabel(operation.state)}`}
        detail={operationTime(operation.updated_at)} tone={operationTone(operation.state)}/>)}</TerasList> : <TerasEmptyState>No operations are loaded for this workspace.</TerasEmptyState>}
      {onLoadMore&&nextPageAvailable ? <TerasActionRow><TerasActionButton emphasis="secondary" disabled={pending} onClick={()=>{setPending(true);setError(null);void onLoadMore().then(()=>setVisible(count=>count+10)).catch(caught=>setError(caught instanceof Error?caught.message:"Older history is unavailable.")).finally(()=>setPending(false));}}>Load older operations</TerasActionButton></TerasActionRow> : null}
      {error&&!selected ? <TerasEmptyState>{error}</TerasEmptyState> : null}
      {visible < sorted.length ? <TerasActionRow><TerasActionButton emphasis="secondary" onClick={() => setVisible(count => count+10)}>Show more operations</TerasActionButton></TerasActionRow> : null}
    </TerasPanel>
    <TerasDialog busy={pending} busyLabel="Reading original operation…" open={Boolean(selectedId)} onClose={close} closeDisabled={pending} closeLabel="Close operation details" contentOverflow="auto" height="content" width="standard" kicker="Original operation"
      title={selected ? platformActionLabel(selected.command.action) : "Operation unavailable"} description={selected ? `${platformSubjectLabel(selected.command.subject.ref)} · ${operationStateLabel(selected.state)}` : "The selected operation is no longer in the loaded history. Refresh the workspace to inspect it."}
      actions={<TerasActionButton emphasis="secondary" disabled={pending} onClick={close}>Back to history</TerasActionButton>}>
      {selected ? <TerasFieldStack spacing="normal">
        {error ? <TerasStatusItem label="Operation control" status="Needs attention" detail={error} tone="danger"/> : null}
        <TerasMetadataList columns={2} items={[{label:"Requested",value:operationTime(selected.created_at)},{label:"Updated",value:operationTime(selected.updated_at)},{label:"Receipt",value:selected.provider_operation.receipt ? "Recorded" : "Not issued"},{label:"Effect",value:selected.provider_operation.receipt?.effect ?? "Not confirmed"}]}/>
        <TerasContentTray kicker="Next action" description={selected.next_action.reason}/>
        {selected.provider_operation.release_workflow ? <>
          <TerasMetadataList items={[{label:"Workflow service",value:selected.provider_operation.release_workflow.workflow_id},{label:"Recorded release progress",value:selected.provider_operation.release_workflow.phase.replaceAll("-"," ")},{label:"Desired source state",value:selected.provider_operation.release_workflow.desired_state_verified ? "Verified" : "Not yet verified"}]}/>
          <TerasContentTray description={selected.state === "blocked" ? "Source readback needs attention. Workflow links and progress below retain the original recorded evidence; refresh to confirm current state." : "Source completion and observed runtime health are separate. Environment approval and source merge stay in GitHub."}/>
          <TerasActionRow>
            {selected.provider_operation.release_workflow.run_url ? <TerasActionButton emphasis="secondary" onClick={()=>window.open(selected.provider_operation.release_workflow!.run_url!,"_blank","noopener,noreferrer")}>Open original workflow</TerasActionButton> : null}
            {selected.provider_operation.release_workflow.pull_request_url ? <TerasActionButton emphasis="secondary" onClick={()=>window.open(selected.provider_operation.release_workflow!.pull_request_url!,"_blank","noopener,noreferrer")}>Open source review</TerasActionButton> : selected.provider_operation.release_workflow.branch ? <TerasActionButton emphasis="secondary" onClick={()=>window.open(`https://github.com/mfshaf7/platform-engineering/compare/main...${selected.provider_operation.release_workflow!.branch}?expand=1`,"_blank","noopener,noreferrer")}>Inspect retained source branch</TerasActionButton> : null}
          </TerasActionRow>
        </> : null}
        {selected.provider_operation.failure ? <TerasStatusItem label="Service failure" status="Failed" detail={selected.provider_operation.failure.detail} tone="danger"/> : null}
        {selected.provider_operation.blocker ? <TerasStatusItem label="Blocker" status="Service action needed" detail={selected.provider_operation.blocker.reason} tone="warn"/> : null}
        <TerasTimeline ariaLabel="Operation event history">{selected.provider_operation.events.map(event => <TerasTimelineItem key={event.event_id} label={event.summary} detail={null} status={operationStateLabel(event.state)} displayTimestamp={operationTime(event.occurred_at)} timestamp={event.occurred_at} tone={operationTone(event.state)}
          evidence={<TerasTechnicalDetails summary="Event details" items={[{label:"Event",value:event.event_id},{label:"Sequence",value:String(event.sequence)}]}/>}/>)}</TerasTimeline>
        <TerasTechnicalDetails summary="Operation and receipt details" items={[{label:"Operation",value:selected.operation_id},{label:"Subject",value:selected.command.subject.ref},{label:"Recorded next action",value:`${selected.next_action.authority}: ${selected.next_action.code}`},{label:"Reviewed source",value:selected.command.subject.expected_source_version},{label:"Receipt",value:selected.provider_operation.receipt?.receipt_ref ?? "Not issued"},{label:"Safe log reference",value:selected.provider_operation.safe_log_ref ?? "Not supplied"},{label:"Original command",value:JSON.stringify(selected.command,null,2)},{label:"Source receipt",value:JSON.stringify(selected.provider_operation.receipt,null,2)}]}/>
        <TerasActionRow>
          {onRead ? <TerasActionButton emphasis="secondary" disabled={pending} onClick={() => void read()}>Refresh original operation</TerasActionButton> : null}
          {selected.provider_operation.retryable ? <TerasActionButton disabled={pending || !controlsAvailable} onClick={() => void control(selected.operation_id,"retry")}>Retry operation</TerasActionButton> : null}
          {selected.provider_operation.cancel_available ? <TerasActionButton tone="danger" disabled={pending || !controlsAvailable} onClick={() => setCancelId(selected.operation_id)}>Cancel operation</TerasActionButton> : null}
        </TerasActionRow>
      </TerasFieldStack> : <TerasEmptyState>The original operation is unavailable in the loaded history.</TerasEmptyState>}
    </TerasDialog>
    <TerasDialog open={Boolean(cancelId)} onClose={() => {if(!pending)setCancelId(null);}} closeDisabled={pending} contentOverflow="auto" height="content" width="compact" role="alertdialog" kicker="Cancel original operation" title="Cancel this operation?"
      description={cancelling?.provider_operation.cancel_available ? "Cancellation stops future work. Effects already recorded by the service are retained; cancellation does not prove rollback." : "The operation changed and cancellation is no longer available. Refresh its details."}
      actions={<><TerasActionButton emphasis="secondary" disabled={pending} onClick={() => setCancelId(null)}>Back</TerasActionButton><TerasActionButton tone="danger" disabled={pending || !controlsAvailable || !cancelling?.provider_operation.cancel_available} onClick={() => {if(cancelling)void control(cancelling.operation_id,"cancel");}}>Confirm cancellation</TerasActionButton></>}>
      {cancelling ? <TerasMetadataList items={[{label:"Profile",value:platformSubjectLabel(cancelling.command.subject.ref)},{label:"Action",value:platformActionLabel(cancelling.command.action)}]}/> : null}
    </TerasDialog>
  </>;
}
