"use client";

import { useRef, useState } from "react";
import { TerasActionButton, TerasChoiceGroup, TerasDraftCloseGuardDialog, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasTextField } from "@/teras";
import { fetchOrchestrationStartContext, fetchOriginalOrchestrationRun, OrchestrationStartError, submitOrchestrationStart } from "../../../live-runtime/orchestration-start-client.ts";
import type { OosOrchestrationRun } from "../../../live-runtime/orchestration-live-types.ts";
import { orchestrationInitiativeId, originalOrchestrationRunId, type OrchestrationStartContext, type OrchestrationStartDraft, type OrchestrationStartReceipt } from "../../../work-model/run-start/run-start-model.ts";

const noStartCodes = new Set(["orchestration_start_input_invalid", "orchestration_start_review_expired", "orchestration_start_not_admitted", "orchestration_start_source_changed"]);

export function OrchestrationRunStartDialog({ onClose, onViewRuns, mode = "start" }: {
  onClose: () => void;
  onViewRuns: () => Promise<unknown>;
  mode?: "start" | "recover";
}) {
  const [initiative, setInitiative] = useState("");
  const [purpose, setPurpose] = useState("");
  const [source, setSource] = useState<OrchestrationStartContext | null>(null);
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<OrchestrationStartDraft | null>(null);
  const [receipt, setReceipt] = useState<OrchestrationStartReceipt | null>(null);
  const [originalRef, setOriginalRef] = useState("");
  const [original, setOriginal] = useState<OosOrchestrationRun | null>(null);
  const [leaveRequested, setLeaveRequested] = useState(false);
  const hadUnknownOutcome = useRef(false);
  const locked = pending || Boolean(frozen);

  async function readSource() {
    setPending(true); setError(null); setSource(null); setApproved(false);
    try { setSource(await fetchOrchestrationStartContext(orchestrationInitiativeId(initiative))); }
    catch (cause) { setError(message(cause)); }
    finally { setPending(false); }
  }
  async function start() {
    if (!source || (!frozen && (!approved || !source.startAllowed || !purpose.trim()))) return;
    const draft = frozen ?? { requestId: crypto.randomUUID(), initiativeId: source.initiativeId,
      expectedSourceVersion: source.sourceVersion, purpose, approved: true as const, issuedAt: new Date().toISOString() };
    setFrozen(draft); setOriginalRef(originalOrchestrationRunId(draft.requestId)); setOriginal(null);
    setPending(true); setError(null);
    try { setReceipt(await submitOrchestrationStart(draft)); }
    catch (cause) {
      setError(message(cause));
      // Only a first, explicit pre-dispatch refusal can release this draft.
      // A later refusal cannot erase an earlier unknown owner effect.
      if (!hadUnknownOutcome.current && cause instanceof OrchestrationStartError && noStartCodes.has(cause.code)) {
        setFrozen(null); setSource(null); setApproved(false); setOriginalRef("");
      } else { hadUnknownOutcome.current = true; }
    } finally { setPending(false); }
  }
  async function readOriginal() {
    setPending(true); setError(null);
    try {
      const run = await fetchOriginalOrchestrationRun(originalRef.trim());
      if (frozen && (run.run_id !== originalOrchestrationRunId(frozen.requestId) ||
          run.request_id !== `console-orchestration-request:${frozen.requestId}` ||
          run.source_record_ref !== `openproject://work_packages/${frozen.initiativeId}` || run.source_version_ref !== frozen.expectedSourceVersion)) {
        throw new Error("The returned run does not match this original request and reviewed source.");
      }
      setOriginal(run);
    }
    catch (cause) { setError(message(cause)); }
    finally { setPending(false); }
  }
  function close() {
    if (pending) return;
    if ((!receipt && !original) && (initiative || purpose || frozen)) setLeaveRequested(true);
    else onClose();
  }
  const ownerReceipt = original?.aggregate_receipt && typeof original.aggregate_receipt === "object"
    ? original.aggregate_receipt as Record<string, unknown> : null;
  return <>
    <TerasModalShell title={mode === "recover" ? "Recover original run" : "Start validation readiness run"} kicker="Orchestration" surfaceId="orchestration-run-start"
      width="large" height="content" bodyLayout="scroll" onClose={close}
      description="Review an initiative source and explicitly approve the admitted read-only WGCF validation. OOS owns admission, execution and receipts."
      footer={<>
        <TerasActionButton emphasis="secondary" disabled={pending} onClick={close}>Back to workspace</TerasActionButton>
        {receipt || original ? <TerasActionButton disabled={pending} onClick={() => { setPending(true); void onViewRuns().catch(cause => setError(message(cause))).finally(() => setPending(false)); }}>View Runs</TerasActionButton> : mode === "start" ?
          <TerasActionButton disabled={pending || (!frozen && (!source?.startAllowed || !approved || !purpose.trim()))} onClick={() => void start()}>{pending ? "Contacting owner" : frozen ? "Retry original start" : "Start reviewed run"}</TerasActionButton> : null}
      </>}>
      <TerasFieldStack spacing="normal">
        {mode === "start" ? <TerasPanel frame="padded" treatment="neutral">
          <TerasPanelHeader title="Initiative and purpose" kicker="Current source"
            description="This definition runs workspace-governance smoke validation and WGCF readiness. The selected initiative binds its request and evidence; this action does not complete Delivery work." />
          <TerasFieldStack spacing="normal">
            <TerasTextField label="Delivery initiative" placeholder="ART Epic number" value={initiative} disabled={locked}
              onValueChange={value => { setInitiative(value); setSource(null); setApproved(false); }} />
            <TerasNoteField label="Run purpose" value={purpose} disabled={locked} maxLength={512}
              onValueChange={value => { setPurpose(value); setApproved(false); }} />
            <TerasActionButton disabled={locked || !/^[1-9][0-9]*$/.test(initiative)} emphasis="secondary" onClick={() => void readSource()}>Review current source</TerasActionButton>
          </TerasFieldStack>
        </TerasPanel> : null}
        {source ? <TerasPanel frame="padded" treatment="rail" tone={source.startAllowed ? "warn" : "danger"}>
          <TerasPanelHeader kicker="Explicit operator decision" title={source.title}
            description={source.startAllowed ? "Approval binds this exact source and purpose for fifteen minutes. Admission is not completion." : source.blockers.join(" ")} />
          <TerasMetadataList items={[{ label: "Record", value: source.recordRef }, { label: "Source version", value: source.sourceVersion },
            { label: "Owner projection", value: source.projectionRef }, { label: "Definition", value: "Validation readiness run v1" }]} />
          <TerasChoiceGroup label="Run approval" ariaLabel="Read-only run approval" frame="tray" selectedId={approved ? "approved" : "review"}
            disabled={locked || !source.startAllowed} options={[{ id: "review", label: "Review required", tone: "warn" },
              { id: "approved", label: "I approve this read-only run for the reviewed source and purpose", tone: "ok" }]}
            onSelect={value => setApproved(value === "approved")} />
        </TerasPanel> : null}
        {frozen ? <TerasMetadataList items={[{ label: "Original request", value: frozen.requestId },
          { label: "Original run", value: originalOrchestrationRunId(frozen.requestId) }]} /> : null}
        {receipt ? <TerasPanel frame="padded" treatment="rail" tone="ok"><TerasPanelHeader kicker="OOS acknowledgement"
          title={receipt.duplicate ? "Original run recovered" : "Run admitted"}
          description={receipt.state ? `Owner state: ${receipt.state}.` : "No run projection is available yet. Read the original run as the worker becomes available."} /></TerasPanel> : null}
        <TerasPanel frame="padded" treatment="neutral">
          <TerasPanelHeader title="Recover the original run" kicker="Owner readback" description="Use the same reference after an interrupted response or reload. Reading never creates another run." />
          <TerasFieldStack spacing="normal">
            <TerasTextField label="Original run reference" value={originalRef} disabled={pending || Boolean(frozen)}
              onValueChange={value => { setOriginalRef(value); setOriginal(null); }} />
            <TerasActionButton emphasis="secondary" disabled={pending || !originalRef.trim()} onClick={() => void readOriginal()}>Read original run</TerasActionButton>
            {original ? <TerasMetadataList items={[{ label: "Run", value: original.run_id }, { label: "Owner state", value: original.state },
              { label: "Original request", value: original.request_id }, { label: "Receipt", value: typeof ownerReceipt?.receipt_id === "string" ? ownerReceipt.receipt_id : "No aggregate receipt yet" }]} /> : null}
          </TerasFieldStack>
        </TerasPanel>
        {error ? <p role="alert">{error}{frozen && !receipt ? " Retain this original identity; no replacement run was started automatically." : ""}</p> : null}
      </TerasFieldStack>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={leaveRequested} kicker="Original run" title="Leave this run request?"
      description="Leaving does not cancel an admitted run or resolve an unknown response. Keep its original reference and recover from owner truth."
      onKeepEditing={() => setLeaveRequested(false)} onLeave={() => { setLeaveRequested(false); onClose(); }} />
  </>;
}
function message(cause: unknown) { return cause instanceof Error ? cause.message : "Owner truth is unavailable."; }
