"use client";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentRegion, TerasContentTray, TerasLoadingState, TerasPanel, TerasPanelHeader, TerasDialog, TerasDraftCloseGuardDialog, TerasFieldGrid, TerasFieldStack, TerasMetadataList, TerasNoteField, TerasSelectField, TerasTextField } from "@/teras";
import type { ModelOperationsOperatingProjection, ModelProfileRequestDraft, ModelProfileRequestProjection, ModelProfileReviewAction, ModelProfileReviewCommandDraft } from "../../../live-runtime/model-operations-live-types.ts";
import { assertModelProfileReviewCommandDraft } from "../../../live-runtime/model-operations-live-contract.ts";
import { fetchModelProfileFulfillment, fetchModelProfileRequest, ModelProfileOperatorError, submitModelProfileReviewCommand } from "../../../live-runtime/model-profile-operator-client.ts";
import { modelProfileDraftFromRequest, modelProfileReviewActionLabel, modelProfileReviewActions } from "../../../work-model/profile-requests/model-profile-review-model.ts";
import { emptyModelProfileRequestDraft } from "../../../work-model/profile-requests/model-profile-request-model.ts";
import { ModelProfileRequestModal } from "../../workflows/profile-request/model-profile-request-modal.tsx";

import {useModelProfileRequestHistory} from "../../../live-runtime/use-model-profile-request-history.ts";
import {profileRequestSummary} from "../../../work-model/profile-requests/model-profile-history-contract.ts";
import { modelProfileRequestChoice, modelProfileRequestStatusMetadata, modelProfileFulfillmentMetadata } from "./model-profile-request-history-view-model.ts";

import { ModelProfileRequestDetails, ModelProfileRequestEvents } from "./model-profile-request-history-panels.tsx";
import {ModelProfileImplementationPanel} from './model-profile-implementation-panel.tsx';

type Requirement = ModelProfileReviewCommandDraft["requirements"][number];
const newRequirement = (): Requirement => ({ requirement_id: `requirement:console-${crypto.randomUUID()}`, summary: "", owner_repo: "", next_action: "" });

export function ModelProfileRequestHistoryDialog({ open, onClose, initialRequestId, requests, onChanged, onOriginalRead, preview=false }: {
  preview?: boolean; open: boolean; onClose: () => void; initialRequestId: string | null;
  requests: readonly ModelProfileRequestProjection[]; onChanged: () => Promise<unknown>; onOriginalRead?: (request:ModelProfileRequestProjection)=>void;
}) {
  const historyPage=useModelProfileRequestHistory(open,preview);
  const [requestedSelection,setRequestedSelection]=useState<string|null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [recordedAction, setRecordedAction] = useState(false);
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<ModelProfileRequestProjection | null>(null);
  const [action, setAction] = useState<ModelProfileReviewAction | "">("");
  const [reason, setReason] = useState(""), [decisionUri, setDecisionUri] = useState(""), [decisionDigest, setDecisionDigest] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<ModelProfileReviewCommandDraft | null>(null);
  const frozenRef = useRef<ModelProfileReviewCommandDraft | null>(null), definitiveFailure = useRef(false), readSequence = useRef(0);
  const [verified, setVerified] = useState<ModelOperationsOperatingProjection | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false), [revisionDraft, setRevisionDraft] = useState<ModelProfileRequestDraft>(() => emptyModelProfileRequestDraft());
  const [revisionResult, setRevisionResult] = useState<ModelProfileRequestProjection | null>(null);
  const [leaveRequested, setLeaveRequested] = useState(false);

  function remember(value: ModelProfileReviewCommandDraft | null) { frozenRef.current = value; setFrozen(value); }
  function resetReview() { setAction(""); setReason(""); setDecisionUri(""); setDecisionDigest(""); setRequirements([]); }
  async function loadOriginal(id: string) {
    const sequence = ++readSequence.current; setBusy(true); setError(null); setVerified(null); setSelected(null); setRecordedAction(false);
    try {
      const current = preview ? requests.find(request=>request.request_id===id) : await fetchModelProfileRequest(id);
      if(!current)throw new Error("Choose one of the sample requests in this preview.");
      if (sequence !== readSequence.current) return;
      setReference(id); setSelected(current);onOriginalRead?.(current);
      const prior = frozenRef.current;
      if (!prior || definitiveFailure.current || current.history.some(event => event.command_id === prior.commandId) || current.revision !== prior.expectedRevision) {
        remember(null); resetReview(); definitiveFailure.current = false;
      }
    } catch (cause) { if (sequence === readSequence.current) setError(cause instanceof Error ? cause.message : "Original request unavailable."); }
    finally { if (sequence === readSequence.current) setBusy(false); }
  }
  useEffect(() => {
    if (!open) { ++readSequence.current; return; }
    remember(null); resetReview(); setSelected(null); setVerified(null); setError(null); setRevisionOpen(false); setLeaveRequested(false); setReferenceOpen(false); setRecordedAction(false); setRequestedSelection(null);
    const id = initialRequestId ?? (preview ? requests[0]?.request_id : "") ?? ""; setReference(id); if (id) void loadOriginal(id);
    return () => { ++readSequence.current; };
    // The selected record is explicit. Register polling must not replace it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRequestId]);

  function reviewedCommand(revisedIntentDraft: ModelProfileRequestDraft | null = null): ModelProfileReviewCommandDraft {
    if (!selected || !action) throw new Error("Read and select the original request before reviewing an action.");
    return {
      action, commandId: `model-profile-command:console-${crypto.randomUUID()}`, expectedRevision: selected.revision,
      issuedAt: new Date().toISOString(), reason: revisedIntentDraft?.justification.trim() || reason.trim() || null,
      decisionRef: null,
      requirements: action === "request-changes" ? requirements : [], revisedIntentDraft,
    };
  }
  async function execute(command: ModelProfileReviewCommandDraft) {
    if(preview)throw new Error("Design preview does not submit review decisions.");
    if (!selected) throw new Error("Original request is unavailable.");
    try { assertModelProfileReviewCommandDraft(command, selected.request_id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Review input is invalid."); throw cause; }
    setBusy(true); setError(null); setVerified(null); setRecordedAction(false); remember(command); definitiveFailure.current = false;
    try {
      const result = await submitModelProfileReviewCommand(selected.request_id, command);
      setSelected(result); remember(null); resetReview(); setRecordedAction(true);
      // Canonical action success survives a separate register refresh failure.
      await onChanged().catch(() => undefined);
      await historyPage.refresh();
      return result;
    } catch (cause) {
      definitiveFailure.current = cause instanceof ModelProfileOperatorError && cause.status !== null && cause.status >= 400 && cause.status < 500;
      setError(cause instanceof Error ? cause.message : "Original action outcome is unavailable."); throw cause;
    } finally { setBusy(false); }
  }
  async function checkFulfillment() {
    if (!selected) return; setBusy(true); setError(null); setVerified(null);
    try { setVerified(await fetchModelProfileFulfillment(selected.request_id, selected.revision)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Request implementation could not be verified."); }
    finally { setBusy(false); }
  }
  const reviewDirty=Boolean(reason||decisionUri||decisionDigest||action||requirements.some(row=>row.summary||row.owner_repo||row.next_action));
  function chooseOriginal(id:string){if(!id||busy)return;if(frozen&&id!==selected?.request_id)return;if(reviewDirty&&!frozen)setRequestedSelection(id);else void loadOriginal(id);}
  function close() { if (frozen || reviewDirty) setLeaveRequested(true); else onClose(); }
  const needsDecision = action === "approve" || action === "reject";
  const needsReason = needsDecision || action === "request-changes";
  const canApply = Boolean(selected && action && action !== "revise" && (!needsReason || reason.trim()) && (action !== "request-changes" || (requirements.length && requirements.every(r => r.summary.trim() && r.owner_repo.trim() && r.next_action.trim()))));
  const locked = busy || Boolean(frozen);
  const availableActions = selected ? modelProfileReviewActions(selected) : [];
  const pageRequests=historyPage.page?.requests.map(row=>row.request_id===selected?.request_id?profileRequestSummary(selected):row)??[];
  const listedRequests = selected && !pageRequests.some(r=>r.request_id===selected.request_id) ? [profileRequestSummary(selected),...pageRequests] : pageRequests;
  if (!open) return null;
  return <>
    <TerasDialog busy={busy} busyLabel="Reading or updating profile request…" open title="Manage Requests" kicker="Model Operations" width="wide" height="fill" contentOverflow="hidden" closeDisabled={busy} onClose={close}
      description="Read the original request, record a review or check its implementation. Approval alone does not activate a profile."
      actions={<TerasActionButton disabled={busy} onClick={close} emphasis="secondary">Back to Purpose profiles</TerasActionButton>}>
      <TerasContentRegion fill scroll>
      <TerasFieldStack spacing="normal">
        {preview ? <TerasContentTray kicker="Design preview" description="Sample requests are editable for inspection. Review decisions and implementation checks are disabled." />:null}
        <TerasPanel frame="padded" treatment="neutral" spacing="normal" fit="content">
          <TerasPanelHeader kicker="Requests" title="Choose a request" actions={<TerasActionButton emphasis="secondary" disabled={locked} onClick={()=>setReferenceOpen(value=>!value)}>{referenceOpen?"Hide reference lookup":"Find by reference"}</TerasActionButton>}/>
          <TerasSelectField label="Recorded request" value={selected?.request_id ?? ""} disabled={locked || !listedRequests.length} options={[{value:"",label:listedRequests.length?"Choose a request":"No requests in this list"},...listedRequests.map(r=>({value:r.request_id,label:modelProfileRequestChoice(r)}))]} onValueChange={chooseOriginal} />
          {historyPage.status==='loading'?<TerasLoadingState inline label="Loading profile requests…"/>:null}
          {historyPage.error?<TerasContentTray kicker="Requests unavailable" description={historyPage.error} actions={<TerasActionButton emphasis="secondary" disabled={busy} onClick={()=>void historyPage.refresh()}>Retry requests</TerasActionButton>}/>:null}
          {historyPage.status==='current'?<TerasActionRow layout="split" end={<TerasActionRow><TerasActionButton emphasis="secondary" disabled={historyPage.status!=='current'||!historyPage.hasPrevious} onClick={()=>void historyPage.back()}>Previous requests</TerasActionButton><TerasActionButton emphasis="secondary" disabled={!historyPage.page?.next_cursor} onClick={()=>void historyPage.next()}>Next requests</TerasActionButton></TerasActionRow>}><span>{historyPage.page?.requests.length??0} requests on this page</span></TerasActionRow>:null}
          {referenceOpen||!listedRequests.length?<TerasFieldGrid columns={2} align="end">
            <TerasTextField label="Original request reference" placeholder="Paste a request reference from a previous submission" disabled={locked} value={reference} onValueChange={setReference} />
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy || !reference.trim()} onClick={() => chooseOriginal(reference.trim())}>Read original request</TerasActionButton></TerasActionRow>
          </TerasFieldGrid>:null}
        </TerasPanel>
        {error ? <TerasContentTray kicker={frozen?"Action result needs checking":"Request needs attention"}><p role="alert">{error} {frozen ? "Keep this action unchanged. Read or retry the original before making another decision." : ""}</p></TerasContentTray> : null}
        {busy&&!selected?<TerasLoadingState inline label="Reading the original request…"/>:null}
        {recordedAction?<TerasContentTray kicker="Review recorded" description="The original request and event history now show the recorded action. Profile activation is a separate step."/>:null}
        {selected ? <>
          <TerasFieldGrid columns={2}>
          <ModelProfileRequestDetails request={selected}/>
          <TerasPanel frame="padded" treatment="neutral" spacing="normal" fit="content">
          <TerasPanelHeader kicker="Review" title="Review and implementation" description="Approval records a decision. It does not activate the profile."/>
          <TerasMetadataList items={modelProfileRequestStatusMetadata(selected)}/>
          {availableActions.length?<TerasSelectField label="Review action" disabled={locked} value={action} options={[{value:"",label:"Choose an action"},...availableActions.map(a=>({value:a,label:modelProfileReviewActionLabel(a)}))]} onValueChange={value => { setAction(value as ModelProfileReviewAction|""); setError(null); setRecordedAction(false); setRequirements(value === "request-changes" ? [newRequirement()] : []); }} />:null}
          {action && action !== "revise" ? <>
            <TerasNoteField label={needsReason ? "Review reason" : "Review note (optional)"} value={reason} maxLength={2000} disabled={locked} minimumHeight="short" onValueChange={setReason} />
            {needsDecision ? <TerasContentTray kicker="Decision evidence" description="Your explicit decision and review reason are saved together with this exact request revision. The service records the evidence reference automatically."/> : null}
            {action === "request-changes" ? <>
              {requirements.map((requirement, index) => <TerasFieldGrid columns={3} key={requirement.requirement_id}>
                {([['summary', 'Required change'], ['owner_repo', 'Repository responsible for change'], ['next_action', 'Next move']] as const).map(([field, label]) => <TerasTextField key={field} label={`${label} ${index + 1}`} disabled={locked} value={requirement[field]} maxLength={field === "owner_repo" ? 128 : 1000} onValueChange={value => setRequirements(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r))} />)}
              </TerasFieldGrid>)}
              <TerasActionButton disabled={locked || requirements.length >= 32} emphasis="secondary" onClick={() => setRequirements(rows => [...rows, newRequirement()])}>Add requested change</TerasActionButton>
            </> : null}
            <TerasActionRow><TerasActionButton disabled={preview || busy || !canApply || Boolean(frozen)} onClick={() => { try { void execute(reviewedCommand()).catch(() => undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Review input is invalid."); } }}>Record reviewed action</TerasActionButton></TerasActionRow>
          </> : null}
          {action === "revise" ? <TerasActionRow><TerasActionButton disabled={locked} onClick={() => { setRevisionDraft(modelProfileDraftFromRequest(selected)); setRevisionResult(null); setRevisionOpen(true); }}>Edit original intent</TerasActionButton></TerasActionRow> : null}
          {frozen ? <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy} onClick={()=>void loadOriginal(selected.request_id)}>Check original action</TerasActionButton><TerasActionButton disabled={busy} onClick={() => void execute(frozen).catch(() => undefined)}>Retry original reviewed action</TerasActionButton></TerasActionRow> : null}
          {selected.review_state === "approved" && selected.fulfillment_state === "applied"?<TerasActionRow><TerasActionButton emphasis="secondary" disabled={preview || busy || Boolean(frozen)} onClick={() => void checkFulfillment()}>Verify implementation</TerasActionButton></TerasActionRow>:null}
          {verified ? <TerasMetadataList items={modelProfileFulfillmentMetadata(verified)} /> : null}
          </TerasPanel>
          </TerasFieldGrid>
          <ModelProfileImplementationPanel key={selected.request_id} request={selected} preview={preview} previewSecurity={historyPage.previewPolicy(selected)} onChanged={result=>{if(result)setSelected(result);void loadOriginal(selected.request_id);}}/>
          <ModelProfileRequestEvents request={selected}/>
        </> : null}
      </TerasFieldStack>
      </TerasContentRegion>
    </TerasDialog>
    <ModelProfileRequestModal preview={preview} open={revisionOpen} mode="revise" draft={revisionDraft} result={revisionResult} pending={busy} error={error} retainedEnvironments={selected?.request.profile_intent.requested_environments}
      onClose={() => setRevisionOpen(false)} onRecover={() => { setRevisionOpen(false); if (selected) void loadOriginal(selected.request_id); }}
      onUpdateDraft={(key, value) => setRevisionDraft(current => ({ ...current, [key]: value }))}
      onSubmit={async () => { try { const result = await execute(frozen ?? reviewedCommand(revisionDraft)); setRevisionResult(result); } catch (cause) { setRevisionOpen(false); throw cause; } }} />
    <TerasDraftCloseGuardDialog open={leaveRequested||requestedSelection!==null} kicker="Original request" title={requestedSelection?"Discard this review draft?":"Leave this review?"} description={requestedSelection?"The unsaved review reason, decision evidence and requested changes will be discarded. The recorded request remains unchanged.":"The original request and any accepted service action remain recorded. Leaving does not cancel an unknown outcome. Recover the same request when returning."} leaveLabel={requestedSelection?"Discard draft":"Leave"} onKeepEditing={() => {setLeaveRequested(false);setRequestedSelection(null);}} onLeave={() => {setLeaveRequested(false);const id=requestedSelection;setRequestedSelection(null);if(id)void loadOriginal(id);else onClose();}} />
  </>;
}
