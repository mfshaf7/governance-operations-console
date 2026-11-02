"use client";

import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentRegion, TerasContentTray, TerasDialog, TerasDraftCloseGuardDialog, TerasFieldStack, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasSelectField, TerasStatusItem, TerasTechnicalDetails, TerasTextField, TerasWizardFooter, TerasWizardModal } from "@/teras";
import type { ProductReleaseCapability } from "../../model/product-release-capability.ts";
import type { NativeReleaseWorkflow } from "../../live-runtime/release-workflow-contract.ts";
import type { PlatformOperationRecord } from "../../live-runtime/platform-operation-types.ts";
import type { usePlatformOperationsRuntime } from "../../live-runtime/use-platform-operations-runtime.ts";

type Runtime = ReturnType<typeof usePlatformOperationsRuntime>;
type Selection = { label: string; native: NativeReleaseWorkflow };

export function NativeReleaseActions({ product, current, runtime, onInspect }: { product: ProductReleaseCapability; current: boolean; runtime: Runtime; onInspect: () => void }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"details" | "review">("details");
  const [pending, setPending] = useState(false);
  const [exitGuard, setExitGuard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PlatformOperationRecord | null>(null);
  const pointerKey = "console-native-release:product:" + product.productId;
  useEffect(() => {
    try { setOriginal(sessionStorage.getItem(pointerKey)); }
    catch { setError("Browser recovery storage is unavailable. Release requests are withheld until it is available."); }
  }, [pointerKey]);
  const native = selection?.native;
  const capabilityAvailable = (definition: NativeReleaseWorkflow) => runtime.snapshot.catalog?.freshness === "current" && runtime.snapshot.catalog.subjects.some(subject => subject.ref === "product:" + product.productId && subject.source_version === definition.source_version && subject.capabilities.some(capability => capability.capability_id === definition.capability_id && capability.available && capability.approval_required));
  const stillCurrent = current && native?.source_version === product.source.version && product.ownerWorkflows?.some(workflow => workflow.native?.capability_id === native.capability_id && workflow.native.available) && capabilityAvailable(native);
  const incidentRequired = native?.workflow_id === "runtime" && (values.state === "quarantined" || product.recordedRuntime?.state === "quarantined" && values.state === "live");
  const invalid = !native || native.fields.some(field => field.required && !values[field.id]?.trim()) || incidentRequired && !values.incident_ref?.trim();
  const dirty = Boolean(native?.fields.some(field => (values[field.id] ?? "") !== field.default_value));
  const requestOpen = (item: NonNullable<ProductReleaseCapability["ownerWorkflows"]>[number]) => {
    if (!item.native || original || !item.native.available || !current) return;
    setSelection({ label: item.label, native: structuredClone(item.native) });
    setValues(Object.fromEntries(item.native.fields.map(field => [field.id, field.default_value])));
    setStep("details"); setError(null);
  };
  function close() {
    if (pending) return;
    if (dirty && !original) setExitGuard(true);
    else setSelection(null);
  }
  async function operationId(requestId: string) {
    const bytes = new TextEncoder().encode(JSON.stringify({ command_id: "console-command:" + requestId }));
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
    return "platform-operation:" + hash.slice(0, 24);
  }
  function accept(record: PlatformOperationRecord) {
    if (record.command.subject.ref !== "product:" + product.productId) throw new Error("The recovered operation belongs to another product.");
    // Only this opaque request pointer is local. The command, inputs, events and
    // receipt live in the existing OOS/Platform owner journals.
    sessionStorage.removeItem(pointerKey);
    setOriginal(null); setSelection(null); setOutcome(record); setError(null);
  }
  async function recover() {
    if (!original || pending) return;
    setPending(true); setError(null);
    try { accept(await runtime.read(await operationId(original))); }
    catch { setError("The original request is not yet confirmed. Inspect its existing history and refresh this original request. A replacement dispatch has not been submitted."); }
    finally { setPending(false); }
  }
  async function submit() {
    if (!selection || pending || original || invalid || !stillCurrent) return;
    const requestId = crypto.randomUUID();
    // Persist recovery identity before a network write. Closing/reloading a tab
    // must never silently turn a lost acknowledgement into a new command.
    try { sessionStorage.setItem(pointerKey, requestId); }
    catch { setError("The browser could not retain the recovery reference. No request was sent."); return; }
    setPending(true); setOriginal(requestId); setError(null);
    try { accept(await runtime.submit("product:" + product.productId, selection.native.capability_id, { workflow_id: selection.native.workflow_id, values }, selection.native.source_version, requestId)); }
    catch (caught) {
      // These adapter checks run before the OOS POST. Other failures retain the
      // pointer, because they may follow an accepted write with a lost reply.
      const code = caught && typeof caught === "object" && "code" in caught ? caught.code : null;
      if (["platform_operation_capability_unavailable", "platform_operation_review_stale", "platform_operation_capability_stale", "platform_operation_intent_invalid"].includes(String(code))) {
        sessionStorage.removeItem(pointerKey); setOriginal(null);
        setError("The request was rejected before submission because its source or action changed. Close, refresh and review the current action.");
      } else setError("The submission outcome is unconfirmed. Recover this original request before making another release request.");
    }
    finally { setPending(false); }
  }
  return <>
    <TerasActionRow spacing="normal">{product.ownerWorkflows?.filter(workflow => workflow.native).map(workflow => <TerasActionButton key={workflow.id} disabled={!current || !workflow.native?.available || !capabilityAvailable(workflow.native) || Boolean(original) || pending} onClick={() => requestOpen(workflow)}>{workflow.id === "readiness" ? "Record stage readiness" : workflow.id === "promotion" ? "Request promotion" : "Change runtime state"}</TerasActionButton>)}</TerasActionRow>
    {original ? <TerasContentTray kicker="Retained request" title="Recover original release request" description="Its acknowledgement is unconfirmed. Recovery reads the original operation and never dispatches a replacement."><TerasActionRow><TerasActionButton disabled={pending} onClick={() => void recover()}>Recover original request</TerasActionButton><TerasActionButton emphasis="secondary" onClick={onInspect}>Inspect operation history</TerasActionButton></TerasActionRow></TerasContentTray> : null}
    {error && !selection ? <TerasStatusItem label="Release request" status="Needs attention" tone="warn" detail={error}/> : null}
    {selection ? <TerasWizardModal busy={pending} busyLabel="Contacting release owner…" activeStepId={step} surfaceId="governed-release-native-request" onClose={close} kicker="Governed release" title={selection.label}
      description="Submit to the existing owner workflow. Protected environment approval and source review remain required."
      subject={{ eyebrow: "Selected product", title: product.productLabel, detail: "Platform owns execution and source readback." }}
      steps={[{ id: "details", label: "Action Details", available: true, stateLabel: invalid ? "Required" : "Ready", tone: invalid ? "warn" : "ok" }, { id: "review", label: "Review Request", available: !invalid, stateLabel: !invalid ? "Ready" : "Locked", tone: !invalid ? "info" : "muted" }]}
      onStepSelect={value => { if (!pending && !original && (value === "details" || !invalid)) setStep(value as "details" | "review"); }}
      footer={<TerasWizardFooter back={{ label: step === "review" && !original ? "Back to details" : "Close", disabled: pending, onClick: () => step === "review" && !original ? setStep("details") : close() }}
        next={step === "details" ? { label: "Review request", disabled: invalid || pending || Boolean(original), onClick: () => setStep("review") } : undefined}
        apply={step === "review" && !original ? { label: "Submit release request", disabled: pending || invalid || !stillCurrent, onClick: () => void submit() } : original ? { label: "Recover original request", disabled: pending, onClick: () => void recover() } : undefined}/>}
      support={<TerasPanel fit="fill" frame="padded" layout="header-body"><TerasPanelHeader kicker="Execution controls" title="Approval stays with you" description="The dispatch connection cannot approve an environment or merge source."/><TerasContentRegion fill scroll><TerasFieldStack><TerasContentTray kicker="Completion" description="A successful workflow prepares source for review. Completion requires the merged change and verified desired-state readback. Runtime health and UAT are separate."/><TerasTechnicalDetails summary="Reviewed source" items={[{ label: "Source version", value: selection.native.source_version }, { label: "Capability", value: selection.native.capability_id }]}/></TerasFieldStack></TerasContentRegion></TerasPanel>}>
      <TerasPanel fit="fill" frame="padded" layout="header-body"><TerasPanelHeader kicker={step === "details" ? "Owner inputs" : "Exact request"} title={step === "details" ? "Release details" : "Review before submission"} description={stillCurrent ? "Inputs come from the current product workflow contract." : "The owner source or connection changed. Close and refresh before submitting."}/>
        <TerasContentRegion fill scroll><TerasFieldStack spacing="normal">
          {error ? <TerasStatusItem label="Original request" status="Unconfirmed" tone="warn" detail={error}/> : null}
          {step === "details" ? native?.fields.map(field => <TerasFieldStack key={field.id} spacing="compact">{field.kind === "select" ? <TerasSelectField label={field.label + ((field.required || field.id === "incident_ref" && incidentRequired) ? " *" : " (optional)")} helper={field.description} value={values[field.id] ?? ""} options={field.options} disabled={pending || Boolean(original)} onValueChange={value => setValues(current => ({ ...current, [field.id]: value }))}/> : <><TerasTextField label={field.label + ((field.required || field.id === "incident_ref" && incidentRequired) ? " *" : " (optional)")} title={field.description} value={values[field.id] ?? ""} required={field.required || field.id === "incident_ref" && incidentRequired} maxLength={2048} disabled={pending || Boolean(original)} onValueChange={value => setValues(current => ({ ...current, [field.id]: value }))}/><TerasContentTray description={field.description}/></>}</TerasFieldStack>) : <TerasMetadataList items={selection.native.fields.map(field => ({ label: field.label, value: values[field.id]?.trim() || "Not provided" }))}/>}
        </TerasFieldStack></TerasContentRegion>
      </TerasPanel>
    </TerasWizardModal> : null}
    <TerasDraftCloseGuardDialog open={exitGuard} title="Discard these release details?" kicker="Unsaved draft" description="These inputs have not been submitted to the owner workflow." onKeepEditing={() => setExitGuard(false)} onLeave={() => { setExitGuard(false); setSelection(null); }}/>
    <TerasDialog open={Boolean(outcome)} onClose={() => setOutcome(null)} width="standard" height="content" contentOverflow="auto" title="Original release request recorded" kicker="Owner operation" description={outcome?.next_action.reason}
      actions={<><TerasActionButton emphasis="secondary" onClick={() => setOutcome(null)}>Close</TerasActionButton><TerasActionButton onClick={() => { setOutcome(null); onInspect(); }}>Inspect operation history</TerasActionButton></>}>
      {outcome ? <TerasMetadataList items={[{ label: "Progress", value: outcome.provider_operation.release_workflow?.phase.replaceAll("-", " ") ?? outcome.state }, { label: "Receipt", value: outcome.provider_operation.receipt ? "Recorded" : "Awaiting owner completion" }]}/> : null}
    </TerasDialog>
  </>;
}
