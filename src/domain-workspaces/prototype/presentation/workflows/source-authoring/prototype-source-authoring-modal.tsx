"use client";
import { effectiveModelLabel } from "../../../../../console-integration/governed-ai/model-selection.ts";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasDraftCloseGuardDialog, TerasTechnicalDetails, TerasLoadingState, TerasEmptyState, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasTextField } from "@/teras";
import { SourceAuthorizationPanel } from "../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import { openExternalConsoleRoute } from "../../../../../console-integration/external-route.ts";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { usePrototypeSourceRuntime } from "../../../live-runtime/use-prototype-source-runtime.ts";
import type { PrototypeOwnerPreparation, PrototypePreviewPreparation, PrototypeSourceAction } from "../../../live-runtime/prototype-source-types.ts";
import { assertPrototypeOwnerPreparation } from "../../../live-runtime/prototype-source-contract.ts";
import { emptyPrototypeDeliveryPreparation, PrototypeDeliveryPreparationFields } from "./prototype-delivery-preparation-fields.tsx";
import { prototypeSourceEligibility, prototypeSourceOutcomeUncertain, prototypeSourceWorkLabel } from "../../shared/prototype-source-work-display.ts";
import { prototypeSourcePreviewAdapter } from "../../../live-runtime/prototype-source-preview-adapter.ts";
import { SourceEditorWorkspace } from "../../../../../console-integration/source-authoring/presentation/source-editor-workspace.tsx";

export function PrototypeSourceAuthoringModal({ record, onClose }: { record: PrototypeRecord | null; onClose: () => void }) {
  const [dirty, setDirty] = useState(false), [guard, setGuard] = useState(false);
  useEffect(() => { setDirty(false); setGuard(false); }, [record?.id]);
  if (!record) return null;
  const match = /^record:\/\/prototypes\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(record.sourceRef);
  return <><TerasModalShell bodyLayout="scroll" height="fill" width="large" kicker="Prototype Source" title={`Source work — ${record.name}`} onClose={() => dirty ? setGuard(true) : onClose()} surfaceId="prototype-source-authoring"
    description="Edit, import or prepare source through Studio. Source review, runtime checks and Delivery acceptance remain separate.">
    {match ? <PrototypeSourceTool key={record.id} record={record} prototypeId={`prototype:${match[1]}`} onDirtyChange={setDirty} /> : <TerasEmptyState>Complete canonical Studio Landing before source authoring. Fixtures and guessed source coordinates are not an authoring route.</TerasEmptyState>}
  </TerasModalShell><TerasDraftCloseGuardDialog open={guard} title="Discard source-work draft?" description="Your new objective and setup have not been submitted." kicker="Source Authoring" leaveLabel="Discard draft" onKeepEditing={() => setGuard(false)} onLeave={() => {setDirty(false);setGuard(false);onClose();}} /></>;
}
function PrototypeSourceTool({ record, prototypeId, onDirtyChange }: { record: PrototypeRecord; prototypeId: string; onDirtyChange: (dirty: boolean) => void }) {
  const runtime = usePrototypeSourceRuntime(prototypeId), [objective, setObjective] = useState(""), [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState<"app-design" | "preview-profile" | "delivery-packet">("app-design");
  const [deliveryPreparation, setDeliveryPreparation] = useState(emptyPrototypeDeliveryPreparation);
  const [port, setPort] = useState(""), [ttl, setTtl] = useState("3600"), [decision, setDecision] = useState("");
  const [support, setSupport] = useState<PrototypePreviewPreparation["support_profile"]>("interactive");
  const [embedding, setEmbedding] = useState("off");
  const [activation, setActivation] = useState<"draft" | "active">("draft");
  const [sourceIntent, setSourceIntent] = useState<string | null>(null), current = runtime.projection, realization = current?.realization;
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => { setSourceIntent(null); setEditorOpen(false); }, [current?.request_id]);
  const revision = record.sourceEvidence?.authority === "workspace-prototype-studio" ? record.sourceEvidence.revision : null;
  const state = realization?.state, attempt = realization?.attempt;
  const eligibility = prototypeSourceEligibility(record), uncertain = prototypeSourceOutcomeUncertain(current);
  const [switchTo, setSwitchTo] = useState<string | null | undefined>(undefined);
  const newDraftDirty = (!current || current.state === "succeeded") && Boolean(objective.trim() || purpose !== "app-design" || port || decision || ttl !== "3600" || support !== "interactive" || activation !== "draft" || embedding !== "off");
  useEffect(() => onDirtyChange(newDraftDirty), [newDraftDirty, onDirtyChange]);
  function selectRequest(id: string | null) {
    if (newDraftDirty) setSwitchTo(id); else void runtime.refresh(id);
  }
  function discardAndSelect() { setObjective(""); setPurpose("app-design"); setPort(""); setDecision(""); setEmbedding("off"); setTtl("3600"); setSupport("interactive"); setActivation("draft"); setDeliveryPreparation(emptyPrototypeDeliveryPreparation); void runtime.refresh(switchTo); setSwitchTo(undefined); }

  const controlAction: Partial<Record<string, PrototypeSourceAction>> = { "prototype-source-publish-required": "publish", "prototype-source-human-review-required": "review", "prototype-source-merge-required": "merge", "prototype-source-close-required": "close" };
  const next = current ? controlAction[current.next_action.code] : undefined;
  const labels = { publish: "Validate and publish Gary source", review: "Human-approve this exact PR head", merge: "Merge the human-approved source", close: "Revoke owned access and retire source resources" };
  const run = (action: PrototypeSourceAction) => void runtime.command(action, sourceIntent ?? current?.source_intent_ref ?? null, action === "cancel-attempt" ? reason : undefined);
  const pr = current?.source_delivery.publish?.pull_request;
  const ownerIntent: PrototypeOwnerPreparation | undefined = purpose === "preview-profile" ? {
    kind: "preview-profile", port: Number(port), ttl_seconds: Number(ttl), support_profile: support,
    runtime_activation: activation === "active", decision_ref: decision, ...(embedding === "on" && typeof window !== "undefined" ? { embedding_origins: [window.location.origin] } : {}),
  } : purpose === "delivery-packet" ? deliveryPreparation : undefined;
  let validOwnerIntent = true;
  try { if (ownerIntent) assertPrototypeOwnerPreparation(ownerIntent); } catch { validOwnerIntent = false; }
  const selectedOwner = current?.source_request.owner_preparation;
  const scopeLabel = selectedOwner?.kind === "preview-profile"
    ? `Studio Preview profile / port ${selectedOwner.port} / ${selectedOwner.ttl_seconds}s / ${selectedOwner.support_profile} / ${selectedOwner.runtime_activation ? "active profile intent (not a running process)" : "draft profile"} / ${selectedOwner.decision_ref}`
    : selectedOwner?.kind === "delivery-packet" ? `Native Delivery packet + Studio registry backlink / ${selectedOwner.custody.owner} / ${selectedOwner.decision_ref}`
      : current ? `${current.source_scope.source_root} + ${current.source_scope.design_profile}` : "Not prepared";
  return <TerasFieldStack spacing="normal">
    <TerasPanel spacing="normal" frame="padded" treatment="state" tone={runtime.error ? "danger" : "info"}>
      <TerasPanelHeader busy={runtime.pending} busyLabel="Reading or updating source request…" kicker="Canonical Source Request" title={runtime.pending && !current ? "Loading source work" : current ? prototypeSourceWorkLabel(state ?? current.state) : "Start source work"} description={runtime.error ?? (current ? current.source_request.objective : "Choose an objective, then edit, import or request an optional model draft.")} />
      <TerasActionRow>
        <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh()}>Refresh retained source requests</TerasActionButton>
        <TerasActionButton disabled={runtime.pending || Boolean(runtime.error) || Boolean(eligibility) || uncertain} onClick={() => selectRequest(null)}>New source work</TerasActionButton>
        {runtime.requests.map((request, index) => <TerasActionButton key={request.request_id} disabled={runtime.pending} emphasis="secondary" onClick={() => selectRequest(request.request_id)}>{`Request ${runtime.requests.length - index} · ${prototypeSourceWorkLabel(request.state)}`}</TerasActionButton>)}
      </TerasActionRow>
      {eligibility ? <TerasEmptyState>{eligibility} Retained requests remain available for inspection.</TerasEmptyState> : null}
      {uncertain ? <TerasEmptyState>Resolve the current operation before preparing new work. Its original request is retained.</TerasEmptyState> : null}
      {current ? <TerasTechnicalDetails items={[
        { label: "Original objective", value: current.source_request.objective }, { label: "Source request", value: current.request_id },
        { label: "Source scope", value: scopeLabel }, ...(selectedOwner?.kind === "preview-profile" ? [{ label: "Embedding allowed from", value: selectedOwner.embedding_origins?.join(", ") || "Browser-only; embedding denied" }] : []), { label: "Session", value: current.session_id ?? "Not started" },
        { label: "Attempt", value: attempt?.request_id ?? "Not started" }, { label: "State / next action", value: `${state ?? current.state} / ${current.next_action.code}` },
        { label: "Context packet", value: attempt?.context_packet_ref ?? "Not admitted" }, { label: "Model purpose", value: attempt?.model_profile_id ?? "Not invoked" },
        ...(attempt?.effective_model_selection ? [{ label: "Actual model", value: effectiveModelLabel(attempt.effective_model_selection) }] : []),
        ...(attempt?.owner_preparation ? [{ label: "Trusted Studio plan", value: attempt.owner_preparation.plan_digest }] : []),
        ...(attempt?.failure ? [{ label: "Service failure", value: attempt.failure }] : []),
        ...Object.entries(current.source_delivery).map(([action, control]) => ({ label: `Source ${action}`, value: `${control.state}${control.failure ? ` / ${control.failure}` : ""} / ${control.command.command_id}` })),
      ]} /> : null}
      {runtime.pending && !current ? <TerasLoadingState label="Loading retained source requests…" skeleton="details" /> : null}
      {!runtime.pending && !runtime.error && !eligibility && (!current || current.state === "succeeded") ? <>
        <TerasSelectField label="Source purpose" value={purpose} onValueChange={setPurpose} disabled={runtime.pending} options={[{ value: "app-design", label: "App/design — editor, import and AI assistant" }, { value: "preview-profile", label: "Trusted Studio Preview profile" }, { value: "delivery-packet", label: "Native Studio Delivery packet" }]} />
        <TerasNoteField label="New source-work objective" value={objective} onValueChange={setObjective} minimumHeight="medium" maxLength={16384} />
        {purpose === "preview-profile" ? <TerasFieldStack spacing="normal">
          <TerasTextField label="Reviewed loopback port" value={port} onValueChange={setPort} inputMode="numeric" maxLength={5} />
          <TerasTextField label="TTL in seconds (300–86400)" value={ttl} onValueChange={setTtl} inputMode="numeric" maxLength={5} />
          <TerasTextField label="Operator decision record reference" value={decision} onValueChange={setDecision} maxLength={512} />
          <TerasSelectField label="Support mode" value={support} onValueChange={setSupport} options={[{ value: "interactive", label: "Interactive" }, { value: "unattended", label: "Unattended" }]} />
          <TerasSelectField label="Embedded editor preview" value={embedding} onValueChange={setEmbedding} helper="Allow only this Console address in the reviewed preview profile. This does not apply your draft or start the preview." options={[{value:"off",label:"Open in browser only"},{value:"on",label:"Allow this Console"}]} />
          <TerasSelectField label="Profile activation intent" value={activation} onValueChange={setActivation} helper="Neither option starts a process. An active profile still needs reviewed merge, accepted source and the separate Preview start action." options={[{ value: "draft", label: "Draft, not runnable" }, { value: "active", label: "Request reviewed runnable profile" }]} />
        </TerasFieldStack> : null}
        {purpose === "delivery-packet" ? <PrototypeDeliveryPreparationFields value={deliveryPreparation} onChange={setDeliveryPreparation} disabled={runtime.pending} /> : null}
        <TerasActionButton disabled={runtime.pending || Boolean(runtime.error) || !revision || !/^[a-f0-9]{40}$/.test(revision) || objective.trim().length < 8 || !validOwnerIntent} onClick={() => revision && void runtime.create(objective, revision, ownerIntent)}>Prepare source work</TerasActionButton>
      </> : null}
    </TerasPanel>
    {current && current.state !== "succeeded" ? <>
      {!eligibility ? <SourceAuthorizationPanel key={current.request_id} subject={{ kind: "prototype", prototype_id: prototypeId, source_request_id: current.request_id }} sourceStartDigest={current.source_start_digest} onIntentChange={setSourceIntent} /> : null}
      <TerasPanel spacing="normal" frame="padded" treatment="neutral">
        <TerasPanelHeader kicker="Source workspace" title="Write, review and deliver" description="Generation creates no source commit. Exact draft acceptance and accountable human PR approval are separate actions." />
        <TerasActionRow>
          {!eligibility && current.session_id && realization && !current.source_request.owner_preparation ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => setEditorOpen(true)}>Open source workspace</TerasActionButton> : null}
          {!eligibility && (!current.session_id || current.state === "source-authorization-required") ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("session")}>Start scoped source session</TerasActionButton> : null}
          {!eligibility && realization && ["not-started", "failed", "cancelled", "accepted"].includes(realization.state) ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("generate")}>{current.source_request.owner_preparation ? state === "accepted" ? "Resume original source preparation" : attempt ? "Prepare explicitly linked service retry" : "Prepare trusted Studio draft" : state === "accepted" ? "Resume original generation" : attempt ? "Generate explicitly linked retry" : "Generate app/design draft"}</TerasActionButton> : null}
          {attempt?.change_set ? <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.inspectDraft()}>Inspect exact draft source text</TerasActionButton> : null}
          {!eligibility && state === "draft-ready" ? <TerasActionButton disabled={runtime.pending || !sourceIntent || !runtime.draft || runtime.draft.digest !== attempt?.change_set?.digest} onClick={() => run("accept")}>Accept inspected digest and create Gary source</TerasActionButton> : null}
          {state && ["applying", "apply-unknown"].includes(state) ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("recover")}>Recover the accepted source apply</TerasActionButton> : null}
          {next ? <TerasActionButton disabled={runtime.pending || (next === "publish" && !sourceIntent)} onClick={() => run(next)}>{labels[next as keyof typeof labels]}</TerasActionButton> : null}
          {pr ? <TerasActionButton emphasis="secondary" onClick={() => openExternalConsoleRoute(pr.url)}>Open retained source PR</TerasActionButton> : null}
        </TerasActionRow>
        {!sourceIntent && !eligibility ? <TerasEmptyState>Enable source access before editing or importing. Start new source work if you need a different objective; this request and its evidence remain retained.</TerasEmptyState> : null}
        {state && ["accepted", "draft-ready"].includes(state) ? <>
          <TerasNoteField label="Reason to cancel this unapplied attempt" value={reason} onValueChange={setReason} minimumHeight="short" maxLength={4096} />
          <TerasActionButton disabled={runtime.pending || reason.trim().length < 20} emphasis="secondary" onClick={() => run("cancel-attempt")}>Cancel unapplied attempt</TerasActionButton>
        </> : null}
      </TerasPanel>
    </> : null}
    {runtime.draft ? <TerasPanel spacing="normal" frame="padded" treatment="neutral">
      <TerasPanelHeader kicker="Inert Draft Inspection" title={runtime.draft.change_set.commit_message} description={`Exact reviewed digest: ${runtime.draft.digest}`} />
      <TerasFieldStack spacing="normal">{runtime.draft.change_set.operations.map(operation => <TerasNoteField key={operation.path} label={`${operation.action}: ${operation.path}`} readOnly value={operation.content ?? "(delete)"} onValueChange={() => undefined} minimumHeight="medium" />)}</TerasFieldStack>
    </TerasPanel> : null}
    {editorOpen && current?.session_id && realization && !current.source_request.owner_preparation ? <SourceEditorWorkspace key={current.session_id}
      target={{ endpoint: `/api/prototypes/source-requests/${encodeURIComponent(current.request_id)}`, label: `${record.name} — app/design source`,
        current: { sessionId: current.session_id, revision: realization.revision, state: realization.state, attempt: attempt ? { requestId: attempt.request_id, executionId: attempt.execution_id, objectiveDigest: attempt.objective_digest, digest: attempt.change_set?.digest ?? null } : null },
        objective: current.source_request.objective, objectiveReadOnly: true, objectiveMin: 8, objectiveMax: 16384, scope: current.source_scope, preview: prototypeSourcePreviewAdapter(prototypeId) }}
      onClose={() => setEditorOpen(false)} onSaved={() => void runtime.refresh(current.request_id)} onReviewed={() => void runtime.inspectDraft()} /> : null}
  <TerasDraftCloseGuardDialog open={switchTo !== undefined} title="Discard source-work draft?" description="Switching requests discards the unsubmitted objective and setup." kicker="Source Authoring" leaveLabel="Discard draft" onKeepEditing={() => setSwitchTo(undefined)} onLeave={discardAndSelect} />
  </TerasFieldStack>;
}
