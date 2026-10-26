"use client";

import { useEffect, useMemo, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasDialog, TerasEmptyState, TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasRecordControlLayout, TerasRegisterPanel, TerasSelectedPanel, TerasStatusItem } from "@/teras";
import type { PlatformOperationCapability, PlatformOperationRecord, PlatformOperationSubject, PlatformOperationsLiveSnapshot } from "../../live-runtime/platform-operation-types.ts";
import { projectPlatformRuntimeReadiness } from "../../read-model/platform-runtime-readiness.ts";

export function PlatformOperationsLiveSurface({ kind, onControl, onRefresh, onSubmit, snapshot, focusRecordRef }: {
  kind: "dev-integration" | "governed-releases";
  onControl: (operationId: string, action: "cancel" | "retry", reason: string) => Promise<PlatformOperationRecord>;
  onRefresh: () => Promise<unknown>;
  onSubmit: (subjectRef: string, capabilityId: string) => Promise<PlatformOperationRecord>;
  snapshot: PlatformOperationsLiveSnapshot;
  focusRecordRef?: string | null;
}) {
  const subjects = useMemo(() => (snapshot.catalog?.subjects ?? []).filter((subject) => kind === "dev-integration" ? subject.kind === "dev-integration-profile" || subject.kind === "profile-request" : subject.kind === "product-release" || subject.kind === "product-runtime-lifecycle"), [kind, snapshot.catalog]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  useEffect(() => {
    const operation = snapshot.operations.find(item => item.operation_id === focusRecordRef);
    const ref = operation?.command.subject.ref ?? focusRecordRef;
    if (ref && subjects.some(subject => subject.ref === ref)) setSelectedRef(ref);
  }, [focusRecordRef, snapshot.operations, subjects]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destructiveCapability, setDestructiveCapability] = useState<PlatformOperationCapability | null>(null);
  const selected = subjects.find((subject) => subject.ref === selectedRef) ?? subjects[0] ?? null;
  const readiness = useMemo(() => projectPlatformRuntimeReadiness(snapshot, new Date(), kind === "dev-integration"
    ? ["dev-integration-profile", "profile-request"]
    : ["product-release", "product-runtime-lifecycle"]), [kind, snapshot]);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); }
    finally { setRefreshing(false); }
  }

  async function execute(subject: PlatformOperationSubject, capability: PlatformOperationCapability) {
    setPending(true); setError(null);
    try { await onSubmit(subject.ref, capability.capability_id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The operation was not accepted."); }
    finally { setPending(false); setDestructiveCapability(null); }
  }

  const readinessPanel = <TerasPanel fit="content" frame="padded" treatment="neutral"><TerasPanelHeader kicker="Operating Readiness" title="Platform operation path" description={readiness.detail} statusLabel={readiness.label} statusTone={readiness.tone} />
    <TerasMetadataList items={[
      { label: "Platform catalog", value: readiness.catalogState },
      { label: "Operation readback", value: readiness.operationState },
      { label: "Next authority", value: readiness.nextAction.authority },
      { label: "Next action", value: `${readiness.nextAction.code}: ${readiness.nextAction.reason}` },
      { label: "Observed", value: snapshot.observedAt },
    ]} />
    <TerasActionRow spacing="tight"><TerasActionButton disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh owner truth"}</TerasActionButton></TerasActionRow>
  </TerasPanel>;

  if (snapshot.status === "loading") return <>{readinessPanel}<TerasEmptyState fill>Loading current OOS operation truth…</TerasEmptyState></>;
  if (!snapshot.catalog) return <>{readinessPanel}<TerasEmptyState fill>{snapshot.error?.message ?? "Current OOS operation truth is unavailable. Live mode does not fall back to fixture controls."}</TerasEmptyState></>;

  return <>{readinessPanel}<TerasRecordControlLayout composition="fullscreen-register" mode="register-selected" register={<TerasRegisterPanel description="Current Platform-owned subjects and OOS-authorized capabilities. No fixture records are shown in live mode." filterBar={null} kicker={kind === "dev-integration" ? "Dev Integration" : "Governed Releases"} statusLabel={`${subjects.length} live subjects`} statusTone={readiness.ready ? "ok" : "warn"} title="Platform operation catalog">
    {subjects.length ? <TerasList fit="fill">{subjects.map((subject, index) => <TerasStatusItem ariaLabel={`Select ${subject.ref}`} key={`${subject.kind}:${subject.ref}`} index={String(index + 1).padStart(2, "0")} label={subject.ref} detail={`${subject.owner} / ${subject.source_version}`} status={readiness.actionable && subject.capabilities.some((capability) => capability.available) ? "Actionable" : "Unavailable"} tone={readiness.actionable && subject.capabilities.some((capability) => capability.available) ? "ok" : "muted"} onSelect={() => setSelectedRef(subject.ref)} />)}</TerasList> : <TerasEmptyState fill>No live subjects are published for this workspace.</TerasEmptyState>}
  </TerasRegisterPanel>} selected={selected ? <TerasSelectedPanel kicker="Live Platform Subject" title={selected.ref} selected tone="info" variant="rich" description="Actions are admitted only from this current OOS catalog version." facts={[{ label: "Owner", value: selected.owner }, { label: "Kind", value: selected.kind }, { label: "Source version", value: selected.source_version }, { label: "Catalog observed", value: snapshot.catalog.observed_at }]} action={{ kicker: "Authorized Actions", title: "Current capabilities", description: error ?? (readiness.actionable ? "Only actions currently marked available by Platform truth are executable." : readiness.detail), node: <TerasActionRow spacing="tight">{selected.capabilities.map((capability) => <TerasActionButton disabled={pending || !readiness.actionable || !capability.available} key={capability.capability_id} onClick={() => capability.destructive ? setDestructiveCapability(capability) : void execute(selected, capability)} tone={capability.destructive ? "danger" : "accent"}>{actionLabel(capability.action)}</TerasActionButton>)}</TerasActionRow> }} /> : <TerasEmptyState fill>No live subject is selected.</TerasEmptyState>} />
    <TerasDialog actions={<><TerasActionButton emphasis="secondary" onClick={() => setDestructiveCapability(null)}>Back</TerasActionButton><TerasActionButton disabled={pending || !readiness.actionable || !selected || !destructiveCapability} onClick={() => selected && destructiveCapability ? void execute(selected, destructiveCapability) : undefined} tone="danger">Confirm operation</TerasActionButton></>} contentOverflow="auto" description={destructiveCapability?.action === "dev-integration.stop" ? "Stopping the profile can stop this Console's control-plane dependencies. OOS retains the exact approved intent; recovery then follows the Platform-owned next action shown here." : "This command may remove or reset runtime state. OOS will retain the exact approved intent and Platform remains the effect authority."} height="content" kicker="Destructive Action" onClose={() => setDestructiveCapability(null)} open={Boolean(destructiveCapability)} role="alertdialog" title={`Run ${destructiveCapability ? actionLabel(destructiveCapability.action) : "operation"}?`} width="compact"><TerasMetadataList items={[{ label: "Subject", value: selected?.ref ?? "Unavailable" }, { label: "Capability", value: destructiveCapability?.capability_id ?? "Unavailable" }, { label: "Source version", value: selected?.source_version ?? "Unavailable" }]} /></TerasDialog>
  </>;
}

export function PlatformOperationHistory({ onControl, operations }: { onControl: (operationId: string, action: "cancel" | "retry", reason: string) => Promise<PlatformOperationRecord>; operations: readonly PlatformOperationRecord[] }) {
  const [cancelOperationId, setCancelOperationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!operations.length) return null;
  async function control(operationId: string, action: "cancel" | "retry", reason: string) { setPending(true); setError(null); try { await onControl(operationId, action, reason); setCancelOperationId(null); } catch (caught) { setError(caught instanceof Error ? caught.message : "The operation control was not accepted."); } finally { setPending(false); } }
  return <><TerasPanel fit="content" frame="padded" treatment="neutral"><TerasPanelHeader kicker="OOS Operations" title="Recent durable operations" description={error ?? "Terminal receipt and exact next action remain OOS-owned."} statusLabel={`${operations.length} records`} statusTone={error ? "warn" : "info"} />
    <TerasList>{operations.slice(0, 10).map((operation) => <TerasStatusItem key={operation.operation_id} label={actionLabel(operation.command.action)} detail={`${operation.next_action.authority}: ${operation.next_action.reason}`} status={operation.state} tone={operation.state === "succeeded" ? "ok" : operation.state === "failed" || operation.state === "blocked" ? "danger" : "info"} />)}</TerasList>
    <TerasMetadataList items={operations[0].provider_operation.receipt ? [{ label: "Latest receipt", value: operations[0].provider_operation.receipt.receipt_ref }, { label: "Effect", value: operations[0].provider_operation.receipt.effect }] : [{ label: "Latest next action", value: operations[0].next_action.code }]} />
    <TerasActionRow spacing="tight">{operations[0].provider_operation.retryable ? <TerasActionButton disabled={pending} onClick={() => void control(operations[0].operation_id, "retry", "Retry the retained operation after reviewing current owner truth.")}>Retry</TerasActionButton> : null}{operations[0].provider_operation.cancel_available ? <TerasActionButton disabled={pending} tone="danger" onClick={() => setCancelOperationId(operations[0].operation_id)}>Cancel</TerasActionButton> : null}</TerasActionRow>
  </TerasPanel><TerasDialog actions={<><TerasActionButton emphasis="secondary" onClick={() => setCancelOperationId(null)}>Back</TerasActionButton><TerasActionButton disabled={pending || !cancelOperationId} onClick={() => cancelOperationId ? void control(cancelOperationId, "cancel", "Cancel the retained operation without assuming rollback.") : undefined} tone="danger">Confirm cancellation</TerasActionButton></>} contentOverflow="auto" description="Cancellation stops future work but does not prove rollback of effects already retained by Platform." height="content" kicker="Cancellation Boundary" onClose={() => setCancelOperationId(null)} open={Boolean(cancelOperationId)} role="alertdialog" title="Cancel this operation?" width="compact"><TerasMetadataList items={[{ label: "Operation", value: cancelOperationId ?? "Unavailable" }, { label: "Effect posture", value: "Retained effects remain visible in the terminal receipt." }]} /></TerasDialog></>;
}

function actionLabel(action: string) { return action.split(".").at(-1)?.replaceAll("-", " ") ?? action; }
