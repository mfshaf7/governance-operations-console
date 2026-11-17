"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasDraftCloseGuardDialog, TerasChoiceGroup, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasSignalItem, TerasList, TerasTextField, TerasTechnicalDetails, TerasEmptyState } from "@/teras";
import { assertCompletionContext, itemPiReview, type ItemPiReview, type ItemCompletionContext, type ItemCompletionEvidence } from "../../../../live-runtime/delivery-item-completion-contract.ts";
import { completionEvidenceFromForm, type CompletionResult } from "../../../../work-model/execution/completion-evidence-form.ts";

const emptyEvidence: ItemCompletionEvidence = { completion_summary: "", changed_surfaces: "", test_result_evidence: "", validation_evidence: "", completion_note: "" };
const fields: { key: keyof ItemCompletionEvidence; label: string; placeholder: string }[] = [
  { key: "completion_summary", label: "Completion summary", placeholder: "Describe what was completed and its outcome." },
  { key: "changed_surfaces", label: "What changed?", placeholder: "Describe each completed change and link its evidence. Use one entry per line." },
  { key: "test_result_evidence", label: "Test evidence", placeholder: "Describe the tests and their evidence, or explain why tests do not apply." },
  { key: "validation_evidence", label: "Validation evidence", placeholder: "Explain how the outcome was checked against its source, with evidence references." },
  { key: "completion_note", label: "Completion note (optional)", placeholder: "Optional operator note." },
];

export function ExecutionItemCompletionModal({ workItemId, onClose, onOpenSourceSession, onCanonicalChanged }: { workItemId: number; onClose: () => void; onOpenSourceSession?: () => void; onCanonicalChanged?: () => Promise<void> }) {
  const changed = useRef(onCanonicalChanged); changed.current = onCanonicalChanged;
  const effectPending = useRef(false);
  function notifyEffect() { effectPending.current = false; void changed.current?.().catch(() => undefined); }
  const [context, setContext] = useState<ItemCompletionContext | null>(null);
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [route, setRoute] = useState("complete");
  const [testResult, setTestResult] = useState<CompletionResult>(""), [validationResult, setValidationResult] = useState<CompletionResult>("");
  const [justification, setJustification] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [piConfirmed, setPiConfirmed] = useState(false);
  const pendingPiDraft = useRef<string | null>(null);
  const pendingPiReview = useRef<ItemPiReview | null>(null);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [leaveToSource, setLeaveToSource] = useState(false);
  const recordedPiDraft = useRef(JSON.stringify(["", "", ""]));
  const dirty = context?.status !== "done" && (
    Object.values(evidence).some(value => value.trim()) || testResult || validationResult || justification.trim() ||
    JSON.stringify([actualValue, reviewOutcome, reviewNote]) !== recordedPiDraft.current
  );
  function requestClose() {
    if (pending) return;
    setLeaveToSource(false);
    if (dirty || uncertain) setCloseGuardOpen(true);
    else onClose();
  }
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || pending || uncertain) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, pending, uncertain]);
  const endpoint = `/api/delivery/execution/${workItemId}/completion`;
  const read = useCallback(async () => {
    setPending(true); setError(null); setConfirmed(false); setPiConfirmed(false);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || body.mode !== "live") throw new Error(body.error ?? "Non-source completion requires the live broker.");
      const next = assertCompletionContext(body.context);
      if (next.work_item_id !== workItemId) throw new Error("The native read returned another work item.");
      setContext(next);
      const expected = pendingPiReview.current;
      if (expected) {
        const recovered = next.pi_review?.actual_business_value === expected.actualBusinessValue && next.pi_review.review_outcome === expected.reviewOutcome;
        setUncertain(!recovered);
        if (recovered) { if (effectPending.current) notifyEffect(); recordedPiDraft.current = pendingPiDraft.current ?? recordedPiDraft.current; pendingPiDraft.current = null; pendingPiReview.current = null; setOutcome("Earned PI review recovered by read; completion remains a separate decision"); }
        return;
      }
      setUncertain(false);
      if (next.status === "done") { if (effectPending.current) notifyEffect(); setOutcome("Canonical completion recovered by read"); setUncertain(false); }
      else setOutcome(null);
    } catch (failure) { setContext(null); setError(message(failure)); }
    finally { setPending(false); }
  }, [endpoint, workItemId]);
  useEffect(() => { void read(); }, [read]);

  function piDraft() {
    if (!/^[0-9]+$/.test(actualValue)) throw new Error("Actual business value must be a non-negative integer.");
    return itemPiReview({ actualBusinessValue: Number(actualValue), reviewOutcome, reviewNote });
  }
  async function submitPi() {
    if (!context?.pi_review?.can_review || !piConfirmed || pending || uncertain) return;
    setPending(true); setError(null); setConfirmed(false); setPiConfirmed(false);
    try {
      const review = piDraft();
      effectPending.current = true; pendingPiReview.current = review; pendingPiDraft.current = JSON.stringify([actualValue, reviewOutcome, reviewNote]); setUncertain(true);
      const response = await fetch(`/api/delivery/execution/${workItemId}/pi-review`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: context.revision, reviewConfirmed: true, review }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "PI review is unconfirmed; read the original target.");
      const next = assertCompletionContext(body.context);
      if (next.work_item_id !== workItemId || next.status !== context.status || next.pi_review?.actual_business_value !== review.actualBusinessValue ||
        next.pi_review.review_outcome !== review.reviewOutcome || !["recorded", "already-recorded"].includes(body.outcome)) throw new Error("PI review readback is unconfirmed.");
      notifyEffect(); setContext(next); pendingPiReview.current = null; setUncertain(false);
      setOutcome("Earned PI review recorded and read back; completion remains a separate decision");
      recordedPiDraft.current = pendingPiDraft.current ?? recordedPiDraft.current; pendingPiDraft.current = null;
    } catch (failure) { setError(message(failure)); }
    finally { setPending(false); }
  }

  async function submit() {
    if (!context || !confirmed || !context.can_complete || uncertain) return;
    setPending(true); setError(null); setConfirmed(false);
    try {
      const input = completionEvidenceFromForm(evidence, testResult, validationResult);
      setUncertain(true); effectPending.current = true;
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: input, expectedRevision: context.revision, nonSourceConfirmed: true, route,
          ...(route === "stale-open-close" ? { staleOpenJustification: justification } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Completion was not confirmed. Read the original target.");
      const next = assertCompletionContext(body.context);
      if (next.work_item_id !== workItemId || next.status !== "done" || !next.completion_evidence_valid ||
        !["recorded", "already-complete"].includes(body.outcome)) throw new Error("Canonical completion is not confirmed.");
      notifyEffect(); setContext(next); setUncertain(false);
      setOutcome(body.outcome === "recorded" ? "Completion recorded and read back" : "Canonical item was already complete");
    } catch (failure) { setError(message(failure)); }
    finally { setPending(false); }
  }

  let valid = false, evidenceIssue: string | null = null;
  try { completionEvidenceFromForm(evidence, testResult, validationResult); valid = true; }
  catch (failure) { if ([evidence.completion_summary, evidence.changed_surfaces, evidence.test_result_evidence, evidence.validation_evidence].every(value => value.trim())) evidenceIssue = message(failure); }
  if (route === "stale-open-close" && (!justification.trim() || !context?.completed_related_count || context.open_child_count !== 0)) valid = false;
  let piValid = false;
  try { piDraft(); piValid = true; } catch { /* Editable values are not native earned review. */ }
  return <><TerasModalShell busy={pending} busyLabel="Reading or recording completion…" title="Complete Work" kicker="Delivery evidence" description="Record completed planning, review or other work without file changes. Code and content changes finish through their work session."
    surfaceId="delivery-item-completion" width="large" height="content" bodyLayout="scroll" onClose={requestClose}
    footer={<TerasActionRow>
      <TerasActionButton emphasis="secondary" onClick={requestClose} disabled={pending}>Back to Board</TerasActionButton>
      {error || uncertain || context?.pi_review && !context.pi_review.review_outcomes?.length ? <TerasActionButton emphasis="secondary" onClick={() => void read()} disabled={pending}>Read current target</TerasActionButton> : null}
      <TerasActionButton onClick={() => void submit()} disabled={pending || uncertain || !context?.can_complete || !confirmed || !valid}>Record completion</TerasActionButton>
    </TerasActionRow>}>
    <TerasFieldStack spacing="loose">
      <TerasPanel spacing="normal" frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Canonical target" title={context?.subject ?? `ART work item #${workItemId}`}
          description="OOS remains the work-state, readiness and narrative authority. No branch, source credential or source packet is created here." />
        {context ? <TerasMetadataList columns={2} items={[
          { label: "Work item", value: `Work item ${workItemId}` }, { label: "Status", value: context.status },
          { label: "Implementation repository", value: context.owner_repo ?? "Not declared" }, { label: "Open work items", value: String(context.open_descendant_count) },
          { label: "Source session", value: context.source_session_active ? "Use its existing lifecycle" : "None" },
          { label: "Stored completion evidence", value: context.completion_evidence_valid ? "Valid" : "Not yet confirmed" },
        ]} /> : null}
      </TerasPanel>
      {outcome ? <TerasList frame="contained"><TerasSignalItem label="Canonical result" title={outcome} detail={context?.record_ref ?? "Read the original target."} tone="ok" /></TerasList> : null}
      {context?.blocking_reasons.length ? <TerasList frame="contained">{context.blocking_reasons.map(reason => <TerasSignalItem key={reason} label="Service prerequisite" title="Completion unavailable" detail={reason} tone="warn" />)}</TerasList> : null}
      {context?.pi_review && context.status !== "done" ? <TerasPanel spacing="normal" frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Earned objective review" title="Record the actual PI outcome" description="Review the completed outcome and evidence. OOS records actual value and its native review outcome; this does not complete the objective." />
        <TerasMetadataList columns={2} items={[
          { label: "Initiative", value: context.pi_review.delivery_id }, { label: "Target PI", value: context.pi_review.target_pi },
          { label: "Planned value", value: String(context.pi_review.planned_business_value ?? "Not recorded") },
          { label: "Recorded actual value", value: String(context.pi_review.actual_business_value ?? "Not recorded") },
          { label: "Recorded review outcome", value: context.pi_review.review_outcome ?? "Not recorded" },
        ]} />
        <TerasFieldStack spacing="normal">
          <TerasTextField label="Actual business value" value={actualValue} disabled={pending || uncertain || !context.pi_review.can_review}
            onValueChange={value => { setActualValue(value); setPiConfirmed(false); }} />
          <TerasSelectField label="PI review outcome" value={reviewOutcome}
            options={[{ value: "", label: "Choose the observed outcome" }, ...(context.pi_review.review_outcomes ?? []).map(value => ({ value, label: value }))]}
            disabled={pending || uncertain || !context.pi_review.can_review} onValueChange={value => { setReviewOutcome(value); setPiConfirmed(false); }} />
          {!context.pi_review.review_outcomes?.length ? <TerasEmptyState>The current outcome choices could not be read from the native form. Read the current target before reviewing it.</TerasEmptyState> : null}
          <TerasNoteField label="PI review evidence note (optional)" value={reviewNote} disabled={pending || uncertain || !context.pi_review.can_review}
            onValueChange={value => { setReviewNote(value); setPiConfirmed(false); }} />
          <TerasChoiceGroup frame="tray" label="PI review acceptance" ariaLabel="Earned PI review acceptance" selectedId={piConfirmed ? "approved" : "review"}
            disabled={pending || uncertain || !context.pi_review.can_review}
            options={[{ id: "review", label: "Review required", tone: "warn" }, { id: "approved", label: "I approve this earned PI review", tone: "ok" }]}
            onSelect={value => setPiConfirmed(value === "approved")} />
          <TerasActionButton disabled={pending || uncertain || !context.pi_review.can_review || !piConfirmed || !piValid} onClick={() => void submitPi()}>Record earned PI review</TerasActionButton>
        </TerasFieldStack>
      </TerasPanel> : null}
      {context?.status !== "done" ? <>
        <TerasSelectField label="Completion route" value={route} disabled={pending || uncertain} onValueChange={value => { setRoute(value); setConfirmed(false); }}
          options={[{ label: "Record completed work", value: "complete" }, { label: "Close a parent whose required work is complete", value: "stale-open-close" }]} />
        {route === "stale-open-close" ? <TerasNoteField label="Parent closeout justification" value={justification} disabled={pending || uncertain}
          placeholder="Explain why actual completed child scope satisfies this still-open parent. OOS enforces the existing stale-open contract."
          onValueChange={value => { setJustification(value); setConfirmed(false); }} /> : null}
        {fields.map(field => <TerasFieldStack key={field.key} spacing="compact">
          {field.key === "test_result_evidence" || field.key === "validation_evidence" ? <TerasSelectField
            label={field.key === "test_result_evidence" ? "Test result" : "Validation result"} disabled={pending || uncertain}
            value={field.key === "test_result_evidence" ? testResult : validationResult}
            options={[{ value: "", label: "Choose the observed result" }, { value: "PASS", label: "Passed" }, { value: "FAIL", label: "Failed" },
              ...(field.key === "validation_evidence" ? [{ value: "CHECK", label: "Needs checking" }] : []),
              { value: "NOT APPLICABLE", label: "Not applicable — explain below" }, { value: "Attached artifact", label: "Result recorded in the linked artifact" }]}
            onValueChange={value => { setConfirmed(false); (field.key === "test_result_evidence" ? setTestResult : setValidationResult)(value as CompletionResult); }} /> : null}
          <TerasNoteField label={field.label} placeholder={field.placeholder} value={evidence[field.key]} disabled={pending || uncertain}
            onValueChange={value => { setConfirmed(false); setEvidence(current => ({ ...current, [field.key]: value })); }} />
        </TerasFieldStack>)}
        {evidenceIssue ? <TerasEmptyState>{evidenceIssue}</TerasEmptyState> : null}
        <TerasChoiceGroup label="Operator review" ariaLabel="Non-source completion acceptance" frame="tray" selectedId={confirmed ? "confirmed" : "unconfirmed"}
          disabled={pending || uncertain}
          options={[{ label: "Review required", id: "unconfirmed", tone: "warn" }, { label: "I confirm this work is complete and the evidence is accurate", id: "confirmed", tone: "ok" }]}
          onSelect={value => setConfirmed(value === "confirmed")} />
      </> : null}
      {context?.source_session_active && onOpenSourceSession ? <TerasActionButton emphasis="secondary" disabled={pending} onClick={() => {
        if (dirty || uncertain) { setLeaveToSource(true); setCloseGuardOpen(true); }
        else onOpenSourceSession();
      }}>Open existing work session</TerasActionButton> : null}
      <TerasTechnicalDetails items={[{ label: "Source record", value: context?.record_ref ?? "Not loaded" }, { label: "Reviewed revision", value: context?.revision ?? "Not loaded" }]} />
      {uncertain ? <TerasList frame="contained"><TerasSignalItem label="Original target retained" title="Read before another write"
        detail="The outcome is not confirmed. Read this same work item; no replacement completion is submitted automatically." tone="warn" /></TerasList> : null}
      {error ? <TerasList frame="contained"><TerasSignalItem label="Completion unavailable" title="Service operation stopped" detail={error} tone="danger" /></TerasList> : null}
    </TerasFieldStack>
  </TerasModalShell>
  <TerasDraftCloseGuardDialog open={closeGuardOpen} title="Leave completion draft?" kicker="Unapplied evidence"
    description={uncertain ? "A service result is not confirmed. Keep the draft and read the original target before retrying; leaving discards these browser inputs." : "This evidence has not been recorded. Leaving discards the draft; the source record is unchanged."}
    leaveLabel="Discard Draft" onKeepEditing={() => { setCloseGuardOpen(false); setLeaveToSource(false); }} onLeave={() => { if (leaveToSource) onOpenSourceSession?.(); else onClose(); }} />
  </>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Completion is unavailable."; }
