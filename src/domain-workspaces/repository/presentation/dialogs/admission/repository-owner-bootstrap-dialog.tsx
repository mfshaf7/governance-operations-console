"use client";
import {readRegisterWindow} from '../../../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../../../console-integration/registers/use-register-page-size.ts';
import { useEffect, useRef, useState } from "react";
import { TerasRegisterPagination, TerasActionButton, TerasActionRow, TerasContentTray, TerasDraftCloseGuardDialog, TerasFieldStack, TerasList, TerasMetadataList, TerasModalShell, TerasNoteField, TerasSelectField, TerasSignalItem, TerasTechnicalDetails, TerasTextField, TerasLoadingState } from "@/teras";
import { SourceAuthorizationPanel } from "../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import type { OwnerBootstrapSummary } from "../../../live-runtime/repository-bootstrap-contract.ts";

type Check = { original?: Record<string, unknown>; kind: string; name: string; executable: string; args: string; fidelity: string; binding: string; cases: string; timeout: string };
const emptyCheck = (): Check => ({ kind: "", name: "", executable: "", args: "", fidelity: "", binding: "", cases: "", timeout: "120" });
const requestType = (record: OwnerBootstrapSummary) => record.operation === "configure-verification" ? "Application verification" : "Repository setup";
const requestState = (record: OwnerBootstrapSummary) => ({ prepared: "Ready to begin", "existing-controls-inspected": "Controls checked", "source-work": "In progress", "source-created": "Changes prepared", succeeded: "Completed", cancelled: "Cancelled" })[record.state] ?? record.state;
const base = "/api/repository-owner-bootstrap", options = (values: string[]) => [{ value: "", label: "Select explicitly" }, ...values.map(value => ({ value, label: value }))];
class RepositorySetupError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly outcomeUnknown = false) { super(message); }
}
async function api(path: string, input?: unknown,signal?:AbortSignal): Promise<unknown> {
  const write = input !== undefined;
  try {
    // Allow the owner's 12s read / 120s command budget plus transport time.
    // Ending the browser wait does not cancel an accepted owner operation.
    const response = await fetch(path, { cache: "no-store", signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(write ? 135_000 : 15_000)]) : AbortSignal.timeout(write ? 135_000 : 15_000), ...(write ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}) });
    const body = await response.json();
    if (!response.ok || body.mode !== "live" || body.error) throw new RepositorySetupError(body.error ?? "Repository setup is unavailable.", response.status >= 500 || [408, 429].includes(response.status), write && (response.status >= 500 || [408, 429].includes(response.status)));
    return body.projection;
  } catch (error) {
    if (error instanceof RepositorySetupError) throw error;
    throw new RepositorySetupError(write ? "The response was interrupted. The service may still be working. Check the original request before continuing." : "The service did not respond. Retry loading this section.", true, write);
  }
}
const actionFeedback: Record<string, [string, string]> = {
  load: ["Loading repository requests…", "Repository requests loaded."],
  eligibility: ["Loading the current verification plan…", "Current verification plan loaded."],
  prepare: ["Preparing changes for review…", "Changes are ready for review. Nothing has been applied."],
  create: ["Saving the setup request…", "Request saved. Continue with the action shown below."],
  draft: ["Loading the proposed files…", "Files loaded. Review their contents before accepting."],
  accept: ["Recording your approval…", "File approval status updated."],
  session: ["Starting repository setup…", "Setup session status updated."],
  "existing-checkout": ["Verifying the repository checkout…", "Repository checkout checked."],
  recover: ["Checking the original source operation…", "Original source operation checked."],
  publish: ["Validating files and publishing the pull request…", "Publication status updated."],
  review: ["Recording the pull request review…", "Review status updated."],
  merge: ["Merging the reviewed pull request…", "Merge status updated."],
  close: ["Verifying completion and closing source access…", "Completion status updated."],
  "cancel-unapplied": ["Withdrawing the unapplied request…", "Withdrawal status updated."],
};
export function RepositoryOwnerBootstrapDialog({ ownerRepo, custodyRequestId, operation = "bootstrap", returnLabel = "Back to Repository", onClose }: { ownerRepo: string; custodyRequestId: string; operation?: "bootstrap" | "configure-verification"; returnLabel?: string; onClose: () => void }) {
  type HistoryPosition={cursor:string|null;offset:number};
  const {pageSize}=useRegisterPageSize("Repository setup requests");
  const lastPageSize=useRef(pageSize);
  const [history,setHistory]=useState<{position:HistoryPosition;previous:HistoryPosition[];nextCursor:string|null;pagingAvailable:boolean}>({position:{cursor:null,offset:0},previous:[],nextCursor:null,pagingAvailable:false});
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [records, setRecords] = useState<OwnerBootstrapSummary[] | null>(null), [current, setCurrent] = useState<OwnerBootstrapSummary | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [pendingAction, setPendingAction] = useState("load"), [notice, setNotice] = useState<string | null>(null), [needsRefresh, setNeedsRefresh] = useState(false);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [edited, setEdited] = useState(false), [leaveOpen, setLeaveOpen] = useState(false);
  function requestClose() { if (pending) return; if (edited && !current) setLeaveOpen(true); else onClose(); }
  const active = operation === "configure-verification";
  const [existingProfile, setExistingProfile] = useState<Record<string, unknown> | null>(null);
  const [verificationMode, setVerificationMode] = useState("manual"), [manual, setManual] = useState([{ action: "", expected: "" }]);
  const [ci, setCi] = useState("no"), [checks, setChecks] = useState<Check[]>([emptyCheck()]);
  const [prepared, setPrepared] = useState<{ intent: Record<string, unknown>; result: Record<string, unknown> } | null>(null), [workflowApproved, setWorkflowApproved] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null), [sourceIntent, setSourceIntent] = useState<string | null>(null), [reason, setReason] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const lock = useRef(false), mounted = useRef(true);
  const acceptedCreate = useRef<Record<string, unknown> | null>(null);
  const acceptedCommands = useRef(new Map<string, Record<string, unknown>>());
  async function run(action: string, operation: () => Promise<unknown>) {
    if (lock.current) return; lock.current = true; setPending(true); setPendingAction(action); setNotice(null); setError(null); setRetryable(false);
    try { await operation(); if (mounted.current) { setNeedsRefresh(false); setNotice(["load", "eligibility"].includes(action) ? null : actionFeedback[action]?.[1] ?? null); } }
    catch (error) { if (mounted.current) { setError(error instanceof Error ? error.message : "Repository setup is unavailable."); setRetryable(error instanceof RepositorySetupError && error.retryable); if (error instanceof RepositorySetupError && error.outcomeUnknown) setNeedsRefresh(true); } }
    finally { lock.current = false; if (mounted.current) setPending(false); }
  }
  async function refresh(target:HistoryPosition={cursor:null,offset:0},previous:HistoryPosition[] = []) {
    setHistoryError(null);
    let page:{records:OwnerBootstrapSummary[];pendingRequest:OwnerBootstrapSummary|null;nextCursor?:string|null;historyPagingAvailable?:boolean};
    try {
      let metadata:typeof page|null=null;const signal=AbortSignal.timeout(15000);
      const window=await readRegisterWindow({cursor:target.cursor,pageSize,scope:ownerRepo,signal,identity:(row:OwnerBootstrapSummary)=>row.requestId,readPage:async cursor=>{
        const next=await api(`${base}/requests?${new URLSearchParams({owner_repo:ownerRepo,...(cursor?{cursor}:{})})}`,undefined,signal) as typeof page;
        metadata=next;return {rows:next.records,nextCursor:next.nextCursor??null};
      }});
      page={...metadata!,records:window.rows,nextCursor:window.nextCursor};
    }
    catch(error){if(mounted.current)setHistoryError(error instanceof Error?error.message:"Request history unavailable.");throw error;}
    if (!mounted.current) return;
    setRecords(page.records);setHistory({position:target,previous,nextCursor:page.nextCursor ?? null,pagingAvailable:page.historyPagingAvailable===true}); setPendingOwner(page.pendingRequest?.requestId ?? null);
    if (!current && page.pendingRequest) setCurrent(await api(`${base}/requests/${encodeURIComponent(page.pendingRequest.requestId)}`) as OwnerBootstrapSummary);
    else if (current) setCurrent(await api(`${base}/requests/${encodeURIComponent(current.requestId)}`) as OwnerBootstrapSummary);
    return page;
  }
  async function reload() {
    const page = await refresh();
    if (active && page && !page.pendingRequest && !current && !existingProfile) await inspectCurrent();
  }
  useEffect(() => { mounted.current = true; void run("load", reload); return () => { mounted.current = false; }; }, [ownerRepo, custodyRequestId]); // owner-scoped modal; durable truth is OOS.
  useEffect(()=>{if(!pending&&lastPageSize.current!==pageSize){lastPageSize.current=pageSize;void run("load",()=>refresh());}},[pageSize,pending]);
  function invalidate() { setEdited(true); setPrepared(null); setWorkflowApproved(false); acceptedCreate.current = null; }
  function updateCheck(index: number, field: keyof Check, value: string) { invalidate(); setChecks(values => values.map((item, at) => at === index ? { ...item, [field]: value } : item)); }
  function inspection() {
    return { ownerRepo, custodyRequestId, nonce: `review:${crypto.randomUUID()}`, operation,
      applicationMarkers: [], withCi: active ? false : ci === "yes", evidenceProfile: null };
  }
  async function inspectCurrent() {
    const result = await api(`${base}/preparations`, inspection()) as Record<string, unknown>;
    const controls = result.existing_owner_controls as { evidence_profile?: Record<string, unknown> } | undefined;
    if (!controls?.evidence_profile) throw new Error("The active repository’s reviewed verification profile could not be read.");
    if (mounted.current) {
      const profile = controls.evidence_profile, verification = profile.application_verification as { mode?: string; manual_checks?: { action: string; expected_result: string }[] } | undefined;
      setExistingProfile(profile); invalidate(); setEdited(false);
      if (verification?.mode && verification.mode !== "unconfigured") setVerificationMode(verification.mode);
      if (verification?.manual_checks?.length) setManual(verification.manual_checks.map(check => ({ action: check.action, expected: check.expected_result })));
      const automated = (profile.commands as Record<string, unknown>[]).filter(command => command.kind === "tests" && command.scope !== "source-controls");
      if (automated.length) setChecks(automated.map(command => ({ ...emptyCheck(), original: { ...command }, timeout: String(command.timeout_seconds), name: String(command.name), executable: String(command.executable), args: (command.args as string[]).join("\n"), fidelity: String(command.fidelity) })));
    }
  }
  function selection() {
    const intent = inspection();
    if (!active) return intent;
    if (!existingProfile) throw new Error("Load the current verification plan first.");
    const inherited = (existingProfile.commands as Record<string, unknown>[]).filter(command => command.kind !== "tests" || command.scope === "source-controls")
      .map(command => ({ ...command, ...(!existingProfile.application_verification && command.kind === "validations" ? { scope: "source-controls" } : {}) }));
    // Keep the owner's independent source controls exactly. Application steps
    // are explicitly selected here; saving the plan does not record a pass.
    return { ...intent, evidenceProfile: { ...existingProfile,
      application_verification: { mode: verificationMode, manual_checks: verificationMode === "automated" ? [] : manual.map((check, i) => ({ id: `manual-${i + 1}`, action: check.action.trim(), expected_result: check.expected.trim() })) },
      commands: [...inherited, ...(verificationMode === "manual" ? [] : checks.map((check, i) => ({ ...check.original, id: check.original?.id ?? `application-${i + 1}`, kind: "tests", name: check.name,
        executable: check.executable, args: check.args.split("\n").filter(Boolean), fidelity: check.fidelity || "pure-unit", conformance_binding: check.original?.conformance_binding ?? "none", timeout_seconds: Number(check.timeout), scope: "application" })))] } };
  }
  async function prepare() { const intent = selection(), result = await api(`${base}/preparations`, intent) as Record<string, unknown>; if (mounted.current) setPrepared({ intent, result }); }
  async function create() {
    if (!prepared) return;
    acceptedCreate.current ??= { preparationIntent: prepared.intent, expectedPreparationDigest: prepared.result.preparation_digest,
      requestId: `bootstrap-request:${crypto.randomUUID()}`, workflowApproved, requestedAt: new Date().toISOString() };
    const result = await api(`${base}/requests`, acceptedCreate.current) as OwnerBootstrapSummary;
    if (mounted.current) { setCurrent(result); setDraft(null); } await refresh();
  }
  async function command(action: string) {
    if (!current) return;
    const commandKey = `${current.requestId}:${action}:${current.revision}:${current.sourceRevision}`;
    const intent = acceptedCommands.current.get(commandKey) ?? { action,
      expectedRevision: ["session", "existing-checkout", "cancel-unapplied"].includes(action) ? current.revision : current.sourceRevision,
      commandId: `owner:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(), sourceIntentRef: sourceIntent,
      acceptedDigest: action === "accept" ? draft?.digest ?? null : null, reason: action === "cancel-unapplied" ? reason : null };
    acceptedCommands.current.set(commandKey, intent);
    const result = await api(`${base}/requests/${encodeURIComponent(current.requestId)}`, intent) as OwnerBootstrapSummary;
    acceptedCommands.current.delete(commandKey);
    if (mounted.current) { setCurrent(result); setDraft(null); }
    await refresh();
  }
  const terminal = current && ["succeeded", "cancelled"].includes(current.state);
  const plan = prepared?.result.plan as Record<string, unknown> | null | undefined;
  const canPrepare = !active || (existingProfile && (verificationMode === "automated" || manual.every(check => check.action.trim() && check.expected.trim())) && (verificationMode === "manual" || checks.every(check => check.name.trim() && check.executable && check.args.trim())));
  const actionFor: Record<string, [string, string]> = {
    "owner-bootstrap-existing-checkout-required": ["existing-checkout", "Verify repository checkout"],
    "owner-bootstrap-existing-checkout-recovery-required": ["existing-checkout", "Recover repository checkout"],
    "owner-bootstrap-authorization-and-start-required": ["session", "Start repository setup"],
    "owner-bootstrap-recovery-required": ["recover", "Check original source operation"],
    "owner-bootstrap-publish-required": ["publish", "Validate and publish changes"],
    "owner-bootstrap-human-review-required": ["review", "Approve reviewed pull request"],
    "owner-bootstrap-merge-required": ["merge", "Merge reviewed pull request"],
    "owner-bootstrap-close-required": ["close", "Verify and finish setup"],
  };
  const next = current ? actionFor[current.nextAction] : null;
  const guidance: Record<string, string> = {
    "owner-bootstrap-existing-checkout-required": "Check the existing controls and prepare the repository checkout. No source change is needed.",
    "owner-bootstrap-existing-checkout-recovery-required": "Check the original checkout operation before continuing.",
    "owner-bootstrap-authorization-and-start-required": "Approve the restricted source access below, then start setup.",
    "owner-bootstrap-draft-acceptance-required": "Open and review the proposed files. Accepting them authorizes only these exact contents.",
    "owner-bootstrap-recovery-required": "The earlier source action needs confirmation. Check that original action; do not start another setup.",
    "owner-bootstrap-publish-required": "Validate the accepted files and publish them as a pull request for review.",
    "owner-bootstrap-human-review-required": "Review the retained pull request. Approval is recorded as the accountable human reviewer for its exact current revision.",
    "owner-bootstrap-merge-required": "Merge the reviewed revision. Any changed source requires another review.",
    "owner-bootstrap-close-required": "Confirm the merged files, close source access and remove temporary work resources. The repository checkout is kept.",
  };
  const pullRequest = Object.values(current?.sourceDelivery ?? {}).find(control => control.pullRequest)?.pullRequest;
  const files = ((draft?.change_set as { operations?: { path: string; content: string }[] } | undefined)?.operations ?? (!current ? plan?.files as { path: string; content: string }[] | undefined : []) ?? []);
  const blocked = pending || needsRefresh;
  return <><TerasModalShell busy={pending} busyLabel={actionFeedback[pendingAction]?.[0] ?? "Loading request…"} width="standard" height="content" bodyLayout="scroll" kicker="Repository" title={active ? "Application verification" : "Repository setup"} surfaceId="repository-owner-bootstrap"
    description={<><strong>{ownerRepo}</strong><br />{active ? "Configure how application behavior will be verified. Review and merge the exact source change; saving a plan does not mean it has passed." : "Prepare source-review controls so development can begin. You do not need application tests or a test plan yet."}</>}
    onClose={requestClose} footer={<TerasActionButton emphasis="secondary" disabled={pending} onClick={requestClose}>{returnLabel}</TerasActionButton>}>
    <TerasFieldStack spacing="loose">
      {error ? <TerasContentTray role="alert" kicker={needsRefresh ? "Outcome not confirmed" : "Unable to complete this action"} description={error}
        actions={retryable || needsRefresh ? <TerasActionButton busy={pending && pendingAction === "load"} disabled={pending} emphasis="secondary" onClick={() => void run("load", reload)}>{needsRefresh ? "Check original request" : "Retry loading"}</TerasActionButton> : undefined} /> : null}
      {notice && !pending ? <TerasContentTray role="status" kicker="Result" description={notice} /> : null}
      {current ? <TerasContentTray kicker="Selected request" title={requestType(current)}>
        <TerasMetadataList items={[{ label: "Status", value: requestState(current) }, { label: "Last updated", value: new Date(current.revision).toLocaleString() }]} />
        {guidance[current.nextAction] ? <p>{guidance[current.nextAction]}</p> : null}
        {pullRequest ? <TerasMetadataList items={[{ label: "Pull request", value: <a href={pullRequest.url} target="_blank" rel="noreferrer">Open pull request</a> }]} /> : null}
        <TerasTechnicalDetails items={[{ label: "Request ID", value: current.requestId }, { label: "Service state", value: current.state }, { label: "Next service action", value: current.nextAction },
          ...Object.entries(current.sourceDelivery).map(([action, control]) => ({ label: action, value: `${control.state} / ${control.command.command_id}` }))]} />
      </TerasContentTray> : null}
      {terminal && !pendingOwner ? <TerasContentTray kicker="New change" description="The selected request is finished. It remains available in Previous requests.">
        <TerasActionButton disabled={blocked} onClick={() => void run("eligibility", async () => { setCurrent(null); setDraft(null); setExistingProfile(null); invalidate(); if (active) await inspectCurrent(); })}>{active ? "Start new verification change" : "Start new setup review"}</TerasActionButton>
      </TerasContentTray> : null}
      {!current && records !== null && !pendingOwner ? <TerasFieldStack spacing="normal">
        {active && !existingProfile ? <>
          {pending ? <TerasLoadingState label="Checking verification eligibility…" detail="Reading current repository authority and its reviewed source controls." />
            : <TerasContentTray kicker="Application verification unavailable"
              description="The service has not confirmed this repository's eligibility. Verification changes require active source-only registration, reviewed controls and approved source access on main. Shared, control and Security-bound repositories use their own reviewed source workflow."
              actions={retryable ? <TerasActionButton emphasis="secondary" onClick={() => void run("eligibility", inspectCurrent)}>Retry eligibility check</TerasActionButton> : undefined} />}
        </> : active ? <>
          <TerasContentTray kicker="Current plan" description="Choose how you will check application behavior. Saving this plan does not run the checks or record a pass. Existing source controls are preserved."
             />
          <TerasSelectField disabled={blocked} label="How will you verify application behavior?" value={verificationMode} onValueChange={value => { invalidate(); setVerificationMode(value); }}
            options={[{ value: "manual", label: "By using the application" }, { value: "automated", label: "Run existing automated tests" }, { value: "mixed", label: "Both manual checks and automated tests" }]} />
          {verificationMode !== "automated" ? <TerasContentTray kicker="Manual checks" description="Describe an action and what should happen. Record real results during acceptance; these are instructions only.">
            <TerasFieldStack spacing="normal">{manual.map((check, index) => <TerasFieldStack key={index} spacing="normal">
              <TerasTextField disabled={blocked} label={`Check ${index + 1}: action`} value={check.action} placeholder="For example: Add a task, then refresh the page" onValueChange={value => { invalidate(); setManual(list => list.map((row, at) => at === index ? { ...row, action: value } : row)); }} />
              <TerasTextField disabled={blocked} label="Expected result" value={check.expected} placeholder="The task is still in the list" onValueChange={value => { invalidate(); setManual(list => list.map((row, at) => at === index ? { ...row, expected: value } : row)); }} />
            </TerasFieldStack>)}
            <TerasActionButton emphasis="secondary" disabled={blocked || manual.length >= 48} onClick={() => { invalidate(); setManual(list => [...list, { action: "", expected: "" }]); }}>Add manual check</TerasActionButton></TerasFieldStack>
          </TerasContentTray> : null}
          {verificationMode !== "manual" ? <TerasContentTray kicker="Existing test commands" description="Use commands that already run your project's tests. This form does not create a test suite or CI workflow.">
            <TerasFieldStack spacing="normal">{checks.map((check, index) => <TerasFieldStack key={index} spacing="normal">
              <TerasTextField disabled={blocked} label={`Test ${index + 1}: name`} value={check.name} onValueChange={value => updateCheck(index, "name", value)} />
              <TerasSelectField disabled={blocked} label="Program" value={check.executable} onValueChange={value => updateCheck(index, "executable", value)} options={options(["git", "node", "npm", "python3"])} />
              <TerasNoteField disabled={blocked} label="Arguments (one per line)" value={check.args} placeholder={"For npm test, enter: test"} onValueChange={value => updateCheck(index, "args", value)} />
              <TerasSelectField disabled={blocked} label="Test environment" value={check.fidelity || "pure-unit"} onValueChange={value => updateCheck(index, "fidelity", value)} options={[{value:"pure-unit",label:"Isolated logic"},{value:"filesystem",label:"Files"},{value:"real-git",label:"Actual Git repository"},{value:"sandbox-runtime",label:"Isolated running application"},{value:"live-backend",label:"Live backend"},{value:"process-crash",label:"Process recovery"}]} />
            </TerasFieldStack>)}
            <TerasActionButton emphasis="secondary" disabled={blocked || checks.length >= 16} onClick={() => { invalidate(); setChecks(list => [...list, emptyCheck()]); }}>Add test command</TerasActionButton></TerasFieldStack>
          </TerasContentTray> : null}
        </> : <TerasContentTray kicker="Start development" description="The system prepares genuine source validation and review controls. Application verification starts as unconfigured and can be added later from this repository. Active registration still needs a PR validation workflow; keep an existing workflow or create source-validation CI below. No application acceptance is granted.">
          <TerasSelectField disabled={blocked} label="Create a source-validation CI workflow?" value={ci} onValueChange={value => { invalidate(); setCi(value); }} options={[{ value: "no", label: "No new workflow" }, { value: "yes", label: "Create the reviewed source-validation workflow" }]} />
        </TerasContentTray>}
        {!active || existingProfile ? <TerasActionButton disabled={blocked || !canPrepare} busy={pending && pendingAction === "prepare"} onClick={() => void run("prepare", prepare)}>{active ? "Review verification change" : "Review source controls"}</TerasActionButton> : null}
        {prepared ? <>
          <TerasContentTray kicker="Review changes" description={plan ? "Only the proposed setup files below will change. Review them before confirming. Application files remain outside this request." : "The existing controls will be checked. No source change or pull request is needed."}><TerasTechnicalDetails items={[{ label: "Preparation digest", value: String(prepared.result.preparation_digest) }]} /></TerasContentTray>
          {plan?.requires_workflow_permission === true ? <TerasSelectField disabled={blocked} label="Separate approval to write this exact CI workflow" value={workflowApproved ? "approved" : ""} onValueChange={value => { acceptedCreate.current = null; setWorkflowApproved(value === "approved"); }} options={[{ value: "", label: "Not approved" }, { value: "approved", label: "Approve the exact displayed workflow file" }]} /> : null}
          <TerasActionButton disabled={blocked || Boolean(plan?.requires_workflow_permission && !workflowApproved)} busy={pending && pendingAction === "create"} onClick={() => void run("create", create)}>{active ? "Confirm verification change" : "Confirm setup request"}</TerasActionButton>
        </> : null}
      </TerasFieldStack> : null}
      {current && !terminal ? <>
        {current.sessionId ? <SourceAuthorizationPanel key={current.requestId} subject={{ kind: "repository-bootstrap", owner_repo: ownerRepo, source_request_id: current.requestId }} sourceStartDigest={current.sourceStartDigest} boundIntentRef={current.sourceIntentRef} onIntentChange={setSourceIntent} /> : null}
        <TerasActionRow>
          {current.draft ? <TerasActionButton disabled={blocked} emphasis="secondary" busy={pending && pendingAction === "draft"} onClick={() => void run("draft", async () => setDraft(await api(`${base}/requests/${encodeURIComponent(current.requestId)}/draft`) as Record<string, unknown>))}>Review proposed files</TerasActionButton> : null}
          {current.nextAction === "owner-bootstrap-draft-acceptance-required" ? <TerasActionButton disabled={blocked || !sourceIntent || draft?.digest !== current.draft?.digest} busy={pending && pendingAction === "accept"} onClick={() => void run("accept", () => command("accept"))}>Accept reviewed files</TerasActionButton> : null}
          {next ? <TerasActionButton disabled={blocked || (["session", "publish", "recover"].includes(next[0]) && !sourceIntent)} busy={pending && pendingAction === next[0]} onClick={() => void run(next[0], () => command(next[0]))}>{next[1]}</TerasActionButton> : null}
        </TerasActionRow>
        {(current.cancellation || current.draft?.state === "draft-ready" || (!current.sessionId && !current.existingCheckout)) ? withdrawOpen || current.cancellation ? <TerasContentTray kicker="Withdraw request" description="Only unapplied changes can be withdrawn. Source access is closed and temporary resources are removed after the service verifies they are safe to retire.">
          {!current.cancellation ? <TerasNoteField label="Withdrawal reason (at least 20 characters)" value={reason} onValueChange={setReason} minimumHeight="short" disabled={blocked} maxLength={4096} /> : null}
          <TerasActionRow spacing="normal">
            {!current.cancellation ? <TerasActionButton disabled={blocked} emphasis="secondary" onClick={() => setWithdrawOpen(false)}>Keep working</TerasActionButton> : null}
            <TerasActionButton disabled={blocked || (!current.cancellation && reason.trim().length < 20)} emphasis="secondary" busy={pending && pendingAction === "cancel-unapplied"} onClick={() => void run("cancel-unapplied", () => command("cancel-unapplied"))}>{current.cancellation ? "Check withdrawal status" : "Withdraw unapplied setup"}</TerasActionButton>
          </TerasActionRow>
        </TerasContentTray> : <TerasActionRow><TerasActionButton disabled={blocked} emphasis="secondary" onClick={() => setWithdrawOpen(true)}>Withdraw request</TerasActionButton></TerasActionRow> : null}
      </> : null}
      {files.map(file => <TerasNoteField key={file.path} label={`Proposed file: ${file.path}`} readOnly value={file.content} onValueChange={() => undefined} minimumHeight="medium" />)}
      <TerasContentTray kicker="Previous requests" description={records === null ? pending ? "Loading previous requests…" : "Previous requests could not be loaded." : records.length ? "Open an earlier setup or verification request to inspect its status or continue unfinished work." : "No previous setup or verification requests."}
        actions={<TerasActionButton disabled={pending} emphasis="secondary" onClick={() => void run("load", () => refresh())}>Refresh requests</TerasActionButton>}>
        {!historyError && records && (records.length > 0 || history.previous.length > 0 || history.nextCursor) ? <TerasRegisterPagination label="Repository setup requests" disabled={blocked} offset={history.position.offset} count={records?.length ?? 0} page={history.previous.length+1}
          pending={pending} unavailable={Boolean(historyError)} hasPrevious={!blocked && history.previous.length>0} hasNext={!blocked && Boolean(history.nextCursor)}
          onPrevious={()=>{const prior=history.previous.at(-1);if(prior)void run("load",()=>refresh(prior,history.previous.slice(0,-1)));}}
          onNext={()=>{if(history.nextCursor)void run("load",()=>refresh({cursor:history.nextCursor,offset:history.position.offset+(records?.length ?? 0)},[...history.previous,history.position]));}} /> : null}
        {records && !history.pagingAvailable ? <TerasContentTray kicker="Recent requests" description="Older request history is unavailable from this source." /> : null}
        {records?.length ? <TerasList frame="contained" scrollHeight="short">
          {records.map(record => <TerasSignalItem key={record.requestId} label={requestType(record)} title={requestState(record)} detail={`Updated ${new Date(record.revision).toLocaleString()}`}
            {...(blocked ? { statusLabel: pending ? "Reading" : "Check original request first" } : { actionLabel: "Open request", ariaLabel: `Open ${requestType(record).toLowerCase()} request ${record.requestId}`, onSelect: () => void run("load", async () => { setCurrent(await api(`${base}/requests/${encodeURIComponent(record.requestId)}`) as OwnerBootstrapSummary); setDraft(null); setSourceIntent(null); }) })}
            tone={record.state === "succeeded" ? "ok" : record.state === "cancelled" ? "muted" : "info"} />)}
        </TerasList> : null}
      </TerasContentTray>
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={leaveOpen} title={active ? "Discard verification draft?" : "Discard setup draft?"} kicker="Unsaved changes" description="This plan has not been submitted. Keep editing, or discard this draft and return to the repository." leaveLabel="Discard Draft" onKeepEditing={() => setLeaveOpen(false)} onLeave={onClose} /></>;
}
