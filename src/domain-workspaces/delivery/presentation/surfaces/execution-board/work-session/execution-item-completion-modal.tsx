"use client";

import { useCallback, useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasChoiceGroup, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasSignalItem, TerasList } from "@/teras";
import { assertCompletionContext, completionEvidence, type ItemCompletionContext, type ItemCompletionEvidence } from "../../../../live-runtime/delivery-item-completion-contract.ts";

const emptyEvidence: ItemCompletionEvidence = { completion_summary: "", changed_surfaces: "", test_result_evidence: "", validation_evidence: "", completion_note: "" };
const fields: { key: keyof ItemCompletionEvidence; label: string; placeholder: string }[] = [
  { key: "completion_summary", label: "Completion summary", placeholder: "Describe the actual completed non-source outcome." },
  { key: "changed_surfaces", label: "Changed outcomes and owner evidence", placeholder: "Explain each domain outcome and its actual owner receipt; source files are not required for non-source work." },
  { key: "test_result_evidence", label: "Test result evidence", placeholder: "- PASS: Actual operating proof, or - NOT APPLICABLE: reason." },
  { key: "validation_evidence", label: "Validation evidence", placeholder: "- PASS: Canonical readback and actual receipt references." },
  { key: "completion_note", label: "Completion note (optional)", placeholder: "Optional operator note." },
];

export function ExecutionItemCompletionModal({ workItemId, onClose }: { workItemId: number; onClose: () => void }) {
  const [context, setContext] = useState<ItemCompletionContext | null>(null);
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [route, setRoute] = useState("complete");
  const [justification, setJustification] = useState("");
  const endpoint = `/api/delivery/execution/${workItemId}/completion`;
  const read = useCallback(async () => {
    setPending(true); setError(null); setConfirmed(false);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || body.mode !== "live") throw new Error(body.error ?? "Non-source completion requires the live broker.");
      const next = assertCompletionContext(body.context);
      if (next.work_item_id !== workItemId) throw new Error("The native read returned another work item.");
      setContext(next);
      setUncertain(false);
      if (next.status === "done") { setOutcome("Canonical completion recovered by read"); setUncertain(false); }
      else setOutcome(null);
    } catch (failure) { setContext(null); setError(message(failure)); }
    finally { setPending(false); }
  }, [endpoint, workItemId]);
  useEffect(() => { void read(); }, [read]);

  async function submit() {
    if (!context || !confirmed || !context.can_complete || uncertain) return;
    setPending(true); setError(null); setConfirmed(false);
    try {
      const input = completionEvidence(evidence);
      setUncertain(true);
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: input, expectedRevision: context.revision, nonSourceConfirmed: true, route,
          ...(route === "stale-open-close" ? { staleOpenJustification: justification } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Completion was not confirmed. Read the original target.");
      const next = assertCompletionContext(body.context);
      if (next.work_item_id !== workItemId || next.status !== "done" || !next.completion_evidence_valid ||
        !["recorded", "already-complete"].includes(body.outcome)) throw new Error("Canonical completion is not confirmed.");
      setContext(next); setUncertain(false);
      setOutcome(body.outcome === "recorded" ? "Completion recorded and read back" : "Canonical item was already complete");
    } catch (failure) { setError(message(failure)); }
    finally { setPending(false); }
  }

  let valid = false;
  try { completionEvidence(evidence); valid = true; } catch { /* The editable draft is not an owner result. */ }
  if (route === "stale-open-close" && (!justification.trim() || !context?.completed_related_count || context.open_child_count !== 0)) valid = false;
  return <TerasModalShell title="Complete non-source work" kicker="Delivery evidence" description="Record an actual non-source outcome through the existing OOS completion path. Source changes use their governed source session."
    surfaceId="delivery-item-completion" width="large" height="content" bodyLayout="scroll" onClose={onClose}
    footer={<TerasActionRow>
      <TerasActionButton emphasis="secondary" onClick={onClose} disabled={pending}>Back to Board</TerasActionButton>
      <TerasActionButton emphasis="secondary" onClick={() => void read()} disabled={pending}>Read current target</TerasActionButton>
      <TerasActionButton onClick={() => void submit()} disabled={pending || uncertain || !context?.can_complete || !confirmed || !valid}>Record non-source completion</TerasActionButton>
    </TerasActionRow>}>
    <TerasFieldStack spacing="loose">
      <TerasPanel frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Canonical target" title={context?.subject ?? `ART work item #${workItemId}`}
          description="OOS remains the work-state, readiness and narrative authority. No branch, source credential or source packet is created here." />
        {context ? <TerasMetadataList columns={2} items={[
          { label: "Record", value: context.record_ref }, { label: "Status", value: context.status },
          { label: "Owner", value: context.owner_repo ?? "Not declared" }, { label: "Open descendants", value: String(context.open_descendant_count) },
          { label: "Source session", value: context.source_session_active ? "Use its existing lifecycle" : "None" },
          { label: "Stored completion evidence", value: context.completion_evidence_valid ? "Valid" : "Not yet confirmed" },
        ]} /> : null}
      </TerasPanel>
      {outcome ? <TerasList frame="contained"><TerasSignalItem label="Canonical result" title={outcome} detail={context?.record_ref ?? "Read the original target."} tone="ok" /></TerasList> : null}
      {context?.blocking_reasons.length ? <TerasList frame="contained">{context.blocking_reasons.map(reason => <TerasSignalItem key={reason} label="Owner prerequisite" title="Completion unavailable" detail={reason} tone="warn" />)}</TerasList> : null}
      {context?.status !== "done" ? <>
        <TerasSelectField label="Completion route" value={route} disabled={pending || uncertain} onValueChange={value => { setRoute(value); setConfirmed(false); }}
          options={[{ label: "Complete a non-source outcome", value: "complete" }, { label: "Reconcile a completed parent (stale-open closeout)", value: "stale-open-close" }]} />
        {route === "stale-open-close" ? <TerasNoteField label="Parent closeout justification" value={justification} disabled={pending || uncertain}
          placeholder="Explain why actual completed child scope satisfies this still-open parent. OOS enforces the existing stale-open contract."
          onValueChange={value => { setJustification(value); setConfirmed(false); }} /> : null}
        {fields.map(field => <TerasNoteField key={field.key} label={field.label} placeholder={field.placeholder} value={evidence[field.key]} disabled={pending || uncertain}
          onValueChange={value => { setConfirmed(false); setEvidence(current => ({ ...current, [field.key]: value })); }} />)}
        <TerasChoiceGroup label="Operator review" ariaLabel="Non-source completion acceptance" frame="tray" selectedId={confirmed ? "confirmed" : "unconfirmed"}
          disabled={pending || uncertain}
          options={[{ label: "Review required", id: "unconfirmed", tone: "warn" }, { label: "I confirm this is completed non-source work with actual owner evidence", id: "confirmed", tone: "ok" }]}
          onSelect={value => setConfirmed(value === "confirmed")} />
      </> : null}
      {uncertain ? <TerasList frame="contained"><TerasSignalItem label="Original target retained" title="Read before another write"
        detail="The outcome is not confirmed. Read this same work item; no replacement completion is submitted automatically." tone="warn" /></TerasList> : null}
      {error ? <TerasList frame="contained"><TerasSignalItem label="Completion unavailable" title="Owner operation stopped" detail={error} tone="danger" /></TerasList> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Completion is unavailable."; }
