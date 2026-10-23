"use client";

import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack,
  TerasList, TerasModalShell, TerasNoteField, TerasSelectField, TerasSignalItem, TerasTextField } from "@/teras";
import { WorkspaceIntakeDialog } from "../../console-integration/workspace-intake/presentation/workspace-intake-dialog";
import { useWorkspaceIntakeLiveRuntime } from "../../console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime";
import { directIntakeTarget, directWorkspaceIntakeCandidate, emptyDirectIntakeDraft,
  type DirectIntakeDraft, type DirectIntakeKind } from "../../console-integration/workspace-intake/workspace-intake-direct-candidate";
import type { WorkspaceIntakeCandidate } from "../../console-integration/workspace-intake/workspace-intake-live-types";
import type { WorkspaceRegistrySnapshot } from "../model/workspace-registry-types";

export function WorkspaceRegistryIntakeDialog({ snapshot, onClose }: {
  snapshot: WorkspaceRegistrySnapshot; onClose: () => void;
}) {
  const [kind, setKind] = useState<DirectIntakeKind>("product");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<{ kind: DirectIntakeKind; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (selected) return <DirectIntakeTarget key={`${selected.kind}:${selected.name}`} target={selected}
    snapshot={snapshot} onChangeTarget={() => setSelected(null)} onClose={onClose} />;
  return <TerasModalShell bodyLayout="scroll" height="content" width="standard" title="Workspace Intake"
    kicker="Direct classification" surfaceId="workspace-registry-intake-target"
    description="Classify a product or component using operator-authored metadata. Repository admission stays in Repository Control."
    onClose={onClose} footer={<>
      <TerasActionButton emphasis="secondary" onClick={onClose}>Back to Registry</TerasActionButton>
      <TerasActionButton onClick={() => { try { setSelected(directIntakeTarget(kind, name.trim())); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid target."); } }}>Inspect Intake requests</TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <TerasSelectField label="Entrant type" value={kind} onValueChange={setKind}
        options={[{ label: "Product", value: "product" }, { label: "Component", value: "component" }]} />
      <TerasTextField label="Canonical entrant key" value={name} onValueChange={setName} />
      {error ? <TerasContentTray kicker="Target required" description={error} /> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}

function DirectIntakeTarget({ target, snapshot, onChangeTarget, onClose }: {
  target: { kind: DirectIntakeKind; name: string }; snapshot: WorkspaceRegistrySnapshot;
  onChangeTarget: () => void; onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [draft, setDraft] = useState<DirectIntakeDraft>(emptyDirectIntakeDraft);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ candidate: WorkspaceIntakeCandidate; requestId?: string } | null>(null);
  const [building, setBuilding] = useState(false);
  const owners = snapshot.records.filter(record => record.kind === "repo" && record.posture === "active").map(record => record.name);
  const products = snapshot.records.filter(record => record.kind === "product" && record.posture === "active").map(record => record.name);
  const inInventory = snapshot.records.some(record => record.kind === target.kind && record.name === target.name);
  const busy = runtime.pending || building;
  const page = runtime.requestPage?.target.kind === target.kind && runtime.requestPage.target.name === target.name ? runtime.requestPage : null;
  useEffect(() => { void runtime.listDirect(target.kind, target.name).catch(() => undefined); }, [target.kind, target.name, runtime.listDirect]);
  function update(field: keyof DirectIntakeDraft, value: string) { if (!busy) setDraft(current => ({ ...current, [field]: value })); }
  async function prepare() {
    if (busy || !page || page.pending_request_count || inInventory) return;
    setBuilding(true); setError(null);
    try {
      const current = await runtime.listDirect(target.kind, target.name);
      if (current.pending_request_count) throw new Error("Reopen the original pending request before another classification.");
      setReview({ candidate: await directWorkspaceIntakeCandidate(target, draft, owners, products) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Intake preparation failed."); }
    finally { setBuilding(false); }
  }
  if (review) return <WorkspaceIntakeDialog candidate={review.candidate} initialRequestId={review.requestId}
    returnLabel="Back to Registry" onClose={onClose} onNewCandidate={() => {
      setReview(null); void runtime.listDirect(target.kind, target.name).catch(() => undefined);
    }} />;
  const ownerOptions = [{ label: "Select owner explicitly", value: "" }, ...owners.map(value => ({ label: value, value }))];
  const ownerField = (label: string, field: keyof DirectIntakeDraft) => <TerasSelectField label={label} value={draft[field]}
    disabled={busy} onValueChange={value => update(field, value)} options={ownerOptions} />;
  return <TerasModalShell bodyLayout="scroll" height="content" width="standard" title="Prepare direct entrant"
    kicker={`${target.kind}:${target.name}`} surfaceId="workspace-registry-intake-preparation"
    description="Operator-authored classification. Admission, Inventory promotion, runtime and publication are separate decisions."
    onClose={onClose} footer={<>
      <TerasActionButton emphasis="secondary" disabled={busy} onClick={onChangeTarget}>Change target</TerasActionButton>
      <TerasActionButton disabled={busy || !page || Boolean(page.pending_request_count) || inInventory}
        onClick={() => void prepare()}>Review direct candidate</TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <TerasContentTray kicker="Retained Intake requests"
        description={page ? `${page.pending_request_count} pending request(s) across all pages. Reopen reads the original request without resubmitting.`
          : runtime.error?.message ?? "Reading the native journal. New classification requires a successful read."}
        actions={<TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={busy} onClick={() => void runtime.listDirect(target.kind, target.name).catch(() => undefined)}>Refresh retained requests</TerasActionButton>
          {page?.next_cursor ? <TerasActionButton emphasis="secondary" disabled={busy}
            onClick={() => void runtime.listDirect(target.kind, target.name, page.next_cursor).catch(() => undefined)}>More retained requests</TerasActionButton> : null}
        </TerasActionRow>}>
        {page?.records.length ? <TerasList frame="contained" scrollHeight="short">
          {page.records.map(entry => <TerasSignalItem key={entry.request_id} label={entry.request_id}
            title={`${entry.classification} / ${entry.status}`} detail={entry.updated_at} tone="info"
            {...(busy ? { statusLabel: "Reading" } : { ariaLabel: `Reopen original request ${entry.request_id}`,
              actionLabel: "Reopen original request", onSelect: () => setReview({ requestId: entry.request_id,
                candidate: { label: target.name, target, source: entry.candidate.source,
                  requested_record: entry.candidate.requested_record, evidence_refs: entry.candidate.evidence_refs } }) })} />)}
        </TerasList> : null}
      </TerasContentTray>
      {inInventory ? <TerasContentTray kicker="Already in Inventory" description="Use Registry to inspect this record. The retained Intake history remains readable; admission is not repeated." /> : null}
      {target.kind === "product" ? <>
        {ownerField("Platform owner", "platformOwner")}
        {ownerField("Runtime owner", "runtimeOwner")}
        <TerasTextField label="Source owners (comma-separated canonical keys)" value={draft.sourceOwners} disabled={busy} onValueChange={value => update("sourceOwners", value)} />
        <TerasTextField label="Intended endpoint" value={draft.endpoint} disabled={busy} onValueChange={value => update("endpoint", value)} />
      </> : <>
        {ownerField("Owner repository", "ownerRepo")}
        <TerasTextField label="Component class" value={draft.componentClass} disabled={busy} onValueChange={value => update("componentClass", value)} />
        <TerasSelectField label="Associated product" value={draft.product} disabled={busy} onValueChange={value => update("product", value)}
          options={[{ label: "No product association", value: "" }, ...products.map(value => ({ label: value, value }))]} />
      </>}
      {ownerField("Security owner", "securityOwner")}
      <TerasNoteField label="Purpose and ownership boundary" value={draft.notes} disabled={busy} onValueChange={value => update("notes", value)} />
      <TerasNoteField label="Contextual evidence references (one per line)" value={draft.evidence} disabled={busy} onValueChange={value => update("evidence", value)} />
      {error || runtime.error ? <TerasContentTray kicker="Intake unavailable" description={error ?? runtime.error!.message} /> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}
