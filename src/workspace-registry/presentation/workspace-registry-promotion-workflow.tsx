"use client";
import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasMetadataList, TerasTechnicalDetails, TerasTimeline, TerasTimelineItem, TerasTrayStack, TerasDialog, TerasFieldStack, TerasModalShell, TerasStatusItem } from "@/teras";
import type { WorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type { WorkspaceInventoryResult, WorkspaceRegistryCandidate, WorkspaceRegistryTarget } from "../model/workspace-registry-types";
import { useInventoryRequestJournal } from "../live-runtime/use-inventory-request-journal";
import { WorkspaceRegistryRequestJournal } from "./workspace-registry-request-journal";
import { registryKindLabel, registryNextAction, registryRequestStatus, registryTimestamp } from "./workspace-registry-copy";
import { sameRegistryJson } from "../workspace-registry-instance-contract";

export function WorkspaceRegistryPromotionWorkflow({ candidate, target, fixtureMode, onClose, runtime }: {
  candidate: WorkspaceRegistryCandidate | null; target: WorkspaceRegistryTarget; fixtureMode: boolean;
  onClose: () => void; runtime: WorkspaceRegistryLiveRuntime;
}) {
  const [showResult, setShowResult] = useState(!candidate);
  const [historyOpen, setHistoryOpen] = useState(!candidate);
  const [localError, setLocalError] = useState<string | null>(null);
  const attempted = useRef<string | null>(null);
  const journal = useInventoryRequestJournal("promotion", target, fixtureMode);
  const result = runtime.result;
  const sourceReady = fixtureMode || Boolean(!localError && !runtime.error && candidate && runtime.preparation?.target.record_id === target.record_id &&
    runtime.preparation.intake_entry_ref.digest === candidate.intake_entry_ref.digest &&
    runtime.preparation.intake_entry_ref.version === candidate.intake_entry_ref.version &&
    (runtime.preparation.authority_kind === "internal-instance-record" ? sameRegistryJson(runtime.preparation.candidate, candidate) : runtime.preparation.authority_revision === runtime.snapshot?.authority_revision));
  const candidateKey = candidate ? `${target.record_id}:${candidate.candidate_digest}` : null;

  async function prepare() {
    if (!candidate || fixtureMode || !journal.canStart || runtime.pending || result) return;
    setLocalError(null);
    try { await runtime.prepare(candidate); }
    catch (error) { setLocalError(message(error)); }
  }
  useEffect(() => {
    if (!candidateKey || attempted.current === candidateKey || !journal.canStart || fixtureMode || result) return;
    attempted.current = candidateKey;
    void prepare();
  }, [candidateKey, journal.canStart, fixtureMode, result]);

  async function submit() {
    if (!candidate || fixtureMode || !sourceReady || !journal.canStart || runtime.pending || result) return;
    setLocalError(null);
    try { await runtime.submit(candidate, `workspace-inventory-request:console-${crypto.randomUUID()}`); }
    catch (error) { setLocalError(message(error)); }
    finally { setShowResult(true); void journal.load(); }
  }
  async function recover(requestId: string) {
    if (runtime.pending) return;
    setLocalError(null);
    try { await runtime.read(requestId); setShowResult(true); }
    catch (error) { setLocalError(message(error)); }
  }
  async function control(action: "continue" | "cancel") {
    if (!result || runtime.pending) return;
    setLocalError(null);
    try { if (action === "cancel") await runtime.cancel(result.request_id); else await runtime.continuePromotion(result.request_id); }
    catch (error) { setLocalError(message(error)); }
    finally { void journal.load(); }
  }
  const requestClose = () => { if (!runtime.pending) onClose(); };
  const currentError = fixtureMode ? null : localError ?? runtime.error?.message;
  const actions = <>
    <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={requestClose}>Back to Registry</TerasActionButton>
    {!showResult && candidate ? <TerasActionButton busy={runtime.pending} disabled={fixtureMode || runtime.pending || !sourceReady || !journal.canStart || Boolean(result)} onClick={() => void submit()}>{runtime.pending ? "Please wait…" : "Add to Registry"}</TerasActionButton> : null}
    {showResult && result && canContinue(result.next_action) ? <TerasActionButton disabled={runtime.pending} onClick={() => void control("continue")}>{result.next_action === "review-and-merge" ? "Check Review" : "Continue Request"}</TerasActionButton> : null}
    {candidate && showResult && result && terminal(result.status) ? <TerasActionButton emphasis="secondary" disabled={runtime.pending || !journal.canStart} onClick={() => { runtime.reset(); attempted.current = null; setLocalError(null); setShowResult(false); }}>Review another promotion</TerasActionButton> : null}
  </>;
  if (showResult && candidate) return <TerasDialog busy={runtime.pending} busyLabel="Reading or submitting registration…" open width="standard" height="content" contentOverflow="auto" closeDisabled={runtime.pending} closeLabel="Close modal" onClose={requestClose}
    kicker="Workspace Registry" title={result?.status === "succeeded" ? "Item added to Registry" : result?.status === "accepted" ? "Promotion submitted" : result ? registryRequestStatus(result.status) : "Submission needs attention"}
    description={result ? registryNextAction(result.next_action) : "The request outcome could not be confirmed. Inspect the original request before trying another."} actions={actions}>
    {currentError ? <TerasStatusItem label="Request" status="Needs attention" detail={currentError} tone="danger"/> : null}
    {result ? <PromotionResultPanel result={result} pending={runtime.pending} onCancel={() => void control("cancel")} onRead={() => void recover(result.request_id)}/> : <TerasFieldStack spacing="normal">
      <TerasEmptyState>No confirmed outcome is available. Recover the original request from history.</TerasEmptyState>
      <WorkspaceRegistryRequestJournal journal={journal} disabled={runtime.pending} onReopen={id => void recover(id)}/>
    </TerasFieldStack>}
  </TerasDialog>;
  return <TerasModalShell bodyLayout="scroll" height="content" width="standard"
    title={candidate ? "Review Promotion" : "Promotion History"} kicker="Workspace Registry" surfaceId="workspace-registry-promotion"
    description={candidate ? "Add this approved item to Workspace Registry." : "Open an original request to inspect its outcome."} onClose={requestClose} footer={actions}>
    <TerasFieldStack spacing="loose">
      {candidate ? <>
        <TerasContentTray kicker={registryKindLabel(target.kind)} title={target.name}>
          <TerasMetadataList columns={2} items={[{label:"Responsible repositories",value:candidate.owner_refs.join(", ")},{label:"Approved version",value:String(candidate.intake_entry_ref.version)}]}/>
        </TerasContentTray>
        <TerasStatusItem label="Source" status={fixtureMode ? "Preview" : sourceReady ? "Ready" : runtime.pending ? "Reading" : "Unavailable"}
          detail={currentError ?? (fixtureMode ? "Preview changes are disabled." : journal.canStart ? "Source details are collected automatically." : "Open the pending request before starting another.")} tone={currentError ? "danger" : sourceReady ? "info" : "warn"}/>
        <TerasTechnicalDetails summary="Approval and source details" items={[
          {label:"Record",value:target.record_id},{label:"Candidate digest",value:candidate.candidate_digest},{label:"Intake digest",value:candidate.intake_entry_ref.digest},
          {label:"Authority revision",value:runtime.preparation?.authority_revision ?? (fixtureMode ? "Preview" : "Not read")},
          ...candidate.approval_refs.map((value,index)=>({label:`Approval ${index+1}`,value})),
          {label:"Approved record",value:JSON.stringify(candidate.active_record.value,null,2)},
        ]}/>
        {!fixtureMode ? <TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending || !journal.canStart || Boolean(result)} onClick={() => void prepare()}>Refresh source</TerasActionButton>
          <TerasActionButton emphasis="secondary" onClick={() => setHistoryOpen(current => !current)}>{historyOpen ? "Hide request history" : "Request history"}</TerasActionButton>
        </TerasActionRow> : null}
      </> : currentError ? <TerasStatusItem label="Request" status="Needs attention" detail={currentError} tone="danger"/> : null}
      {!fixtureMode && (historyOpen || (!showResult && Boolean(journal.page?.pending_request_count)) || Boolean(journal.error)) ? <WorkspaceRegistryRequestJournal journal={journal} disabled={runtime.pending} onReopen={id => void recover(id)}/> : null}
      {!candidate ? <PromotionResultPanel result={result} pending={runtime.pending} onCancel={() => void control("cancel")} onRead={() => { if (result) void recover(result.request_id); }}/> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}

function PromotionResultPanel({result,pending,onCancel,onRead}:{result:WorkspaceInventoryResult|null;pending:boolean;onCancel:()=>void;onRead:()=>void}) {
 return <TerasContentTray kicker="Outcome" title={result ? undefined : "Choose a request"}>
  {result?<TerasTrayStack spacing="normal">
    <TerasMetadataList columns={2} items={[{label:"Source review",value:result.authority_kind === "internal-instance-record" ? "Operator approval recorded" : result.review?`#${result.review.number}`:"Not opened"},{label:"Receipt",value:result.receipt?"Recorded":terminal(result.status)?"No receipt issued":"Not issued yet"}]}/>
    {result.failure?<TerasContentTray kicker="Needs attention" description={result.failure.message}/>:null}
    <TerasTimeline ariaLabel="Workspace Inventory promotion history">{result.history.map(event=><TerasTimelineItem key={`${event.sequence}-${event.status}`} label={registryRequestStatus(event.status)} detail={null} status={null} displayTimestamp={registryTimestamp(event.at)} timestamp={event.at} tone={event.status==="succeeded"?"ok":event.status==="blocked"||event.status==="rejected"?"danger":"info"} evidence={<TerasTechnicalDetails summary="Event details" items={[{label:"Sequence",value:String(event.sequence)},{label:"Source status",value:event.status},...(event.details?[{label:"Recorded details",value:JSON.stringify(event.details,null,2)}]:[])]}/>}/>)}</TerasTimeline>
    <TerasTechnicalDetails summary="Request and receipt details" items={[{label:"Request",value:result.request_id},{label:"Receipt",value:result.receipt ? result.receipt.artifact_type === "instance-operational-record-receipt" ? result.receipt.receipt_digest : result.receipt.receipt_id : "No receipt issued"},{label:"Next action code",value:result.next_action},{label:"Request revision",value:String(result.revision)}]}/>
    <TerasActionRow><TerasActionButton emphasis="secondary" disabled={pending} onClick={onRead}>Refresh Original Request</TerasActionButton>{result.review?<TerasActionButton emphasis="secondary" onClick={()=>window.open(result.review!.url,"_blank","noopener,noreferrer")}>Open Review</TerasActionButton>:null}{!terminal(result.status)&&result.cancel_allowed!==false?<TerasActionButton emphasis="secondary" disabled={pending} onClick={onCancel}>Cancel Request</TerasActionButton>:null}</TerasActionRow>
  </TerasTrayStack>:<TerasEmptyState>No request selected.</TerasEmptyState>}
 </TerasContentTray>;
}
const terminal=(status:string)=>["succeeded","cancelled","rejected","blocked","stale"].includes(status);
const canContinue=(action:string)=>["continue","inspect-review-or-cancel","restore-dependency-and-retry","review-and-merge"].includes(action);
function resultTone(result:WorkspaceInventoryResult){if(result.status==="succeeded")return "ok" as const;if(result.failure||["blocked","rejected"].includes(result.status))return "danger" as const;return "info" as const;}
const message=(error:unknown)=>error instanceof Error?error.message:"The promotion could not be read. Refresh the current source.";
