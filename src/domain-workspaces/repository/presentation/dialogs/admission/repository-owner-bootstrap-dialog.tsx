"use client";
import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDraftCloseGuardDialog, TerasFieldStack, TerasList, TerasMetadataList, TerasModalShell, TerasNoteField, TerasSelectField, TerasSignalItem, TerasTechnicalDetails, TerasTextField, TerasLoadingState } from "@/teras";
import { SourceAuthorizationPanel } from "../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import type { OwnerBootstrapSummary } from "../../../live-runtime/repository-bootstrap-contract.ts";

type Check = { original?: Record<string, unknown>; kind: string; name: string; executable: string; args: string; fidelity: string; binding: string; cases: string; timeout: string };
const emptyCheck = (): Check => ({ kind: "", name: "", executable: "", args: "", fidelity: "", binding: "", cases: "", timeout: "120" });
const requestType = (record: OwnerBootstrapSummary) => record.operation === "configure-verification" ? "Application verification" : "Repository setup";
const requestState = (record: OwnerBootstrapSummary) => ({ prepared: "Ready to begin", "existing-controls-inspected": "Controls checked", "source-work": "In progress", "source-created": "Changes prepared", succeeded: "Completed", cancelled: "Cancelled" })[record.state] ?? record.state;
const base = "/api/repository-owner-bootstrap", options = (values: string[]) => [{ value: "", label: "Select explicitly" }, ...values.map(value => ({ value, label: value }))];
class RepositorySetupError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}
async function api(path: string, input?: unknown): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store", ...(input === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) });
  const body = await response.json(); if (!response.ok || body.mode !== "live" || body.error) throw new RepositorySetupError(body.error ?? "Repository setup is unavailable.", response.status >= 500 || [408, 429].includes(response.status)); return body.projection;
}
export function RepositoryOwnerBootstrapDialog({ ownerRepo, custodyRequestId, operation = "bootstrap", onClose }: { ownerRepo: string; custodyRequestId: string; operation?: "bootstrap" | "configure-verification"; onClose: () => void }) {
  const [records, setRecords] = useState<OwnerBootstrapSummary[] | null>(null), [current, setCurrent] = useState<OwnerBootstrapSummary | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [edited, setEdited] = useState(false), [leaveOpen, setLeaveOpen] = useState(false);
  function requestClose() { if (pending) return; if (edited && !current) setLeaveOpen(true); else onClose(); }
  const active = operation === "configure-verification";
  const [existingProfile, setExistingProfile] = useState<Record<string, unknown> | null>(null);
  const [verificationMode, setVerificationMode] = useState("manual"), [manual, setManual] = useState([{ action: "", expected: "" }]);
  const [ci, setCi] = useState("no"), [checks, setChecks] = useState<Check[]>([emptyCheck()]);
  const [prepared, setPrepared] = useState<{ intent: Record<string, unknown>; result: Record<string, unknown> } | null>(null), [workflowApproved, setWorkflowApproved] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null), [sourceIntent, setSourceIntent] = useState<string | null>(null), [reason, setReason] = useState("");
  const lock = useRef(false), mounted = useRef(true);
  const acceptedCreate = useRef<Record<string, unknown> | null>(null);
  async function run(operation: () => Promise<unknown>) {
    if (lock.current) return; lock.current = true; setPending(true); setError(null); setRetryable(false);
    try { await operation(); } catch (error) { if (mounted.current) { setError(error instanceof Error ? error.message : "Repository setup is unavailable."); setRetryable(error instanceof RepositorySetupError && error.retryable); } }
    finally { lock.current = false; if (mounted.current) setPending(false); }
  }
  async function refresh() {
    const page = await api(`${base}/requests?owner_repo=${encodeURIComponent(ownerRepo)}`) as { records: OwnerBootstrapSummary[]; pendingRequest: OwnerBootstrapSummary | null };
    if (!mounted.current) return;
    setRecords(page.records); setPendingOwner(page.pendingRequest?.requestId ?? null);
    if (!current && page.pendingRequest) setCurrent(await api(`${base}/requests/${encodeURIComponent(page.pendingRequest.requestId)}`) as OwnerBootstrapSummary);
    else if (current) setCurrent(await api(`${base}/requests/${encodeURIComponent(current.requestId)}`) as OwnerBootstrapSummary);
    return page;
  }
  useEffect(() => { mounted.current = true; void run(async () => { const page = await refresh(); if (active && page && !page.pendingRequest) await inspectCurrent(); }); return () => { mounted.current = false; }; }, [ownerRepo, custodyRequestId]); // owner-scoped modal; durable truth is OOS.
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
    const result = await api(`${base}/requests/${encodeURIComponent(current.requestId)}`, { action,
      expectedRevision: ["session", "existing-checkout", "cancel-unapplied"].includes(action) ? current.revision : current.sourceRevision,
      commandId: `owner:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(), sourceIntentRef: sourceIntent,
      acceptedDigest: action === "accept" ? draft?.digest ?? null : null, reason: action === "cancel-unapplied" ? reason : null }) as OwnerBootstrapSummary;
    if (mounted.current) { setCurrent(result); setDraft(null); }
    await refresh();
  }
  const terminal = current && ["succeeded", "cancelled"].includes(current.state);
  const plan = prepared?.result.plan as Record<string, unknown> | null | undefined;
  const canPrepare = !active || (existingProfile && (verificationMode === "automated" || manual.every(check => check.action.trim() && check.expected.trim())) && (verificationMode === "manual" || checks.every(check => check.name.trim() && check.executable && check.args.trim())));
  const actionFor: Record<string, [string, string]> = {
    "owner-bootstrap-existing-checkout-required": ["existing-checkout", "Verify existing owner checkout"],
    "owner-bootstrap-existing-checkout-recovery-required": ["existing-checkout", "Recover original owner checkout"],
    "owner-bootstrap-authorization-and-start-required": ["session", "Start this approved owner-control session"],
    "owner-bootstrap-recovery-required": ["recover", "Reconcile original accepted source"],
    "owner-bootstrap-publish-required": ["publish", "Validate and publish exact trusted controls"],
    "owner-bootstrap-human-review-required": ["review", "Approve the exact retained PR head as accountable human"],
    "owner-bootstrap-merge-required": ["merge", "Merge the exact reviewed PR"],
    "owner-bootstrap-close-required": ["close", "Verify merge, revoke access and retire owned resources"],
  };
  const next = current ? actionFor[current.nextAction] : null;
  const files = ((draft?.change_set as { operations?: { path: string; content: string }[] } | undefined)?.operations ?? (plan?.files as { path: string; content: string }[] | undefined) ?? []);
  return <><TerasModalShell busy={pending} busyLabel="Reading or updating repository setup…" width="standard" height="content" bodyLayout="scroll" kicker="Repository" title={active ? "Application verification" : "Repository setup"} surfaceId="repository-owner-bootstrap"
    description={<><strong>{ownerRepo}</strong><br />{active ? "Configure how application behavior will be verified. Review and merge the exact source change; saving a plan does not mean it has passed." : "Prepare source-review controls so development can begin. You do not need application tests or a test plan yet."}</>}
    onClose={requestClose} footer={<TerasActionButton emphasis="secondary" disabled={pending} onClick={requestClose}>Back to Repository</TerasActionButton>}>
    <TerasFieldStack spacing="loose">
      {error ? <TerasContentTray kicker="Service action not confirmed" description={error} /> : null}
      {current ? <TerasContentTray kicker="Selected request" title={requestType(current)}>
        <TerasMetadataList items={[{ label: "Status", value: requestState(current) }, { label: "Last updated", value: new Date(current.revision).toLocaleString() }]} />
        <TerasTechnicalDetails items={[{ label: "Request ID", value: current.requestId }, { label: "Service state", value: current.state }, { label: "Next service action", value: current.nextAction },
          ...Object.entries(current.sourceDelivery).map(([action, control]) => ({ label: action, value: `${control.state} / ${control.command.command_id}` }))]} />
      </TerasContentTray> : null}
      {terminal && !pendingOwner ? <TerasContentTray kicker="New change" description="The selected request is finished. It remains available in Previous requests.">
        <TerasActionButton disabled={pending} onClick={() => void run(async () => { setCurrent(null); setDraft(null); setExistingProfile(null); invalidate(); if (active) await inspectCurrent(); })}>{active ? "Start new verification change" : "Start new setup review"}</TerasActionButton>
      </TerasContentTray> : null}
      {!current && records !== null && !pendingOwner ? <>
        {active && !existingProfile ? <>
          {pending ? <TerasLoadingState label="Checking verification eligibility…" detail="Reading current repository authority and its reviewed source controls." />
            : <TerasContentTray kicker="Application verification unavailable"
              description="The service has not confirmed this repository's eligibility. Verification changes require active source-only registration, reviewed controls and approved source access on main. Shared, control and Security-bound repositories use their own reviewed source workflow."
              actions={retryable ? <TerasActionButton emphasis="secondary" onClick={() => void run(inspectCurrent)}>Retry eligibility check</TerasActionButton> : undefined} />}
        </> : active ? <>
          <TerasContentTray kicker="Current plan" description={existingProfile ? `Loaded ${String(existingProfile.profile_id)}. Application verification: ${String((existingProfile.application_verification as {mode?: string} | undefined)?.mode ?? "existing repository plan")}. Source and operating controls are preserved; saving this plan records no passed tests.` : "Read the repository's current plan before changing application checks. Independent controls stay intact."}
             />
          <TerasSelectField label="How will you verify application behavior?" value={verificationMode} onValueChange={value => { invalidate(); setVerificationMode(value); }}
            options={[{ value: "manual", label: "By using the application" }, { value: "automated", label: "Run existing automated tests" }, { value: "mixed", label: "Both manual checks and automated tests" }]} />
          {verificationMode !== "automated" ? <TerasContentTray kicker="Manual checks" description="Describe an action and what should happen. Record real results during acceptance; these are instructions only.">
            <TerasFieldStack spacing="normal">{manual.map((check, index) => <TerasFieldStack key={index} spacing="normal">
              <TerasTextField label={`Check ${index + 1}: action`} value={check.action} placeholder="For example: Add a task, then refresh the page" onValueChange={value => { invalidate(); setManual(list => list.map((row, at) => at === index ? { ...row, action: value } : row)); }} />
              <TerasTextField label="Expected result" value={check.expected} placeholder="The task is still in the list" onValueChange={value => { invalidate(); setManual(list => list.map((row, at) => at === index ? { ...row, expected: value } : row)); }} />
            </TerasFieldStack>)}
            <TerasActionButton emphasis="secondary" disabled={pending || manual.length >= 48} onClick={() => { invalidate(); setManual(list => [...list, { action: "", expected: "" }]); }}>Add manual check</TerasActionButton></TerasFieldStack>
          </TerasContentTray> : null}
          {verificationMode !== "manual" ? <TerasContentTray kicker="Existing test commands" description="Use commands that already run your project's tests. This form does not create a test suite or CI workflow.">
            <TerasFieldStack spacing="normal">{checks.map((check, index) => <TerasFieldStack key={index} spacing="normal">
              <TerasTextField label={`Test ${index + 1}: name`} value={check.name} onValueChange={value => updateCheck(index, "name", value)} />
              <TerasSelectField label="Program" value={check.executable} onValueChange={value => updateCheck(index, "executable", value)} options={options(["git", "node", "npm", "python3"])} />
              <TerasNoteField label="Arguments (one per line)" value={check.args} placeholder={"For npm test, enter: test"} onValueChange={value => updateCheck(index, "args", value)} />
              <TerasSelectField label="Test environment" value={check.fidelity || "pure-unit"} onValueChange={value => updateCheck(index, "fidelity", value)} options={[{value:"pure-unit",label:"Isolated logic"},{value:"filesystem",label:"Files"},{value:"real-git",label:"Actual Git repository"},{value:"sandbox-runtime",label:"Isolated running application"},{value:"live-backend",label:"Live backend"},{value:"process-crash",label:"Process recovery"}]} />
            </TerasFieldStack>)}
            <TerasActionButton emphasis="secondary" disabled={pending || checks.length >= 16} onClick={() => { invalidate(); setChecks(list => [...list, emptyCheck()]); }}>Add test command</TerasActionButton></TerasFieldStack>
          </TerasContentTray> : null}
        </> : <TerasContentTray kicker="Start development" description="The system prepares genuine source validation and review controls. Application verification starts as unconfigured and can be added later from this repository. Active registration still needs a PR validation workflow; keep an existing workflow or create source-validation CI below. No application acceptance is granted.">
          <TerasSelectField label="Create a source-validation CI workflow?" value={ci} onValueChange={value => { invalidate(); setCi(value); }} options={[{ value: "no", label: "No new workflow" }, { value: "yes", label: "Create the reviewed source-validation workflow" }]} />
        </TerasContentTray>}
        {!active || existingProfile ? <TerasActionButton disabled={pending || !canPrepare} onClick={() => void run(prepare)}>{active ? "Review verification change" : "Review source controls"}</TerasActionButton> : null}
        {prepared ? <>
          <TerasMetadataList items={[{ label: "Reviewed preparation digest", value: String(prepared.result.preparation_digest) }, { label: "Source effect", value: plan ? "Finite trusted repository files only; no model invocation" : "Existing controls; no source change or review PR" }]} />
          {plan?.requires_workflow_permission === true ? <TerasSelectField label="Separate approval to write this exact CI workflow" value={workflowApproved ? "approved" : ""} onValueChange={value => { acceptedCreate.current = null; setWorkflowApproved(value === "approved"); }} options={[{ value: "", label: "Not approved" }, { value: "approved", label: "Approve the exact displayed workflow file" }]} /> : null}
          <TerasActionButton disabled={pending || Boolean(plan?.requires_workflow_permission && !workflowApproved)} onClick={() => void run(create)}>Accept this preparation and retain one original request</TerasActionButton>
        </> : null}
      </> : null}
      {current && !terminal ? <>
        {current.sessionId ? <SourceAuthorizationPanel key={current.requestId} subject={{ kind: "repository-bootstrap", owner_repo: ownerRepo, source_request_id: current.requestId }} sourceStartDigest={current.sourceStartDigest} boundIntentRef={current.sourceIntentRef} onIntentChange={setSourceIntent} /> : null}
        <TerasActionRow>
          {current.draft ? <TerasActionButton disabled={pending} emphasis="secondary" onClick={() => void run(async () => setDraft(await api(`${base}/requests/${encodeURIComponent(current.requestId)}/draft`) as Record<string, unknown>))}>Inspect exact trusted source bytes</TerasActionButton> : null}
          {current.nextAction === "owner-bootstrap-draft-acceptance-required" ? <TerasActionButton disabled={pending || !sourceIntent || draft?.digest !== current.draft?.digest} onClick={() => void run(() => command("accept"))}>Accept this exact inspected source digest</TerasActionButton> : null}
          {next ? <TerasActionButton disabled={pending || (["session", "publish", "recover"].includes(next[0]) && !sourceIntent)} onClick={() => void run(() => command(next[0]))}>{next[1]}</TerasActionButton> : null}
        </TerasActionRow>
        {(current.cancellation || current.draft?.state === "draft-ready" || (!current.sessionId && !current.existingCheckout)) ? <>
          <TerasNoteField label="Reason to withdraw this unapplied setup" value={reason} onValueChange={setReason} maxLength={4096} />
          <TerasActionButton disabled={pending || (!current.cancellation && reason.trim().length < 20)} emphasis="secondary" onClick={() => void run(() => command("cancel-unapplied"))}>{current.cancellation ? "Reconcile original cancellation" : "Cancel only unapplied setup and stop its owned access"}</TerasActionButton>
        </> : null}
      </> : null}
      {files.map(file => <TerasNoteField key={file.path} label={`Inert source: ${file.path}`} readOnly value={file.content} onValueChange={() => undefined} minimumHeight="medium" />)}
      <TerasContentTray kicker="Previous requests" description={records === null ? pending ? "Loading previous requests…" : "Previous requests could not be loaded." : records.length ? "Open an earlier setup or verification request to inspect its status or continue unfinished work." : "No previous setup or verification requests."}
        actions={<TerasActionButton disabled={pending} emphasis="secondary" onClick={() => void run(refresh)}>Refresh requests</TerasActionButton>}>
        {records?.length ? <TerasList frame="contained" scrollHeight="short">
          {records.map(record => <TerasSignalItem key={record.requestId} label={requestType(record)} title={requestState(record)} detail={`Updated ${new Date(record.revision).toLocaleString()}`}
            {...(pending ? { statusLabel: "Reading" } : { actionLabel: "Open request", ariaLabel: `Open ${requestType(record).toLowerCase()} request ${record.requestId}`, onSelect: () => void run(async () => { setCurrent(await api(`${base}/requests/${encodeURIComponent(record.requestId)}`) as OwnerBootstrapSummary); setDraft(null); setSourceIntent(null); }) })}
            tone={record.state === "succeeded" ? "ok" : record.state === "cancelled" ? "muted" : "info"} />)}
        </TerasList> : null}
      </TerasContentTray>
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={leaveOpen} title="Discard verification draft?" kicker="Unsaved changes" description="This plan has not been submitted. Keep editing, or discard this draft and return to the repository." leaveLabel="Discard Draft" onKeepEditing={() => setLeaveOpen(false)} onLeave={onClose} /></>;
}
