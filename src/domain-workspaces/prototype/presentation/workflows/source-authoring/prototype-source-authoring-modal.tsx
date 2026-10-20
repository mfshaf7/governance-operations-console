"use client";
import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasEmptyState, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasTextField } from "@/teras";
import { SourceAuthorizationPanel } from "../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import { openExternalConsoleRoute } from "../../../../../console-integration/external-route.ts";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { usePrototypeSourceRuntime } from "../../../live-runtime/use-prototype-source-runtime.ts";
import type { PrototypeOwnerPreparation, PrototypePreviewPreparation, PrototypeSourceAction } from "../../../live-runtime/prototype-source-types.ts";
import { assertPrototypeOwnerPreparation } from "../../../live-runtime/prototype-source-contract.ts";
import { emptyPrototypeDeliveryPreparation, PrototypeDeliveryPreparationFields } from "./prototype-delivery-preparation-fields.tsx";

export function PrototypeSourceAuthoringModal({ record, onClose }: { record: PrototypeRecord | null; onClose: () => void }) {
  if (!record) return null;
  const match = /^record:\/\/prototypes\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(record.sourceRef);
  return <TerasModalShell bodyLayout="scroll" height="fill" width="large" kicker="Prototype Authoring" title={`Author ${record.name}`} onClose={onClose} surfaceId="prototype-source-authoring"
    description="Bounded app/design source or trusted Preview/Delivery metadata through the canonical owner. Preparation is not running Preview, Baseline approval or Delivery application.">
    {match ? <PrototypeSourceTool key={record.id} record={record} prototypeId={`prototype:${match[1]}`} /> : <TerasEmptyState>Complete canonical Studio Landing before source authoring. Fixtures and guessed source coordinates are not an authoring route.</TerasEmptyState>}
  </TerasModalShell>;
}
function PrototypeSourceTool({ record, prototypeId }: { record: PrototypeRecord; prototypeId: string }) {
  const runtime = usePrototypeSourceRuntime(prototypeId), [objective, setObjective] = useState(""), [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState<"app-design" | "preview-profile" | "delivery-packet">("app-design");
  const [deliveryPreparation, setDeliveryPreparation] = useState(emptyPrototypeDeliveryPreparation);
  const [port, setPort] = useState(""), [ttl, setTtl] = useState("3600"), [decision, setDecision] = useState("");
  const [support, setSupport] = useState<PrototypePreviewPreparation["support_profile"]>("interactive");
  const [activation, setActivation] = useState<"draft" | "active">("draft");
  const [sourceIntent, setSourceIntent] = useState<string | null>(null), current = runtime.projection, realization = current?.realization;
  const revision = record.sourceEvidence?.authority === "workspace-prototype-studio" ? record.sourceEvidence.revision : null;
  const state = realization?.state, attempt = realization?.attempt;
  const controlAction: Partial<Record<string, PrototypeSourceAction>> = { "prototype-source-publish-required": "publish", "prototype-source-human-review-required": "review", "prototype-source-merge-required": "merge", "prototype-source-close-required": "close" };
  const next = current ? controlAction[current.next_action.code] : undefined;
  const labels = { publish: "Validate and publish Gary source", review: "Human-approve this exact PR head", merge: "Merge the human-approved source", close: "Revoke owned access and retire source resources" };
  const run = (action: PrototypeSourceAction) => void runtime.command(action, sourceIntent ?? current?.source_intent_ref ?? null, action === "cancel-attempt" ? reason : undefined);
  const pr = current?.source_delivery.publish?.pull_request;
  const ownerIntent: PrototypeOwnerPreparation | undefined = purpose === "preview-profile" ? {
    kind: "preview-profile", port: Number(port), ttl_seconds: Number(ttl), support_profile: support,
    runtime_activation: activation === "active", decision_ref: decision,
  } : purpose === "delivery-packet" ? deliveryPreparation : undefined;
  let validOwnerIntent = true;
  try { if (ownerIntent) assertPrototypeOwnerPreparation(ownerIntent); } catch { validOwnerIntent = false; }
  const selectedOwner = current?.source_request.owner_preparation;
  const scopeLabel = selectedOwner?.kind === "preview-profile"
    ? `Studio Preview profile / port ${selectedOwner.port} / ${selectedOwner.ttl_seconds}s / ${selectedOwner.support_profile} / ${selectedOwner.runtime_activation ? "active profile intent (not a running process)" : "draft profile"} / ${selectedOwner.decision_ref}`
    : selectedOwner?.kind === "delivery-packet" ? `Native Delivery packet + Studio registry backlink / ${selectedOwner.custody.owner} / ${selectedOwner.decision_ref}`
      : current ? `${current.source_scope.source_root} + ${current.source_scope.design_profile}` : "Not prepared";
  return <TerasFieldStack spacing="normal">
    <TerasPanel frame="padded" treatment="state" tone={runtime.error ? "danger" : "info"}>
      <TerasPanelHeader kicker="Canonical Source Request" title={current?.state ?? "Select or prepare source work"} description={runtime.error ?? current?.next_action.reason ?? current?.next_action.code ?? "Recover existing requests before creating new source work."} />
      <TerasActionRow>
        <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh()}>Refresh retained source requests</TerasActionButton>
        {runtime.requests.map(request => <TerasActionButton key={request.request_id} disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh(request.request_id)}>{request.request_id} / {request.state}</TerasActionButton>)}
      </TerasActionRow>
      {current ? <TerasMetadataList items={[
        { label: "Original objective", value: current.source_request.objective }, { label: "Source request", value: current.request_id },
        { label: "Source scope", value: scopeLabel }, { label: "Session", value: current.session_id ?? "Not started" },
        { label: "Attempt", value: attempt?.request_id ?? "Not started" }, { label: "State / next action", value: `${state ?? current.state} / ${current.next_action.code}` },
        { label: "Context packet", value: attempt?.context_packet_ref ?? "Not admitted" }, { label: "Model purpose", value: attempt?.model_profile_id ?? "Not invoked" },
        ...(attempt?.owner_preparation ? [{ label: "Trusted Studio plan", value: attempt.owner_preparation.plan_digest }] : []),
        ...(attempt?.failure ? [{ label: "Owner failure", value: attempt.failure }] : []),
        ...Object.entries(current.source_delivery).map(([action, control]) => ({ label: `Source ${action}`, value: `${control.state}${control.failure ? ` / ${control.failure}` : ""} / ${control.command.command_id}` })),
      ]} /> : null}
      {!current || current.state === "succeeded" ? <>
        <TerasSelectField label="Source purpose" value={purpose} onValueChange={setPurpose} disabled={runtime.pending} options={[{ value: "app-design", label: "Model-drafted app/design" }, { value: "preview-profile", label: "Trusted Studio Preview profile" }, { value: "delivery-packet", label: "Native Studio Delivery packet" }]} />
        <TerasNoteField label="New source-work objective" value={objective} onValueChange={setObjective} minimumHeight="medium" maxLength={16384} />
        {purpose === "preview-profile" ? <TerasFieldStack spacing="normal">
          <TerasTextField label="Reviewed loopback port" value={port} onValueChange={setPort} inputMode="numeric" maxLength={5} />
          <TerasTextField label="TTL in seconds (300–86400)" value={ttl} onValueChange={setTtl} inputMode="numeric" maxLength={5} />
          <TerasTextField label="Operator decision record reference" value={decision} onValueChange={setDecision} maxLength={512} />
          <TerasSelectField label="Support mode" value={support} onValueChange={setSupport} options={[{ value: "interactive", label: "Interactive" }, { value: "unattended", label: "Unattended" }]} />
          <TerasSelectField label="Profile activation intent" value={activation} onValueChange={setActivation} helper="Neither option starts a process. An active profile still needs reviewed merge, accepted source and the separate Preview start action." options={[{ value: "draft", label: "Draft, not runnable" }, { value: "active", label: "Request reviewed runnable profile" }]} />
        </TerasFieldStack> : null}
        {purpose === "delivery-packet" ? <PrototypeDeliveryPreparationFields value={deliveryPreparation} onChange={setDeliveryPreparation} disabled={runtime.pending} /> : null}
        <TerasActionButton disabled={runtime.pending || !revision || !/^[a-f0-9]{40}$/.test(revision) || objective.trim().length < 8 || !validOwnerIntent} onClick={() => revision && void runtime.create(objective, revision, ownerIntent)}>Prepare a new canonical source request</TerasActionButton>
      </> : null}
    </TerasPanel>
    {current && current.state !== "succeeded" ? <>
      <SourceAuthorizationPanel key={current.request_id} subject={{ kind: "prototype", prototype_id: prototypeId, source_request_id: current.request_id }} sourceStartDigest={current.source_start_digest} onIntentChange={setSourceIntent} />
      <TerasPanel frame="padded" treatment="neutral">
        <TerasPanelHeader kicker="Bounded Authoring Controls" title="Draft, inspect and deliver source" description="Generation creates no source commit. Exact draft acceptance and accountable human PR approval are separate actions." />
        <TerasActionRow>
          {!current.session_id || current.state === "source-authorization-required" ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("session")}>Start scoped source session</TerasActionButton> : null}
          {realization && ["not-started", "failed", "cancelled", "accepted"].includes(realization.state) ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("generate")}>{current.source_request.owner_preparation ? state === "accepted" ? "Resume original owner preparation" : attempt ? "Prepare explicitly linked owner retry" : "Prepare trusted Studio owner draft" : state === "accepted" ? "Resume original generation" : attempt ? "Generate explicitly linked retry" : "Generate app/design draft"}</TerasActionButton> : null}
          {attempt?.change_set ? <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.inspectDraft()}>Inspect exact draft source text</TerasActionButton> : null}
          {state === "draft-ready" ? <TerasActionButton disabled={runtime.pending || !sourceIntent || !runtime.draft || runtime.draft.digest !== attempt?.change_set?.digest} onClick={() => run("accept")}>Accept inspected digest and create Gary source</TerasActionButton> : null}
          {state && ["applying", "apply-unknown"].includes(state) ? <TerasActionButton disabled={runtime.pending || !sourceIntent} onClick={() => run("recover")}>Recover the accepted source apply</TerasActionButton> : null}
          {next ? <TerasActionButton disabled={runtime.pending || (next === "publish" && !sourceIntent)} onClick={() => run(next)}>{labels[next as keyof typeof labels]}</TerasActionButton> : null}
          {pr ? <TerasActionButton emphasis="secondary" onClick={() => openExternalConsoleRoute(pr.url)}>Open retained source PR</TerasActionButton> : null}
        </TerasActionRow>
        {state && ["accepted", "draft-ready"].includes(state) ? <>
          <TerasNoteField label="Reason to cancel this unapplied attempt" value={reason} onValueChange={setReason} minimumHeight="short" maxLength={4096} />
          <TerasActionButton disabled={runtime.pending || reason.trim().length < 20} emphasis="secondary" onClick={() => run("cancel-attempt")}>Cancel unapplied attempt</TerasActionButton>
        </> : null}
      </TerasPanel>
    </> : null}
    {runtime.draft ? <TerasPanel frame="padded" treatment="neutral">
      <TerasPanelHeader kicker="Inert Draft Inspection" title={runtime.draft.change_set.commit_message} description={`Exact reviewed digest: ${runtime.draft.digest}`} />
      <TerasFieldStack spacing="normal">{runtime.draft.change_set.operations.map(operation => <TerasNoteField key={operation.path} label={`${operation.action}: ${operation.path}`} readOnly value={operation.content ?? "(delete)"} onValueChange={() => undefined} minimumHeight="medium" />)}</TerasFieldStack>
    </TerasPanel> : null}
  </TerasFieldStack>;
}
