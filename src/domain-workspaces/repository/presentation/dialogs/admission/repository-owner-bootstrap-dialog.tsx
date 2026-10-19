"use client";
import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasSelectField, TerasTextField } from "@/teras";
import { SourceAuthorizationPanel } from "../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import type { OwnerBootstrapSummary } from "../../../live-runtime/repository-bootstrap-contract.ts";

type Check = { kind: string; name: string; executable: string; args: string; fidelity: string; binding: string; cases: string; timeout: string };
const emptyCheck = (): Check => ({ kind: "", name: "", executable: "", args: "", fidelity: "", binding: "", cases: "", timeout: "120" });
const base = "/api/repository-owner-bootstrap", options = (values: string[]) => [{ value: "", label: "Select explicitly" }, ...values.map(value => ({ value, label: value }))];
async function api(path: string, input?: unknown): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store", ...(input === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) });
  const body = await response.json(); if (!response.ok || body.mode !== "live" || body.error) throw new Error(body.error ?? "Owner setup is unavailable."); return body.projection;
}
export function RepositoryOwnerBootstrapDialog({ ownerRepo, custodyRequestId, onClose }: { ownerRepo: string; custodyRequestId: string; onClose: () => void }) {
  const [records, setRecords] = useState<OwnerBootstrapSummary[] | null>(null), [current, setCurrent] = useState<OwnerBootstrapSummary | null>(null);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [profileId, setProfileId] = useState(""), [markers, setMarkers] = useState(""), [ci, setCi] = useState(""), [checks, setChecks] = useState<Check[]>([emptyCheck(), emptyCheck()]);
  const [prepared, setPrepared] = useState<{ intent: Record<string, unknown>; result: Record<string, unknown> } | null>(null), [workflowApproved, setWorkflowApproved] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null), [sourceIntent, setSourceIntent] = useState<string | null>(null), [reason, setReason] = useState("");
  const lock = useRef(false), mounted = useRef(true);
  const acceptedCreate = useRef<Record<string, unknown> | null>(null);
  async function run(operation: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setPending(true); setError(null);
    try { await operation(); } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "Owner setup is unavailable."); }
    finally { lock.current = false; if (mounted.current) setPending(false); }
  }
  async function refresh() {
    const page = await api(`${base}/requests?owner_repo=${encodeURIComponent(ownerRepo)}`) as { records: OwnerBootstrapSummary[]; pendingRequest: OwnerBootstrapSummary | null };
    if (!mounted.current) return;
    setRecords(page.records); setPendingOwner(page.pendingRequest?.requestId ?? null);
    if (!current && page.pendingRequest) setCurrent(await api(`${base}/requests/${encodeURIComponent(page.pendingRequest.requestId)}`) as OwnerBootstrapSummary);
    else if (current) setCurrent(await api(`${base}/requests/${encodeURIComponent(current.requestId)}`) as OwnerBootstrapSummary);
  }
  useEffect(() => { mounted.current = true; void run(refresh); return () => { mounted.current = false; }; }, [ownerRepo, custodyRequestId]); // owner-scoped modal; durable truth is OOS.
  function invalidate() { setPrepared(null); setWorkflowApproved(false); acceptedCreate.current = null; }
  function updateCheck(index: number, field: keyof Check, value: string) { invalidate(); setChecks(values => values.map((item, at) => at === index ? { ...item, [field]: value } : item)); }
  function selection() {
    return { ownerRepo, custodyRequestId, nonce: `review:${crypto.randomUUID()}`, applicationMarkers: markers.split("\n").map(value => value.trim()).filter(Boolean), withCi: ci === "yes",
      evidenceProfile: { schema_version: 1, owner_repo: ownerRepo, profile_id: profileId, commands: checks.map((check, index) => ({ id: `check-${index + 1}`, kind: check.kind, name: check.name,
        executable: check.executable, args: check.args.split("\n").filter(Boolean), fidelity: check.fidelity, conformance_binding: check.binding,
        ...(check.cases.trim() ? { conformance_case_ids: check.cases.split("\n").map(value => value.trim()).filter(Boolean) } : {}), timeout_seconds: Number(check.timeout) })) } };
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
  const canPrepare = profileId.trim() && markers.trim() && ci && checks.every(check => check.name.trim() && check.kind && check.executable && check.args.trim() && check.fidelity && check.binding && Number(check.timeout) > 0);
  const actionFor: Record<string, [string, string]> = {
    "owner-bootstrap-existing-checkout-required": ["existing-checkout", "Verify existing owner checkout (no token or PR)"],
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
  return <TerasModalShell width="standard" height="content" bodyLayout="scroll" kicker="Repository Owner Setup" title={ownerRepo} surfaceId="repository-owner-bootstrap"
    description="Current proposed custody → reviewed owner controls → canonical checkout. App building, Inventory admission and runtime activation remain separate. Public synthetic main-source route only."
    onClose={onClose} footer={<TerasActionButton emphasis="secondary" disabled={pending} onClick={onClose}>Back to Intake</TerasActionButton>}>
    <TerasFieldStack spacing="loose">
      {error ? <TerasContentTray kicker="Owner action not confirmed" description={error} /> : null}
      <TerasActionRow><TerasActionButton disabled={pending} onClick={() => void run(refresh)}>Refresh original owner requests</TerasActionButton>
        {records?.map(record => <TerasActionButton key={record.requestId} disabled={pending} emphasis="secondary" onClick={() => void run(async () => { setCurrent(await api(`${base}/requests/${encodeURIComponent(record.requestId)}`) as OwnerBootstrapSummary); setDraft(null); setSourceIntent(null); })}>{record.requestId} / {record.state}</TerasActionButton>)}</TerasActionRow>
      {current ? <TerasMetadataList items={[{ label: "Original request", value: current.requestId }, { label: "State / OOS next action", value: `${current.state} / ${current.nextAction}` },
        { label: "Application / admission / runtime", value: "Not granted by this workflow" }, ...Object.entries(current.sourceDelivery).map(([action, control]) => ({ label: action, value: `${control.state} / ${control.command.command_id}` }))]} /> : null}
      {terminal && !pendingOwner ? <TerasActionButton disabled={pending} emphasis="secondary" onClick={() => { setCurrent(null); setDraft(null); invalidate(); }}>Prepare genuinely new owner inspection (terminal request stays unchanged)</TerasActionButton> : null}
      {!current && records !== null && !pendingOwner ? <>
        <TerasContentTray kicker="Select actual project validation" description="Use the approved project's real commands, cases and fidelity. These are later app checks, not dummy bootstrap acceptance. Each argument and source marker goes on its own line; no shell command is executed by this form." />
        <TerasTextField label="Owner profile id" value={profileId} onValueChange={value => { invalidate(); setProfileId(value); }} />
        <TerasNoteField label="Actual application marker paths (one per line)" value={markers} onValueChange={value => { invalidate(); setMarkers(value); }} />
        <TerasSelectField label="Does this project need optional CI?" value={ci} onValueChange={value => { invalidate(); setCi(value); }} options={[{ value: "", label: "Select explicitly" }, { value: "no", label: "No workflow file" }, { value: "yes", label: "Create the reviewed optional CI workflow" }]} />
        {checks.map((check, index) => <TerasFieldStack key={index} spacing="normal">
          <TerasTextField label={`Check ${index + 1}: purpose/name`} value={check.name} onValueChange={value => updateCheck(index, "name", value)} />
          <TerasSelectField label="Evidence kind" value={check.kind} onValueChange={value => updateCheck(index, "kind", value)} options={options(["tests", "validations", "runtime_and_live", "security_and_trust"])} />
          <TerasSelectField label="Executable" value={check.executable} onValueChange={value => updateCheck(index, "executable", value)} options={options(["git", "node", "npm", "python3"])} />
          <TerasNoteField label="Arguments (one argument per line)" value={check.args} onValueChange={value => updateCheck(index, "args", value)} />
          <TerasSelectField label="Required fidelity" value={check.fidelity} onValueChange={value => updateCheck(index, "fidelity", value)} options={options(["pure-unit", "filesystem", "real-git", "process-crash", "sandbox-runtime", "live-backend"])} />
          <TerasSelectField label="Conformance binding" value={check.binding} onValueChange={value => updateCheck(index, "binding", value)} options={options(["matching-fidelity", "none"])} />
          <TerasNoteField label="Accepted conformance case ids (one per line, where applicable)" value={check.cases} onValueChange={value => updateCheck(index, "cases", value)} />
          <TerasTextField label="Timeout seconds (1–1800)" value={check.timeout} onValueChange={value => updateCheck(index, "timeout", value)} />
        </TerasFieldStack>)}
        <TerasActionRow><TerasActionButton disabled={pending || checks.length >= 16} emphasis="secondary" onClick={() => { invalidate(); setChecks(values => [...values, emptyCheck()]); }}>Add applicable check</TerasActionButton>
          <TerasActionButton disabled={pending || !canPrepare} onClick={() => void run(prepare)}>Inspect exact trusted owner plan</TerasActionButton></TerasActionRow>
        {prepared ? <>
          <TerasMetadataList items={[{ label: "Reviewed preparation digest", value: String(prepared.result.preparation_digest) }, { label: "Source effect", value: plan ? "Finite trusted owner files only; no model invocation" : "Existing controls; no source change, token or dummy PR" }]} />
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
    </TerasFieldStack>
  </TerasModalShell>;
}
