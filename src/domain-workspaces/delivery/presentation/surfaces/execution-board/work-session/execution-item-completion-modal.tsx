"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasDocument, TerasDraftCloseGuardDialog, TerasChoiceGroup, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasSignalItem, TerasList, TerasLoadingState, TerasTextField, TerasTechnicalDetails, TerasEmptyState } from "@/teras";
import { assertCompletionContext, itemPiReview, type CompletedChildEvidence, type ItemPiReview, type ItemCompletionContext, type ItemCompletionEvidence } from "../../../../live-runtime/delivery-item-completion-contract.ts";
import { completionEvidenceFromForm, type CompletionResult } from "../../../../work-model/execution/completion-evidence-form.ts";

const emptyEvidence: ItemCompletionEvidence = { completion_summary: "", changed_surfaces: "", test_result_evidence: "", validation_evidence: "", completion_note: "" };
const fields: { key: keyof ItemCompletionEvidence; label: string; placeholder: string }[] = [
  { key: "completion_summary", label: "Completion summary", placeholder: "Describe what was completed and its outcome." },
  { key: "changed_surfaces", label: "What changed?", placeholder: "Example: Updated the onboarding form so users can choose an existing repository." },
  { key: "test_result_evidence", label: "Test evidence", placeholder: "Describe the tests and their evidence, or explain why tests do not apply." },
  { key: "validation_evidence", label: "Validation evidence", placeholder: "Explain how the outcome was checked against its source, with evidence references." },
  { key: "completion_note", label: "Completion note (optional)", placeholder: "Optional operator note." },
];

export function ExecutionItemCompletionModal({ workItemId, onClose, onOpenSourceSession, onCanonicalChanged }: { workItemId: number; onClose: () => void; onOpenSourceSession?: () => void; onCanonicalChanged?: () => Promise<void> }) {
  const changed = useRef(onCanonicalChanged); changed.current = onCanonicalChanged;
  const effectPending = useRef(false);
  function notifyEffect() { effectPending.current = false; void changed.current?.().catch(() => undefined); }
  const [context, setContext] = useState<ItemCompletionContext | null>(null);
  const [childEvidence, setChildEvidence] = useState<{ revision: string; value: CompletedChildEvidence } | null>(null);
  const [childEvidenceLoading, setChildEvidenceLoading] = useState(false);
  const [childEvidenceError, setChildEvidenceError] = useState<string | null>(null);
  const [childScopeChanged, setChildScopeChanged] = useState(false);
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceRejected, setEvidenceRejected] = useState(false);
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
    setChildEvidence(null); setChildEvidenceError(null);
    setChildScopeChanged(false);
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

  async function findChildEvidence() {
    if (!context || childEvidenceLoading || pending || uncertain) return;
    setChildEvidenceLoading(true);
    setChildEvidenceError(null);
    try {
      const response = await fetch(`${endpoint}?include_completed_child_evidence=true`, { cache: "no-store" });
      if (!response.ok) throw new Error("The approved child evidence could not be loaded.");
      const next = assertCompletionContext((await response.json()).context);
      if (next.work_item_id !== workItemId || next.revision !== context.revision) {
        setChildEvidence(null);
        setChildScopeChanged(true);
        setConfirmed(false);
        throw new Error("The work item changed. Read its current details before adding evidence.");
      }
      if (!next.completed_child_evidence) throw new Error("The approved child evidence is unavailable.");
      setChildEvidence({ revision: next.revision, value: next.completed_child_evidence });
    } catch (failure) {
      setChildEvidenceError(message(failure));
    } finally {
      setChildEvidenceLoading(false);
    }
  }

  function addChildEvidence(line: string) {
    setConfirmed(false);
    setEvidence(current => ({ ...current, changed_surfaces: [current.changed_surfaces.trimEnd(), line].filter(Boolean).join("\n") }));
  }

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
    if (!context || !confirmed || !context.can_complete || uncertain || childScopeChanged) return;
    setPending(true); setError(null); setConfirmed(false); setEvidenceRejected(false);
    try {
      const input = completionEvidenceFromForm(evidence, testResult, validationResult);
      setUncertain(true); effectPending.current = true;
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: input, expectedRevision: context.revision, nonSourceConfirmed: true, route,
          ...(route === "stale-open-close" ? { staleOpenJustification: justification } : {}) }) });
      const body = await response.json();
      if (response.status === 409 && body.code === "delivery_completion_context_changed") {
        effectPending.current = false;
        setUncertain(false);
        setChildEvidence(null);
        setChildScopeChanged(true);
        setError("The work changed since you opened this review. Read the current details and check your draft again.");
        return;
      }
      if (response.status === 422 && body.code === "completion_evidence_invalid") {
        effectPending.current = false;
        setUncertain(false);
        setEvidenceRejected(true);
        setError(body.error ?? "Revise the evidence and confirm it again.");
        return;
      }
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
  const reviewedChildren = childEvidence && childEvidence.revision === context?.revision ? childEvidence.value : null;
  const unavailableChildren = reviewedChildren?.unavailable_child_count ?? 0;
  const feature = context?.completed_child_count !== undefined;
  const complete = context?.status === "done";
  const savedOutcome = context?.recorded_completion;
  return <><TerasModalShell busy={pending} busyLabel="Reading or recording completion…"
    title={feature ? complete ? "Feature Outcome" : "Review Feature Completion" : "Complete Work"}
    kicker="Delivery evidence" description={feature
      ? complete ? "Read the outcome and evidence saved for this Feature." : "Review the completed child work and confirm what the Feature delivered."
      : "Record completed planning, review or other work without file changes. Code and content changes finish through their work session."}
    surfaceId="delivery-item-completion" width="medium" height="content" bodyLayout="scroll" onClose={requestClose}
    footer={<TerasActionRow>
      <TerasActionButton emphasis="secondary" onClick={requestClose} disabled={pending}>Back to Board</TerasActionButton>
      {error && !evidenceRejected || uncertain || childScopeChanged || context?.pi_review && !context.pi_review.review_outcomes?.length ? <TerasActionButton emphasis="secondary" onClick={() => { setEvidenceRejected(false); void read(); }} disabled={pending || childEvidenceLoading}>Read current target</TerasActionButton> : null}
      {!complete ? <TerasActionButton onClick={() => void submit()} disabled={pending || uncertain || childScopeChanged || !context?.can_complete || !confirmed || !valid}>Record completion</TerasActionButton> : null}
    </TerasActionRow>}>
    <TerasFieldStack spacing="loose">
      <TerasPanel spacing="normal" frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Work item" title={context?.subject ?? `Work item #${workItemId}`}
          description={feature ? undefined : "Use this when the work is complete and you can link or describe the result."} />
        {context ? <TerasMetadataList columns={2} items={[
          { label: "Reference", value: `#${workItemId}` }, { label: "Status", value: context.status },
          { label: "Repository", value: context.owner_repo ?? "None recorded" }, { label: "Open work items", value: String(context.open_descendant_count) },
          { label: "Work session", value: context.source_session_active ? "Open" : "None" },
          { label: "Completion evidence", value: context.completion_evidence_valid ? "Confirmed" : "Not yet confirmed" },
          ...(feature ? [{ label: "Completed child items", value: String(context.completed_child_count) }] : []),
        ]} /> : null}
      </TerasPanel>
      {outcome ? <TerasList frame="contained"><TerasSignalItem label="Recorded result" title={outcome}
        detail={feature && complete ? `Feature #${workItemId} is done.` : context?.record_ref ?? "Read the original target."} tone="ok" /></TerasList> : null}
      {feature && complete ? <TerasPanel frame="padded" spacing="normal" treatment="neutral">
        <TerasPanelHeader kicker="Recorded result" title="Saved completion evidence" />
        {savedOutcome && Object.keys(savedOutcome).length ? <TerasDocument ariaLabel="Saved completion evidence"
          content={Object.entries(savedOutcome).map(([heading, value]) => `## ${heading}\n\n${value}`).join("\n\n")} />
          : <TerasEmptyState>The Feature is done. Its saved completion evidence could not be read here.</TerasEmptyState>}
      </TerasPanel> : null}
      {context?.blocking_reasons.length ? <TerasList frame="contained">{context.blocking_reasons.map(reason => <TerasSignalItem key={reason} label="Required before completion" title="Completion unavailable" detail={reason} tone="warn" />)}</TerasList> : null}
      {context?.pi_review && context.status !== "done" ? <TerasPanel spacing="normal" frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Earned objective review" title="Record the actual PI outcome" description="Check the evidence and record the value actually delivered. Completing the objective is a separate step." />
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
        {(!feature || Boolean(context.completed_child_count)) ? (feature ?
          <TerasTechnicalDetails summary="Parent closeout options" items={[]}>
            <TerasSelectField label="Completion type" value={route} disabled={pending || uncertain} onValueChange={value => { setRoute(value); setConfirmed(false); }}
              options={[{ label: "Record the Feature outcome", value: "complete" }, { label: "Close a parent after its child work is finished", value: "stale-open-close" }]} />
          </TerasTechnicalDetails> :
          <TerasSelectField label="Completion type" value={route} disabled={pending || uncertain} onValueChange={value => { setRoute(value); setConfirmed(false); }}
            options={[{ label: "Record this work item’s outcome", value: "complete" }, { label: "Close a parent after its child work is finished", value: "stale-open-close" }]} />) : null}
        {route === "stale-open-close" ? <TerasNoteField label="Why should the parent work be closed?" value={justification} disabled={pending || uncertain}
          placeholder="Explain how the completed child work meets this parent item’s goal."
          onValueChange={value => { setJustification(value); setConfirmed(false); }} /> : null}
        {Boolean(context?.completed_child_count) ? (
          <TerasPanel frame="padded" spacing="normal" treatment="neutral">
            <TerasPanelHeader kicker="Evidence" title="Completed child work"
              description="Find pull requests from finalized child reviews and add the ones that support this Feature’s outcome."
              actions={(!reviewedChildren || unavailableChildren > 0 || childEvidenceError) && !childEvidenceLoading && !childScopeChanged ? (
                <TerasActionButton emphasis="secondary" disabled={pending || uncertain} onClick={() => void findChildEvidence()}>
                  {childEvidenceError || unavailableChildren > 0 ? "Retry loading evidence" : "Find approved evidence"}
                </TerasActionButton>
              ) : undefined} />
            {childEvidenceLoading ? <TerasLoadingState label="Finding approved child evidence…" skeleton="details" /> : null}
            {childEvidenceError ? <TerasEmptyState>{childEvidenceError}</TerasEmptyState> : null}
            {unavailableChildren > 0 ? <TerasEmptyState>Evidence could not be read for {unavailableChildren} completed {unavailableChildren === 1 ? "item" : "items"}. Retry loading or use the links already available.</TerasEmptyState> : null}
            {reviewedChildren && reviewedChildren.matched_child_count + unavailableChildren < reviewedChildren.completed_child_count ? (
              <TerasEmptyState>Some completed children have no finalized pull request link. Add other recorded evidence if it supports this outcome.</TerasEmptyState>
            ) : null}
            {reviewedChildren?.links.length ? <TerasList frame="contained">
              {reviewedChildren.links.map(link => {
                const reference = link.work_items.map(item => `#${item.id}`).join(", ");
                const [, owner, repo, , number] = new URL(link.url).pathname.split("/");
                const pullRequest = `${owner}/${repo} #${number}`;
                const line = `Recorded approved changes for ${reference} in [${pullRequest}](${link.url})`;
                const added = evidence.changed_surfaces.split("\n").some(entry => entry === line);
                return <TerasSignalItem key={link.url} label={reference} textOverflow="wrap"
                  title={<a href={link.url} target="_blank" rel="noopener noreferrer">{`${pullRequest} ↗`}</a>}
                  detail={link.work_items.map(item => item.subject).join(" · ")}
                  actions={<TerasActionButton emphasis="secondary" size="table-compact" disabled={pending || uncertain || added || childScopeChanged}
                    aria-label={`Add evidence from ${pullRequest}`}
                    onClick={() => addChildEvidence(line)}>{added ? "Added" : "Add to What changed?"}</TerasActionButton>}
                />;
              })}
            </TerasList> : null}
          </TerasPanel>
        ) : null}
        {fields.map(field => <TerasFieldStack key={field.key} spacing="compact">
          {field.key === "test_result_evidence" || field.key === "validation_evidence" ? <TerasSelectField
            label={field.key === "test_result_evidence" ? "Test result" : "Validation result"} disabled={pending || uncertain}
            value={field.key === "test_result_evidence" ? testResult : validationResult}
            options={[{ value: "", label: "Choose the observed result" }, { value: "PASS", label: "Passed" }, { value: "FAIL", label: "Failed" },
              ...(field.key === "validation_evidence" ? [{ value: "CHECK", label: "Needs checking" }] : []),
              { value: "NOT APPLICABLE", label: "Not applicable — explain below" }, { value: "Attached artifact", label: "Result recorded in the linked artifact" }]}
            onValueChange={value => { setConfirmed(false); (field.key === "test_result_evidence" ? setTestResult : setValidationResult)(value as CompletionResult); }} /> : null}
          <TerasNoteField label={field.label} placeholder={field.placeholder} value={evidence[field.key]} disabled={pending || uncertain}
            helper={field.key === "changed_surfaces" ? "Put each change on a separate line. If it has a pull request, paste its full URL." : undefined}
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
      {uncertain ? <TerasList frame="contained"><TerasSignalItem label="Original request" title="Check the result before trying again"
        detail="The outcome is not confirmed. Read this same work item; no replacement completion is submitted automatically." tone="warn" /></TerasList> : null}
      {error ? <TerasList frame="contained"><TerasSignalItem label={evidenceRejected ? "Evidence needs changes" : "Completion unavailable"}
        title={evidenceRejected ? "Review the completion evidence" : "The request could not be confirmed"} detail={error} tone="danger" /></TerasList> : null}
    </TerasFieldStack>
  </TerasModalShell>
  <TerasDraftCloseGuardDialog open={closeGuardOpen} title="Leave completion draft?" kicker="Unapplied evidence"
    description={uncertain ? "A service result is not confirmed. Keep the draft and read the original target before retrying; leaving discards these browser inputs." : "This evidence has not been recorded. Leaving discards the draft; the source record is unchanged."}
    leaveLabel="Discard Draft" onKeepEditing={() => { setCloseGuardOpen(false); setLeaveToSource(false); }} onLeave={() => { if (leaveToSource) onOpenSourceSession?.(); else onClose(); }} />
  </>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Completion is unavailable."; }
