"use client";

import { useEffect, useMemo, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDialog, TerasEmptyState, TerasLoadingState, TerasFieldStack, TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasRecordControlLayout, TerasRegisterPanel, TerasSelectedPanel, TerasStatusItem, TerasTechnicalDetails } from "@/teras";
import type { PlatformOperationAction, PlatformOperationCapability, PlatformOperationRecord, PlatformOperationSubject, PlatformOperationsLiveSnapshot } from "../../live-runtime/platform-operation-types.ts";
import { projectPlatformRuntimeReadiness } from "../../read-model/platform-runtime-readiness.ts";
import { operationStateLabel, platformActionContext, platformActionLabel, platformSubjectLabel, workspaceSubjectKinds } from "../../read-model/platform-operation-display.ts";
export { PlatformOperationHistory } from "./platform-operation-history";

type ReviewedAction = { subjectRef: string; sourceVersion: string; capabilityId: string; action: PlatformOperationCapability["action"] };

export function PlatformOperationsLiveSurface({ kind, onRefresh, onSubmit, snapshot, focusRecordRef, controlsOnly = false, selectedSubjectRef, actionFilter }: {
  controlsOnly?: boolean;
  selectedSubjectRef?: string;
  actionFilter?: readonly PlatformOperationAction[];
  kind: "dev-integration" | "governed-releases";
  onControl: (operationId: string, action: "cancel" | "retry", reason: string) => Promise<PlatformOperationRecord>;
  onRefresh: () => Promise<unknown>;
  onSubmit: (subjectRef: string, capabilityId: string, input?: Record<string, unknown>, reviewedSourceVersion?: string) => Promise<PlatformOperationRecord>;
  snapshot: PlatformOperationsLiveSnapshot; focusRecordRef?: string | null;
}) {
  const subjects = useMemo(() => (snapshot.catalog?.subjects ?? []).filter(subject => workspaceSubjectKinds(kind).includes(subject.kind) && (!selectedSubjectRef || subject.ref === selectedSubjectRef)), [kind, snapshot.catalog, selectedSubjectRef]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  useEffect(() => {
    const operation = snapshot.operations.find(item => item.operation_id === focusRecordRef);
    const ref = operation?.command.subject.ref ?? focusRecordRef;
    if (ref && subjects.some(subject => subject.ref === ref)) setSelectedRef(ref);
  }, [focusRecordRef, snapshot.operations, subjects]);
  const selected = subjects.find(subject => subject.ref === selectedRef) ?? subjects[0] ?? null;
  const readiness = projectPlatformRuntimeReadiness(snapshot, new Date(), workspaceSubjectKinds(kind));
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedAction | null>(null);
  const [recordedOutcome, setOutcome] = useState<PlatformOperationRecord | null>(null);
  const outcome = snapshot.operations.find(operation => operation.operation_id === recordedOutcome?.operation_id) ?? recordedOutcome;
  const boundSubject = subjects.find(subject => subject.ref === reviewed?.subjectRef && subject.source_version === reviewed.sourceVersion);
  const boundCapability = boundSubject?.capabilities.find(capability => capability.capability_id === reviewed?.capabilityId && capability.action === reviewed.action && capability.destructive);
  const confirmationCurrent = Boolean(readiness.actionable && boundSubject && boundCapability?.available && !platformActionContext(boundCapability.action));

  async function refresh() {
    setRefreshing(true); setError(null);
    try { await onRefresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The connection could not be refreshed."); }
    finally { setRefreshing(false); }
  }
  async function execute(subject: PlatformOperationSubject, capability: PlatformOperationCapability) {
    const current = subjects.find(item => item.ref === subject.ref && item.source_version === subject.source_version);
    const permitted = current?.capabilities.find(item => item.capability_id === capability.capability_id && item.action === capability.action && item.available);
    if (pending || !projectPlatformRuntimeReadiness(snapshot, new Date(), workspaceSubjectKinds(kind)).actionable || !current || !permitted || platformActionContext(permitted.action)) {
      setError("This action or its source has changed. Refresh and review it again."); return;
    }
    setPending(true); setError(null);
    try { setOutcome(await onSubmit(current.ref, permitted.capability_id, {}, current.source_version)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The operation outcome is unavailable. Inspect the original operation in history before trying another."); }
    finally { setPending(false); setReviewed(null); }
  }
  function selectAction(subject: PlatformOperationSubject, capability: PlatformOperationCapability) {
    if (capability.destructive) setReviewed({ subjectRef: subject.ref, sourceVersion: subject.source_version, capabilityId: capability.capability_id, action: capability.action });
    else void execute(subject, capability);
  }
  const connection = <TerasPanel spacing="normal" fit="content" frame="padded" treatment="neutral">
    <TerasPanelHeader kicker="Connection" title={snapshot.status === "loading" ? "Reading available actions" : snapshot.catalog ? snapshot.status === "current" ? "Connected Platform actions" : "Retained Platform actions" : "Platform connection unavailable"}
      description={error ?? (readiness.catalogState === "current" ? "Choose an existing profile and an available action. An action result does not change profile admission or approve a release." : readiness.detail)}
      statusLabel={snapshot.status === "current" && readiness.catalogState === "current" ? "Connected" : readiness.label} statusTone={snapshot.status === "current" && readiness.catalogState === "current" ? "info" : readiness.tone}
      actions={<TerasActionButton busy={refreshing} emphasis="secondary" disabled={refreshing || pending} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh"}</TerasActionButton>}/>
    <TerasTechnicalDetails summary="Connection details" items={[{label:"Catalog",value:readiness.catalogState},{label:"History read",value:readiness.operationState},{label:"Observed",value:snapshot.observedAt},{label:"Next authority",value:readiness.nextAction.authority},{label:"Owner next action",value:`${readiness.nextAction.code}: ${readiness.nextAction.reason}`} ]}/>
  </TerasPanel>;
  if (snapshot.status === "loading") return <>{connection}<TerasLoadingState fill label="Loading profiles and operation history…" /></>;
  if (!snapshot.catalog) return <>{connection}<TerasEmptyState fill>{snapshot.error?.message ?? "The current action catalog is unavailable. Retained history remains available below."}</TerasEmptyState></>;
  const direct = selected?.capabilities.filter(capability => !platformActionContext(capability.action) && (!actionFilter || actionFilter.includes(capability.action))) ?? [];
  const contextual = selected?.capabilities.filter(capability => platformActionContext(capability.action) && (!actionFilter || actionFilter.includes(capability.action))) ?? [];
  const selectedPanel = selected ? <TerasSelectedPanel kicker={kind === "dev-integration" ? "Selected profile" : "Selected product"} title={platformSubjectLabel(selected.ref)} selected tone="info" variant="rich"
        description={snapshot.status === "current" ? "Only supported actions from the current provider are available here." : "Retained record. Refresh the connection before starting another action."} facts={[{label:"Operation owner",value:selected.owner}]}
        action={{kicker:"Profile operations",title:direct.length ? "Available actions" : contextual.length ? "Action details" : "No controls for this view",description:error ?? (!direct.length && !contextual.length ? "The owner does not publish an executable control for this view." : readiness.actionable ? "Each action records its own operation and outcome." : readiness.detail),node:<TerasFieldStack spacing="normal">
          {direct.length ? <TerasActionRow spacing="tight">{direct.map(capability => <TerasActionButton key={capability.capability_id} title={capability.unavailable_reason ?? undefined} disabled={pending || !readiness.actionable || !capability.available}
            tone={capability.destructive ? "danger" : "accent"} onClick={() => selectAction(selected,capability)}>{platformActionLabel(capability.action)}</TerasActionButton>)}</TerasActionRow> : null}
          {direct.filter(capability => !capability.available && capability.unavailable_reason).map(capability => <TerasStatusItem key={capability.capability_id} label={platformActionLabel(capability.action)} status="Unavailable" detail={capability.unavailable_reason} tone="warn"/>)}
          {contextual.some(capability => capability.action.startsWith("agent-source.")) ? <TerasContentTray kicker="Source access" description="Authorize, renew or revoke access from the project's Source authoring workflow. These actions need its approved repository and source session."/> : null}
          {contextual.filter(capability => !capability.action.startsWith("agent-source.")).map(capability => <TerasStatusItem key={capability.capability_id} label={platformActionLabel(capability.action)} status="Use its workflow" detail={platformActionContext(capability.action)} tone="info"/>)}
          <TerasTechnicalDetails summary="Profile and capability details" items={[{label:"Profile reference",value:selected.ref},{label:"Source version",value:selected.source_version},{label:"Catalog observation",value:snapshot.catalog.observed_at},...selected.capabilities.map(capability => ({label:platformActionLabel(capability.action),value:`${capability.capability_id} · ${capability.available ? "advertised available" : "unavailable"}`}))]}/>
        </TerasFieldStack>}}/> : <TerasEmptyState fill>No current controls are published for this profile. Registry visibility does not grant runtime access.</TerasEmptyState>;
  return <>
    {controlsOnly ? null : connection}
    {controlsOnly ? selectedPanel : <TerasRecordControlLayout composition="fullscreen-register" mode="register-selected"
      register={<TerasRegisterPanel description="Profiles reported by the connected Platform provider." filterBar={null} kicker={kind === "dev-integration" ? "Dev Integration" : "Governed Releases"}
        statusLabel={`${subjects.length} ${kind === "dev-integration" ? "items" : "products"}${snapshot.status === "current" ? "" : " · retained"}`} statusTone={snapshot.status === "current" ? "info" : "warn"} title={kind === "dev-integration" ? "Integration profiles" : "Connected products"}>
        {subjects.length ? <TerasList fit="fill">{subjects.map((subject,index) => <TerasStatusItem ariaLabel={`Select ${subject.ref}`} key={`${subject.kind}:${subject.ref}`} index={String(index+1).padStart(2,"0")}
          label={platformSubjectLabel(subject.ref)} detail={subject.owner} status={readiness.actionable && subject.capabilities.some(capability => capability.available && !platformActionContext(capability.action)) ? "Actions available" : "View only"}
          tone={subject.ref === selected?.ref ? "info" : "muted"} onSelect={() => setSelectedRef(subject.ref)}/>)}</TerasList> : <TerasEmptyState fill>No products or profiles are published for this workspace by the connected provider.</TerasEmptyState>}
      </TerasRegisterPanel>}
      selected={selectedPanel}/>}
    {!controlsOnly && kind === "dev-integration" && !subjects.some(subject => subject.capabilities.some(capability => capability.action === "dev-integration.request-profile" && capability.available)) ? <TerasContentTray kicker="Profile management" title="Profile requests are not connected" description="This provider supplies operations for existing profiles. New profile requests and the detailed profile dashboard still need their owner integration; sample dashboards are available only in design preview."/> : null}
    <TerasDialog open={Boolean(reviewed)} onClose={() => {if(!pending)setReviewed(null);}} closeDisabled={pending} contentOverflow="auto" height="content" width="compact" role="alertdialog" kicker="Confirm profile action"
      title={reviewed ? `${platformActionLabel(reviewed.action)}?` : "Confirm action"}
      description={confirmationCurrent ? "Confirm this action for the reviewed profile. Stopping it can interrupt dependent services; the owner controls recovery." : "The action or its source is no longer current. Go back, refresh and review it again."}
      actions={<><TerasActionButton emphasis="secondary" disabled={pending} onClick={() => setReviewed(null)}>Back</TerasActionButton><TerasActionButton tone="danger" disabled={pending || !confirmationCurrent} onClick={() => {if(boundSubject&&boundCapability)void execute(boundSubject,boundCapability);}}>Confirm operation</TerasActionButton></>}>
      <TerasMetadataList items={[{label:"Profile",value:reviewed ? platformSubjectLabel(reviewed.subjectRef) : "Unavailable"}]}/>
    </TerasDialog>
    <TerasDialog open={Boolean(outcome)} onClose={() => setOutcome(null)} contentOverflow="auto" height="content" width="standard" kicker="Operation recorded" title={outcome?.state === "succeeded" ? "Operation completed" : outcome?.state === "failed" ? "Operation failed" : outcome?.state === "blocked" ? "Operation blocked" : outcome?.state === "cancelled" ? "Operation cancelled" : "Operation submitted"}
      description="Inspect this original operation in history for its latest owner result and receipt." actions={<TerasActionButton onClick={() => setOutcome(null)}>Done</TerasActionButton>}>
      {outcome ? <TerasMetadataList items={[{label:"Action",value:platformActionLabel(outcome.command.action)},{label:"Profile",value:platformSubjectLabel(outcome.command.subject.ref)},{label:"State",value:operationStateLabel(outcome.state)},{label:"Operation",value:outcome.operation_id}]}/> : null}
    </TerasDialog>
  </>;
}
