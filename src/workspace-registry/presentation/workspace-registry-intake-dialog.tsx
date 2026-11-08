"use client";

import { useEffect, useRef, useState } from "react";
import { TerasEmptyState, TerasLoadingState, TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldStack,
  TerasRegisterPagination, TerasDraftCloseGuardDialog, TerasTechnicalDetails, TerasMetadataList, TerasSelectableRow, TerasList, TerasModalShell, TerasNoteField, TerasSelectField, TerasSignalItem, TerasTextField } from "@/teras";
import {RepositoryOnboarding} from "../../domain-workspaces/repository/index";
import { WorkspaceIntakeDialog } from "../../console-integration/workspace-intake/presentation/workspace-intake-dialog";
import { useWorkspaceIntakeLiveRuntime } from "../../console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime";
import { completedDirectIntakeCandidate, directIntakeTarget, directWorkspaceIntakeCandidate, emptyDirectIntakeDraft,
  type DirectIntakeDraft, type DirectIntakeKind } from "../../console-integration/workspace-intake/workspace-intake-direct-candidate";
import type { WorkspaceIntakeCandidate, WorkspaceIntakeDecision } from "../../console-integration/workspace-intake/workspace-intake-live-types";
import { useIntakeOwnerSetup } from "../live-runtime/use-intake-owner-setup";
import { componentTypes, deliveryTargets, graphRoles, guidedIntakeDraft, derivedIntakeRole, validationApproaches } from "../model/workspace-intake-guidance";
import type { WorkspaceRegistrySnapshot } from "../model/workspace-registry-types";

export function WorkspaceRegistryIntakeDialog({ snapshot, onClose, fixtureMode = false, initialProviderId = null, onActivateRepository }: {
  snapshot: WorkspaceRegistrySnapshot; fixtureMode?: boolean; onClose: () => void;
  initialProviderId?: string | null; onActivateRepository: (name: string, route?: "activation" | "lifecycle") => void;
}) {
  const [kind, setKind] = useState<DirectIntakeKind | "repo">("repo");
  const [repositorySelected, setRepositorySelected] = useState(Boolean(initialProviderId));
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<{ kind: DirectIntakeKind; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const requestClose = () => { if (name.trim()) setCloseGuardOpen(true); else onClose(); };
  if (repositorySelected) return <RepositoryOnboarding providerId={initialProviderId} fixtureMode={fixtureMode} onActivate={onActivateRepository} onClose={onClose} />;
  if (selected) return <DirectIntakeTarget key={`${selected.kind}:${selected.name}`} target={selected}
    snapshot={snapshot} fixtureMode={fixtureMode} onChangeTarget={() => setSelected(null)} onClose={onClose} onActivate={() => onActivateRepository(selected.name)} />;
  return <><TerasModalShell bodyLayout="scroll" height="content" width="standard" title="Workspace onboarding"
    kicker="Workspace Registry" surfaceId="workspace-registry-intake-target"
    description={fixtureMode ? "Preview only. Explore the registration forms without changing workspace records." : "Choose what you want to bring into the managed workspace. Repository onboarding reuses verified GitHub details."}
    onClose={requestClose} footer={<>
      <TerasActionButton emphasis="secondary" onClick={requestClose}>Back to Registry</TerasActionButton>
      <TerasActionButton onClick={() => { if (kind === "repo") { setRepositorySelected(true); return; } try { setSelected(directIntakeTarget(kind, name.trim())); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid target."); } }}>{kind === "repo" ? "Continue repository onboarding" : fixtureMode ? "Preview registration form" : "Continue registration"}</TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <TerasSelectField label="Registration type" value={kind} onValueChange={setKind}
        options={[{ label: "Repository — source files and Git history", value: "repo" }, { label: "Product — an application or service", value: "product" }, { label: "Component — a supporting service or library", value: "component" }]} />
      {kind !== "repo" ? <TerasContentTray kicker="Governance registration" description="Saved to Workspace Governance Git and visible to anyone who can read that repository. Choose active Governance repositories here; installation-private product and component registration is not supported." /> : null}
      {kind !== "repo" ? <TerasTextField label="Short name" value={name} onValueChange={setName} placeholder="For example team-dashboard; lowercase letters, numbers, dots, hyphens or underscores" /> : null}
      <TerasContentTray kicker="What will be registered" description={kind === "repo" ? "Onboard an existing repository using its verified GitHub details. Product and component registration are separate choices for work that needs them." : kind === "product" ? "Register a complete application or service and associate its active Governance source repositories." : "Register a separately managed service, library or plugin and select its active Governance repository. Ordinary project folders do not need component records."} />
      {error ? <TerasContentTray kicker="Target required" description={error} /> : null}
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={closeGuardOpen} kicker="Unsaved Intake target"
    title="Discard Intake Target?" description="The item name has not been submitted." leaveLabel="Discard Draft"
    onKeepEditing={() => setCloseGuardOpen(false)} onLeave={onClose} /></>;
}

function DirectIntakeTarget({ target, snapshot, fixtureMode, onChangeTarget, onClose, onActivate }: {
  target: { kind: DirectIntakeKind; name: string }; snapshot: WorkspaceRegistrySnapshot; fixtureMode: boolean;
  onChangeTarget: () => void; onClose: () => void; onActivate: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [draft, setDraft] = useState<DirectIntakeDraft>(() => ({ ...emptyDirectIntakeDraft, graphRole: target.kind === "product" ? "product-readiness-aggregate" : "" }));
  const [componentType, setComponentType] = useState("");
  const [validationRepository, setValidationRepository] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState(false);
  const [roleOverridden, setRoleOverridden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ candidate: WorkspaceIntakeCandidate; requestId?: string; decision?: WorkspaceIntakeDecision } | null>(null);
  const [building, setBuilding] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error || runtime.error) errorRef.current?.focus();
  }, [error, runtime.error]);
  const legacySnapshot = snapshot.workflow_id === "workspace-registry-view" ? snapshot.legacy_snapshot : snapshot;
  const owners = legacySnapshot.records.filter(record => record.kind === "repo" && record.posture === "active").map(record => record.name);
  const products = snapshot.records.filter(record => record.kind === "product" && record.posture === "active").map(record => record.name);
  const inInventory = snapshot.records.some(record => record.kind === target.kind && record.name === target.name);
  const busy = runtime.pending || building;
  useEffect(() => {
    if (fixtureMode || review || busy || !runtime.requestPage?.pending_request_count) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void runtime.refreshRequestPage(true).catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [fixtureMode, review, busy, runtime.requestPage, runtime.refreshRequestPage, target.kind, target.name]);
  const codeOwners = draft.sourceOwners.split(",").filter(Boolean);
  const validationSource = validationRepository || (target.kind === "component" ? draft.ownerRepo : codeOwners.length === 1 ? codeOwners[0] : draft.runtimeOwner);
  const validationRecord = snapshot.records.find(record => record.kind === "repo" && record.name === validationSource && record.posture === "active") ?? null;
  const ownerSetup = useIntakeOwnerSetup(validationRecord, fixtureMode);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const dirty = Object.entries(draft).some(([key, value]) => key === "graphRole"
    ? value !== (target.kind === "product" ? "product-readiness-aggregate" : "") : value.trim().length > 0) || Boolean(validationRepository || componentType);
  function requestLeave(next: () => void) {
    if (busy) return;
    if (dirty) setLeaveAction(() => next);
    else next();
  }
  const page = runtime.requestPage?.target.kind === target.kind && runtime.requestPage.target.name === target.name ? runtime.requestPage : null;
  const completed = page?.records.find(entry => entry.status === "succeeded") ?? null;
  useEffect(() => { if (!fixtureMode) void runtime.listDirect(target.kind, target.name).catch(() => undefined); }, [target.kind, target.name, runtime.listDirect, fixtureMode]);
  function update(field: keyof DirectIntakeDraft, value: string) { if (!busy) setDraft(current => ({ ...current, [field]: value })); }
  async function prepare() {
    if (fixtureMode || busy || !page || page.pending_request_count || inInventory) return;
    setBuilding(true); setError(null);
    try {
      const current = await runtime.listDirect(target.kind, target.name);
      if (current.pending_request_count) throw new Error("Reopen the original pending request before another classification.");
      if (!draft.notes.trim()) throw new Error(`Describe what this ${target.kind} does and what it is responsible for.`);
      if (!draft.validationPosture) throw new Error("Choose how this item will be checked.");
      const source = await ownerSetup.load();
      if (!source) throw new Error("Choose the repository with the validation plan and refresh its setup. Your entered details are kept.");
      const resolved = guidedIntakeDraft(target.kind, draft, source);
      setReview({ candidate: await directWorkspaceIntakeCandidate(target, resolved, owners, products) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Intake preparation failed."); }
    finally { setBuilding(false); }
  }
  async function reclassify() {
    if (fixtureMode || busy || !page || !completed || page.pending_request_count || inInventory) return;
    setBuilding(true); setError(null);
    try {
      const candidate = completedDirectIntakeCandidate(page, completed.request_id);
      const current = await runtime.listDirect(target.kind, target.name);
      if (current.pending_request_count) throw new Error("Reopen the original pending request before another classification.");
      // The selected completed request is immutable, including when its row
      // came from an older page. Only fresh pending visibility is reread here;
      // normal preparation and submission still bind current canonical state.
      setReview({ candidate });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Reclassification unavailable."); }
    finally { setBuilding(false); }
  }
  if (review) return <WorkspaceIntakeDialog singleReview candidate={review.candidate} initialRequestId={review.requestId} initialDecision={review.decision} onClassificationNextAction={onActivate} hasLocalDraft={dirty}
    returnLabel="Back to Registry" onClose={onClose}
    onEditCandidate={review.requestId ? undefined : () => setReview(null)} onNewCandidate={() => {
      setReview(null); void runtime.listDirect(target.kind, target.name).catch(() => undefined);
    }} />;
  const ownerOptions = [{ label: "Choose a responsible repository", value: "" }, ...owners.map(value => ({ label: value, value }))];
  const ownerField = (label: string, field: keyof DirectIntakeDraft, helper: string) => <TerasSelectField label={label} helper={helper} value={draft[field]}
    disabled={busy} onValueChange={value => update(field, value)} options={ownerOptions} />;
  const roleLabel = graphRoles.find(role => role.value === draft.graphRole)?.label ?? "Choose a component type";
  const approach = validationApproaches.find(item => item.value === draft.validationPosture);
  function selectComponentType(value: string) {
    setComponentType(value);
    setRoleOverridden(false);
    const type = componentTypes.find(item => item.value === value);
    setDraft(current => ({ ...current, componentClass: type ? "componentClass" in type ? type.componentClass : type.value : "", graphRole: derivedIntakeRole(target.kind, value, current.validationPosture) }));
    if (value === "custom") setAdvancedOpen(true);
  }
  return <><TerasModalShell busy={busy} busyLabel="Reading registration details…" bodyLayout="scroll" height="content" width="standard" title={target.kind === "product" ? "Product details" : "Component details"}
    kicker={target.name} surfaceId="workspace-registry-intake-preparation"
    description={fixtureMode ? "Preview only. Explore the guided form and sample repository setup. Live registration is disabled." : "Describe the item and choose its responsible repositories. Current source bindings and validation context are collected automatically for review."}
    onClose={() => requestLeave(onClose)} footer={<>
      <TerasActionButton emphasis="secondary" disabled={busy} onClick={() => requestLeave(onChangeTarget)}>Change item</TerasActionButton>
      <TerasActionButton disabled={fixtureMode || busy || !page || Boolean(page.pending_request_count) || inInventory}
        onClick={() => void prepare()}>Review registration</TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      {!inInventory ? <>
      <TerasContentTray kicker="Governance registration" description="Saved to Workspace Governance Git and visible to anyone who can read that repository. Choose active Governance repositories here; installation-private product and component registration is not supported." />
      <TerasContentTray kicker="1. Purpose" description="Describe the responsibility of this item in your own words.">
        <TerasFieldStack spacing="normal">
          <TerasNoteField label="What does this item do?" placeholder="Who is it for, what does it provide, and what is outside its responsibility?" value={draft.notes} disabled={busy} onValueChange={value => update("notes", value)} />
          {target.kind === "product" ? <>
            <TerasSelectField label="What will be handed over?" helper="This describes the intended result. It does not activate hosting or grant release permission."
              value={customEndpoint ? "custom" : draft.endpoint} disabled={busy} options={[{label:"Choose a delivery target",value:""},...deliveryTargets,{label:"Another delivery target",value:"custom"}]}
              onValueChange={value => { setCustomEndpoint(value === "custom"); update("endpoint", value === "custom" ? "" : value); }} />
            {customEndpoint ? <TerasTextField label="Delivery target" placeholder="Describe the intended endpoint or use its agreed component-contract name." value={draft.endpoint} disabled={busy} onValueChange={value => update("endpoint", value)} /> : null}
          </> : <TerasSelectField label="What kind of component is this?" helper="The system uses this choice to fill its validation role."
            value={componentType} disabled={busy} onValueChange={selectComponentType}
            options={[{label:"Choose a component type",value:""},...componentTypes,{label:"Another kind of component",value:"custom"}]} />}
          {target.kind === "component" ? <TerasSelectField label="Which product does it support?" helper="Optional. Shared workspace components can remain independent of a product."
            value={draft.product} disabled={busy} onValueChange={value => update("product",value)}
            options={[{label:"No product association",value:""},...products.map(value=>({label:value,value}))]} /> : null}
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="2. Responsibility" description="Choose repositories that own the work. These are responsibility decisions, not requests for repository access.">
        <TerasFieldStack spacing="normal">
          {target.kind === "product" ? <>
            {ownerField("Platform repository", "platformOwner", "Owns hosting, deployment and environment decisions.")}
            {ownerField("Runtime repository", "runtimeOwner", "Maintains and operates the delivered product.")}
            <TerasContentTray kicker="Source code repositories" description="Select the repositories responsible for the product's source code.">
              <TerasList ariaLabel="Source code repositories" frame="contained" scrollHeight="short">
                {owners.map(owner => { const selected=codeOwners.includes(owner); return <TerasSelectableRow key={owner} label={owner}
                  ariaLabel={`${selected ? "Remove" : "Add"} source repository ${owner}`} selected={selected} disabled={busy} tone={selected ? "ok" : "muted"}
                  onSelect={()=>update("sourceOwners",(selected?codeOwners.filter(value=>value!==owner):[...codeOwners,owner]).join(","))} />; })}
              </TerasList>
            </TerasContentTray>
          </> : ownerField("Responsible repository", "ownerRepo", "Maintains this component and its source code.")}
          {ownerField("Security repository", "securityOwner", "Owns the security review and security-related follow-up for this item.")}
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="3. Checks" description="Choose how quality will be checked. The system reads the repository's recorded plan and prepares its technical bindings.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="How will this item be checked?" helper={approach?.detail ?? "Choose the approach agreed with the repository responsible for these checks."}
            value={draft.validationPosture} disabled={busy} options={[{label:"Choose a validation approach",value:""},...validationApproaches]}
            onValueChange={value=>{
              setDraft(current=>({...current,validationPosture:value,graphRole:roleOverridden?current.graphRole:derivedIntakeRole(target.kind,componentType,value)}));
              if (target.kind === "product" && (value === "proposed-profile-gated" || value === "build-admitted-profile-gated")) setAdvancedOpen(true);
            }} />
          <TerasSelectField label="Repository with the validation plan" helper="Suggested from the source code or component repository. Choose another repository when it maintains the agreed checks."
            value={validationSource} disabled={busy} options={ownerOptions} onValueChange={setValidationRepository} />
          {ownerSetup.status === "loading" ? <TerasLoadingState inline label="Reading repository setup…" /> : null}
          <TerasContentTray kicker="Collected automatically" title={ownerSetup.current ? fixtureMode ? "Sample repository setup" : "Repository setup loaded" : ownerSetup.status === "loading" ? "Reading repository setup…" : "Repository setup needed"}
            description={ownerSetup.error ?? (ownerSetup.current ? "Validation context and source references will be attached for review. This is not proof that the new item passed its checks." : "Choose the repository responsible for the checks. Its current record is read automatically.")}
            actions={<TerasActionButton emphasis="secondary" disabled={busy||!validationRecord||ownerSetup.status==="loading"} onClick={()=>void ownerSetup.load()}>Refresh repository setup</TerasActionButton>}>
            <TerasMetadataList items={[{label:roleOverridden?"Role adjusted by operator":"Role filled from item type",value:roleLabel},{label:"Checks available from repository",value:ownerSetup.current?String(ownerSetup.setup?.catalogRefs.length??0):"Not read"}]} />
          </TerasContentTray>
          <TerasNoteField label="Additional checks or limits (optional)" placeholder="Add anything specific to this item that the repository’s recorded validation plan does not cover." value={draft.validationNotes} disabled={busy} onValueChange={value=>update("validationNotes",value)} />
          <TerasNoteField label="Supporting links (optional)" placeholder="One reference per line. The source-record reference is attached automatically." value={draft.evidence} disabled={busy} onValueChange={value=>update("evidence",value)} />
          <TerasActionButton emphasis="secondary" onClick={()=>setAdvancedOpen(value=>!value)}>{advancedOpen?"Hide advanced validation settings":"Advanced validation settings"}</TerasActionButton>
          {advancedOpen ? <TerasContentTray kicker="Advanced validation settings" description="Override derived metadata only when the responsible repository has an agreed different binding. Canonical validation still decides whether it is allowed.">
            <TerasFieldStack spacing="normal">
              {componentType==="custom"?<TerasTextField label="Component category" value={draft.componentClass} disabled={busy} onValueChange={value=>update("componentClass",value)} />:null}
              <TerasSelectField label="Validation role override" helper="The normal role is derived from the item type; this is an explicit repository-defined exception."
                value={draft.graphRole} disabled={busy} options={[{label:"Choose the agreed role",value:""},...graphRoles]} onValueChange={value=>{setRoleOverridden(true);update("graphRole",value);}} />
              <TerasTextField label="Check binding overrides (optional)" placeholder="Exact existing catalog keys, comma-separated. Leave blank to use the recorded repository bindings when required."
                value={draft.catalogRefs} disabled={busy} onValueChange={value=>update("catalogRefs",value)} />
              {ownerSetup.current&&ownerSetup.setup?<TerasTechnicalDetails summary="Collected source details" items={[
                {label:"Source record",value:ownerSetup.setup.evidenceRef},{label:"Source record version",value:String(ownerSetup.setup.version)},
                {label:"Record digest",value:ownerSetup.setup.digest},{label:"Recorded repository checks",value:ownerSetup.setup.catalogRefs.join(", ")||"No direct checks recorded"},
                {label:"Recorded repository plan",value:ownerSetup.setup.notes},{label:"Derived role",value:draft.graphRole},
              ]}/>:null}
            </TerasFieldStack>
          </TerasContentTray>:null}
        </TerasFieldStack>
      </TerasContentTray>
      </> : null}
      <TerasContentTray kicker="Onboarding requests"
        description={fixtureMode ? "Preview only; no service journal is loaded and no classification can be submitted." : page ? `${page.pending_request_count} pending request(s) across all pages. Reopen reads the original request without resubmitting.`
          : runtime.error?.message ?? "Reading the native journal. New classification requires a successful read."}
        actions={<TerasActionRow>

          {completed ? <TerasActionButton emphasis="secondary" disabled={busy || Boolean(page?.pending_request_count) || inInventory}
            onClick={() => void reclassify()}>Reclassify completed candidate</TerasActionButton> : null}
        </TerasActionRow>}>
        {runtime.error ? <TerasEmptyState><TerasActionButton emphasis="secondary" disabled={busy || fixtureMode} onClick={() => void runtime.listDirect(target.kind, target.name).catch(() => undefined)}>Retry request history</TerasActionButton></TerasEmptyState> : runtime.pending && !page ? <TerasLoadingState label="Loading request history…" /> : page && !page.records.length ? <TerasEmptyState>No previous onboarding requests for this item.</TerasEmptyState> : null}
        {!fixtureMode && !runtime.error && page && (page.records.length > 0 || runtime.hasPreviousRequestPage || page.next_cursor) ? <TerasRegisterPagination label="Workspace onboarding requests" offset={runtime.requestPageOffset} count={page?.records.length ?? 0} page={runtime.requestPageNumber}
          pending={runtime.pending} unavailable={Boolean(runtime.error)} hasPrevious={!busy && runtime.hasPreviousRequestPage} hasNext={!busy && Boolean(page?.next_cursor)}
          onPrevious={()=>void runtime.previousRequestPage().catch(()=>undefined)} onNext={()=>void runtime.nextRequestPage().catch(()=>undefined)} /> : null}
        {page?.records.length ? <TerasList frame="contained" scrollHeight="short">
          {page.records.map(entry => <TerasSignalItem key={entry.request_id} label={entry.request_id}
            title={`${entry.classification} / ${entry.status}`} detail={entry.updated_at} tone="info"
            {...(busy ? { statusLabel: "Reading" } : { ariaLabel: `Reopen original request ${entry.request_id}`,
              actionLabel: "Reopen original request", onSelect: () => requestLeave(() => setReview({ requestId: entry.request_id, decision: entry.classification,
                candidate: { label: target.name, target, source: entry.candidate.source,
                  requested_record: entry.candidate.requested_record, evidence_refs: entry.candidate.evidence_refs } })) })} />)}
        </TerasList> : null}
      </TerasContentTray>
      {completed ? <TerasContentTray kicker="Completed candidate origin"
        description={`Reclassification reuses ${completed.request_id} with its original source and recorded metadata, then opens a fresh explicit Decision / Review. Changing new-entrant fields is a different candidate, not a change of classification.`} /> : null}
      {inInventory ? <TerasContentTray kicker="Already in Inventory" description="Use Registry to inspect this record. The retained Intake history remains readable; admission is not repeated." /> : null}

      {error || runtime.error ? <div ref={errorRef} role="alert" tabIndex={-1}>
        <TerasContentTray kicker={runtime.error ? "Registration source unavailable" : "Check registration details"} description={error ?? runtime.error!.message} />
      </div> : null}
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={Boolean(leaveAction)} kicker="Unsaved registration"
    title="Discard Intake Draft?" description="Your registration details have not been submitted." leaveLabel="Discard Draft"
    onKeepEditing={()=>setLeaveAction(null)} onLeave={()=>{const next=leaveAction;setLeaveAction(null);setDraft({...emptyDirectIntakeDraft,graphRole:target.kind==="product"?"product-readiness-aggregate":""});next?.();}} /></>;
}
