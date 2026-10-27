"use client";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasDialog, TerasDraftCloseGuardDialog, TerasFieldGrid, TerasFieldStack, TerasMetadataList, TerasNoteField, TerasSelectField, TerasTextField } from "@/teras";
import type { ModelOperationsOperatingProjection, ModelProfileRequestDraft, ModelProfileRequestProjection, ModelProfileReviewAction, ModelProfileReviewCommandDraft } from "../../../live-runtime/model-operations-live-types.ts";
import { assertModelProfileReviewCommandDraft } from "../../../live-runtime/model-operations-live-contract.ts";
import { fetchModelProfileFulfillment, fetchModelProfileRequest, ModelProfileOperatorError, submitModelProfileReviewCommand } from "../../../live-runtime/model-profile-operator-client.ts";
import { modelProfileDraftFromRequest, modelProfileReviewActionLabel, modelProfileReviewActions } from "../../../work-model/profile-requests/model-profile-review-model.ts";
import { emptyModelProfileRequestDraft, type ModelProfileRequestStep } from "../../../work-model/profile-requests/model-profile-request-model.ts";
import { ModelProfileRequestModal } from "../../workflows/profile-request/model-profile-request-modal.tsx";

import { modelProfileRequestHistoryMetadata, modelProfileRequirementMetadata, modelProfileFulfillmentMetadata, modelProfileRequestTimelineMetadata } from "./model-profile-request-history-view-model.ts";

type Requirement = ModelProfileReviewCommandDraft["requirements"][number];
const newRequirement = (): Requirement => ({ requirement_id: `requirement:console-${crypto.randomUUID()}`, summary: "", owner_repo: "", next_action: "" });

export function ModelProfileRequestHistoryDialog({ open, onClose, initialRequestId, requests, onChanged }: {
  open: boolean; onClose: () => void; initialRequestId: string | null;
  requests: readonly ModelProfileRequestProjection[]; onChanged: () => Promise<unknown>;
}) {
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
  const [revisionStep, setRevisionStep] = useState<ModelProfileRequestStep>("intent"), [revisionResult, setRevisionResult] = useState<ModelProfileRequestProjection | null>(null);
  const [leaveRequested, setLeaveRequested] = useState(false);

  function remember(value: ModelProfileReviewCommandDraft | null) { frozenRef.current = value; setFrozen(value); }
  function resetReview() { setAction(""); setReason(""); setDecisionUri(""); setDecisionDigest(""); setRequirements([]); }
  async function loadOriginal(id: string) {
    const sequence = ++readSequence.current; setBusy(true); setError(null); setVerified(null); setSelected(null);
    try {
      const current = await fetchModelProfileRequest(id);
      if (sequence !== readSequence.current) return;
      setReference(id); setSelected(current);
      const prior = frozenRef.current;
      if (!prior || definitiveFailure.current || current.history.some(event => event.command_id === prior.commandId) || current.revision !== prior.expectedRevision) {
        remember(null); resetReview(); definitiveFailure.current = false;
      }
    } catch (cause) { if (sequence === readSequence.current) setError(cause instanceof Error ? cause.message : "Original request unavailable."); }
    finally { if (sequence === readSequence.current) setBusy(false); }
  }
  useEffect(() => {
    if (!open) { ++readSequence.current; return; }
    remember(null); resetReview(); setSelected(null); setVerified(null); setError(null); setRevisionOpen(false); setLeaveRequested(false);
    const id = initialRequestId ?? ""; setReference(id); if (id) void loadOriginal(id);
    return () => { ++readSequence.current; };
    // The selected record is explicit. Register polling must not replace it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRequestId]);

  function reviewedCommand(revisedIntentDraft: ModelProfileRequestDraft | null = null): ModelProfileReviewCommandDraft {
    if (!selected || !action) throw new Error("Read and select the original request before reviewing an action.");
    return {
      action, commandId: `model-profile-command:console-${crypto.randomUUID()}`, expectedRevision: selected.revision,
      issuedAt: new Date().toISOString(), reason: revisedIntentDraft?.justification.trim() || reason.trim() || null,
      decisionRef: ["approve", "reject"].includes(action) ? { uri: decisionUri.trim(), digest: decisionDigest.trim() } : null,
      requirements: action === "request-changes" ? requirements : [], revisedIntentDraft,
    };
  }
  async function execute(command: ModelProfileReviewCommandDraft) {
    if (!selected) throw new Error("Original request is unavailable.");
    try { assertModelProfileReviewCommandDraft(command, selected.request_id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Review input is invalid."); throw cause; }
    setBusy(true); setError(null); setVerified(null); remember(command); definitiveFailure.current = false;
    try {
      const result = await submitModelProfileReviewCommand(selected.request_id, command);
      setSelected(result); remember(null); resetReview();
      // Canonical action success survives a separate register refresh failure.
      await onChanged().catch(() => undefined);
      return result;
    } catch (cause) {
      definitiveFailure.current = cause instanceof ModelProfileOperatorError && cause.status !== null && cause.status >= 400 && cause.status < 500;
      setError(cause instanceof Error ? cause.message : "Original action outcome is unavailable."); throw cause;
    } finally { setBusy(false); }
  }
  async function checkFulfillment() {
    if (!selected) return; setBusy(true); setError(null); setVerified(null);
    try { setVerified(await fetchModelProfileFulfillment(selected.request_id, selected.revision)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Request fulfillment is unavailable."); }
    finally { setBusy(false); }
  }
  function close() { if (frozen || reason || decisionUri || decisionDigest || action) setLeaveRequested(true); else onClose(); }
  const needsDecision = action === "approve" || action === "reject";
  const needsReason = needsDecision || action === "request-changes";
  const canApply = Boolean(selected && action && action !== "revise" && (!needsReason || reason.trim()) && (!needsDecision || (decisionUri.trim() && /^sha256:[0-9a-f]{64}$/.test(decisionDigest))) && (action !== "request-changes" || (requirements.length && requirements.every(r => r.summary.trim() && r.owner_repo.trim() && r.next_action.trim()))));
  const locked = busy || Boolean(frozen);
  if (!open) return null;
  return <>
    <TerasDialog open title="Purpose request history" kicker="Model Operations" width="wide" height="fill" contentOverflow="auto" closeDisabled={busy} onClose={close}
      description="Read the original OOS request, record an explicit operator review, and verify its own Platform fulfillment. Approval does not apply registry source or activate a profile."
      actions={<TerasActionButton disabled={busy} onClick={close} emphasis="secondary">Back to Purpose profiles</TerasActionButton>}>
      <TerasFieldStack spacing="normal">
        <TerasSelectField label="Recorded request" value={selected?.request_id ?? ""} disabled={locked} options={requests.map(r => ({ value: r.request_id, label: `${r.request.profile_intent.display_name} · ${r.review_state} / ${r.fulfillment_state} · ${r.request_id}` }))} onValueChange={id => void loadOriginal(id)} />
        <TerasFieldGrid columns={2}>
          <TerasTextField label="Original request reference" disabled={locked} value={reference} onValueChange={value => { ++readSequence.current; setReference(value); setSelected(null); setVerified(null); resetReview(); }} />
          <TerasActionButton disabled={busy || !reference.trim()} onClick={() => void loadOriginal(reference.trim())}>Read original request</TerasActionButton>
        </TerasFieldGrid>
        {error ? <p role="alert">{error} {frozen ? "Retain this exact action; read or retry the original before another decision." : ""}</p> : null}
        {selected ? <>
          <TerasMetadataList items={modelProfileRequestHistoryMetadata(selected)} />
          {selected.requirements.map((r, index) => <TerasMetadataList key={index} items={modelProfileRequirementMetadata(r)} />)}
          <TerasSelectField label="Operator review action" disabled={locked} value={action} options={modelProfileReviewActions(selected).map(a => ({ value: a, label: modelProfileReviewActionLabel(a) }))} onValueChange={value => { setAction(value); setError(null); setRequirements(value === "request-changes" ? [newRequirement()] : []); }} />
          {action && action !== "revise" ? <>
            <TerasNoteField label={needsReason ? "Review reason" : "Review note (optional)"} value={reason} maxLength={2000} disabled={locked} minimumHeight="short" onValueChange={setReason} />
            {needsDecision ? <TerasFieldGrid columns={2}>
              <TerasTextField label="Decision evidence reference" disabled={locked} value={decisionUri} onValueChange={setDecisionUri} />
              <TerasTextField label="Decision evidence digest" disabled={locked} value={decisionDigest} onValueChange={setDecisionDigest} />
            </TerasFieldGrid> : null}
            {action === "request-changes" ? <>
              {requirements.map((requirement, index) => <TerasFieldGrid columns={3} key={requirement.requirement_id}>
                {([['summary', 'Required change'], ['owner_repo', 'Change owner'], ['next_action', 'Next move']] as const).map(([field, label]) => <TerasTextField key={field} label={`${label} ${index + 1}`} disabled={locked} value={requirement[field]} maxLength={field === "owner_repo" ? 128 : 1000} onValueChange={value => setRequirements(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r))} />)}
              </TerasFieldGrid>)}
              <TerasActionButton disabled={locked || requirements.length >= 32} emphasis="secondary" onClick={() => setRequirements(rows => [...rows, newRequirement()])}>Add requested change</TerasActionButton>
            </> : null}
            <TerasActionButton disabled={busy || !canApply || Boolean(frozen)} onClick={() => { try { void execute(reviewedCommand()).catch(() => undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Review input is invalid."); } }}>Record reviewed action</TerasActionButton>
          </> : null}
          {action === "revise" ? <TerasActionButton disabled={locked} onClick={() => { setRevisionDraft(modelProfileDraftFromRequest(selected)); setRevisionResult(null); setRevisionStep("intent"); setRevisionOpen(true); }}>Edit original intent</TerasActionButton> : null}
          {frozen ? <TerasActionButton disabled={busy} onClick={() => void execute(frozen).catch(() => undefined)}>Retry original reviewed action</TerasActionButton> : null}
          <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy || Boolean(frozen) || selected.review_state !== "approved" || selected.fulfillment_state !== "applied"} onClick={() => void checkFulfillment()}>Verify request fulfillment</TerasActionButton></TerasActionRow>
          {verified ? <TerasMetadataList items={modelProfileFulfillmentMetadata(verified)} /> : null}
          <TerasMetadataList items={modelProfileRequestTimelineMetadata(selected)} />
        </> : null}
      </TerasFieldStack>
    </TerasDialog>
    <ModelProfileRequestModal open={revisionOpen} mode="revise" draft={revisionDraft} step={revisionStep} result={revisionResult} pending={busy} error={error} retainedEnvironments={selected?.request.profile_intent.requested_environments}
      onClose={() => setRevisionOpen(false)} onRecover={() => { setRevisionOpen(false); if (selected) void loadOriginal(selected.request_id); }}
      onStepChange={setRevisionStep} onUpdateDraft={(key, value) => setRevisionDraft(current => ({ ...current, [key]: value }))}
      onSubmit={async () => { try { const result = await execute(frozen ?? reviewedCommand(revisionDraft)); setRevisionResult(result); setRevisionStep("receipt"); } catch (cause) { setRevisionOpen(false); throw cause; } }} />
    <TerasDraftCloseGuardDialog open={leaveRequested} kicker="Original request" title="Leave this review?" description="The original request and any accepted owner action remain recorded. Leaving does not cancel an unknown outcome. Recover the same request when returning." onKeepEditing={() => setLeaveRequested(false)} onLeave={() => { setLeaveRequested(false); onClose(); }} />
  </>;
}
