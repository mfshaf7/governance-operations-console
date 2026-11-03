"use client";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDraftCloseGuardDialog,
  TerasFieldStack, TerasList, TerasMetadataList, TerasModalShell, TerasNoteField,
  TerasSelectField, TerasSignalItem, TerasTechnicalDetails, TerasTextField } from "@/teras";
import { WorkspaceIntakeDialog } from "@/console-integration/workspace-intake/presentation/workspace-intake-dialog.tsx";
import { useWorkspaceIntakeLiveRuntime } from "@/console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime.ts";
import { validationApproaches } from "@/console-integration/workspace-intake/workspace-intake-display-options.ts";
import type { WorkspaceIntakeCandidate, WorkspaceIntakeCustodyPreparation, WorkspaceIntakeDecision } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";
import { useIntakeOwnerSetup } from "@/workspace-registry/live-runtime/use-intake-owner-setup.ts";
import type { IntakeOwnerSetup } from "@/workspace-registry/model/workspace-intake-guidance.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryIntakeCustody, repositoryIntakeRecord, type RepositoryIntakeDraft } from "./repository-intake-candidate.ts";
import { repositoryIntakeDraftFromCustody, repositoryIntakeMissingFields, repositoryIntakeRequiresCatalog,
  repositoryIntakeRoles, repositoryIntakeTypeDraft, repositoryIntakeTypes } from "./repository-intake-guidance.ts";
import { RepositoryOwnerBootstrapDialog } from "./repository-owner-bootstrap-dialog.tsx";

function withOwnerChecks(draft: RepositoryIntakeDraft, setup: IntakeOwnerSetup | null): RepositoryIntakeDraft {
  if (!setup) return draft;
  return { ...draft, catalogRefs: setup.catalogRefs.join(","),
    validationNotes: `Recorded check plan from ${setup.repository}: ${setup.notes}\nThis is a plan, not evidence that these checks have passed.${draft.validationNotes.trim() ? `\nAdditional notes: ${draft.validationNotes.trim()}` : ""}` };
}

export function RepositoryIntakeDialog({ repository, custodyResult, ownerRepositories = [], classification, onClose }: {
  repository: RepositoryWorkspaceRecord;
  custodyResult: RepositoryCustodyWorkflowResult;
  ownerRepositories?: readonly string[];
  classification?: WorkspaceIntakeDecision;
  onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [initialDraft] = useState(() => repositoryIntakeDraftFromCustody(custodyResult));
  const [draft, setDraft] = useState(initialDraft);
  const [recordedFormState, setRecordedFormState] = useState<string | null>(null);
  const [repositoryType, setRepositoryType] = useState("");
  const [checkOwner, setCheckOwner] = useState("");
  const [manualChecks, setManualChecks] = useState(false);
  const [customSecurityOwner, setCustomSecurityOwner] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [ownerSetup, setOwnerSetup] = useState(false);
  const [review, setReview] = useState<{ candidate: WorkspaceIntakeCandidate; custody?: WorkspaceIntakeCustodyPreparation; requestId?: string } | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const custody = repositoryIntakeCustody(repository, custodyResult);
  const targetName = custody?.target.name, custodyRequestId = custody?.requestId;
  const busy = runtime.pending || preparing;
  const needsCatalog = repositoryIntakeRequiresCatalog(draft.validationPosture);
  const checks = useIntakeOwnerSetup(null, false, needsCatalog && !manualChecks ? checkOwner : "");
  const effectiveDraft = withOwnerChecks(draft, needsCatalog && !manualChecks && checks.current ? checks.setup : null);
  const issues = repositoryIntakeMissingFields(effectiveDraft);
  if (needsCatalog && !manualChecks && !checks.current) {
    issues.push(checkOwner ? "Wait for the selected owner's check plan, or refresh it." : "Choose the repository that owns the registered checks.");
  }
  const formState = JSON.stringify({ draft, repositoryType, checkOwner, manualChecks, customSecurityOwner });
  const dirty = recordedFormState !== null ? formState !== recordedFormState
    : Object.entries(draft).some(([key, value]) => value !== initialDraft[key as keyof RepositoryIntakeDraft]) || Boolean(repositoryType || checkOwner || manualChecks || customSecurityOwner);
  const ownerSetupAvailable = classification === "proposed" || classification === "admitted";
  useEffect(() => {
    if (targetName && custodyRequestId) void runtime.list(targetName, custodyRequestId).catch(() => undefined);
  }, [targetName, custodyRequestId, runtime.list]);
  useEffect(() => { if ((attempted && issues.length) || preparationError || runtime.error) errorRef.current?.focus(); }, [attempted, preparationError, runtime.error]);

  function update(field: keyof RepositoryIntakeDraft, value: string) {
    if (busy) return;
    setPreparationError(null);
    setDraft(current => ({ ...current, [field]: value }));
  }
  function requestLeave(next: () => void) {
    if (busy) return;
    if (dirty) setLeaveAction(() => next);
    else next();
  }
  function refreshJournal() {
    if (targetName && custodyRequestId) void runtime.list(targetName, custodyRequestId).catch(() => undefined);
  }
  async function prepare() {
    if (!custody || busy || !runtime.requestPage || runtime.requestPage.pending_request_count) return;
    setAttempted(true); setPreparationError(null);
    if (issues.length) { errorRef.current?.focus(); return; }
    setPreparing(true);
    try {
      // Re-read selected check bindings before preparing; stale cached values
      // never silently become a manual override or successful owner plan.
      const setup = needsCatalog && !manualChecks ? await checks.load() : null;
      if (needsCatalog && !manualChecks && !setup) throw new Error("The selected owner's check plan could not be read. Your draft is kept; refresh the plan to continue.");
      const resolved = withOwnerChecks(draft, setup);
      const requestedRecord = repositoryIntakeRecord(resolved);
      if (!requestedRecord) throw new Error(repositoryIntakeMissingFields(resolved).join(" "));
      const selection = { request_id: custody.requestId, requested_record: requestedRecord };
      const preparation = await runtime.prepare({ target: custody.target }, selection);
      const source = preparation.source_candidate;
      if (!source || source.requested_record.kind !== "repo") throw new Error("The owner did not return a registration candidate for this repository. Your draft is kept.");
      setReview({ custody: selection, candidate: {
        label: repository.name, target: { kind: source.target.kind, name: source.target.name },
        source: source.source, requested_record: source.requested_record, evidence_refs: source.evidence_refs,
      } });
    } catch (failure) { setPreparationError(failure instanceof Error ? failure.message : "Registration details could not be prepared."); }
    finally { setPreparing(false); }
  }
  function returnToForm() { setReview(null); refreshJournal(); }
  if (ownerSetup && targetName && custodyRequestId) return <RepositoryOwnerBootstrapDialog key={`${targetName}:${custodyRequestId}`} ownerRepo={targetName} custodyRequestId={custodyRequestId} onClose={() => setOwnerSetup(false)} />;
  if (review) return <WorkspaceIntakeDialog candidate={review.candidate} repositoryCustody={review.custody}
    onRequestRecorded={() => setRecordedFormState(formState)}
    initialRequestId={review.requestId} onNewCandidate={returnToForm} returnLabel="Back to registration" onClose={returnToForm} />;
  return <><TerasModalShell busy={busy} busyLabel="Reading registration details…" bodyLayout="scroll" height="content" width="standard"
    kicker="Workspace registration" title="Register repository" surfaceId="repository-intake-preparation"
    description="Describe what this repository owns and how it will be checked. You will review its classification before anything is submitted."
    onClose={() => requestLeave(onClose)} footer={<>
      <TerasActionButton emphasis="secondary" disabled={busy} onClick={() => requestLeave(onClose)}>Back to Repository</TerasActionButton>
      <TerasActionButton busy={busy} disabled={!custody || busy || !runtime.requestPage || Boolean(runtime.requestPage.pending_request_count)} onClick={() => void prepare()}>
        {busy ? "Reading registration details…" : "Review registration"}
      </TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <TerasContentTray kicker="Repository" description="Collected from the completed creation or attachment. You do not need to enter provider IDs or request references.">
        <TerasMetadataList items={[
          { label: "Repository", value: repository.githubUrl },
          { label: "Workspace name", value: targetName ?? "Matching custody unavailable" },
        ]} />
      </TerasContentTray>
      <TerasContentTray kicker="1. Purpose" description="Choose its responsibility. This fills the category and validation role for your review.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="What will this repository contain?" value={repositoryType} disabled={busy}
            options={[{ label: "Choose a repository type", value: "" }, ...repositoryIntakeTypes, { label: "Another repository type", value: "custom" }]}
            onValueChange={value => { if (busy) return; setRepositoryType(value); setDraft(current => repositoryIntakeTypeDraft(current, value)); if (value === "custom") setAdvancedOpen(true); }} />
          {repositoryType === "custom" ? <TerasTextField label="Repository category" placeholder="Use the agreed category name, such as product-source. Lowercase letters, numbers and hyphens."
            value={draft.repoClass} disabled={busy} onValueChange={value => update("repoClass", value)} /> : null}
          <TerasNoteField label="What does this repository own?" minimumHeight="medium" value={draft.notes} disabled={busy}
            placeholder="For example: Owns the client portal source and tests. Hosting, shared services and security policies belong to their existing owners."
            onValueChange={value => update("notes", value)} />
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="2. Source validation" description="Registration needs source-review controls, not a finished application or test plan. Application verification can be configured later, before operational handover.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="Who owns the source checks?" value={draft.validationPosture} disabled={busy}
            helper={validationApproaches.find(item => item.value === draft.validationPosture)?.detail ?? "Choose who runs the checks. Application repositories normally maintain their own source controls."}
            options={[{ label: "Choose a check approach", value: "" }, ...validationApproaches]}
            onValueChange={value => {
              update("validationPosture", value);
              if (draft.graphRole && !repositoryIntakeRoles(value).some(role => role.value === draft.graphRole)) {
                setDraft(current => ({ ...current, validationPosture: value, graphRole: "" })); setAdvancedOpen(true);
              }
            }} />
          {needsCatalog && !manualChecks ? <>
            <TerasSelectField label="Which repository owns the registered checks?" value={checkOwner} disabled={busy}
              helper="Reads the selected owner's recorded check IDs and plan automatically. No check is created or run."
              options={[{ label: "Choose the check owner", value: "" }, ...ownerRepositories.map(value => ({ label: value, value }))]}
              onValueChange={value => { setPreparationError(null); setCheckOwner(value); }} />
            {checks.current && checks.setup ? <TerasContentTray kicker="Recorded check plan" description={checks.setup.notes} /> : null}
            {checkOwner ? <TerasContentTray kicker={checks.status === "loading" ? "Reading check plan" : checks.error ? "Check plan unavailable" : "Check bindings"}
              description={checks.error ?? (checks.status === "loading" ? "Reading the selected owner's current plan…" : checks.setup?.catalogRefs.length ? `${checks.setup.catalogRefs.length} registered check binding(s) collected.` : "This owner has no registered checks for this approach. Choose another owner or use repository-run tests.")}
              actions={<TerasActionButton emphasis="secondary" disabled={busy || checks.status === "loading"} onClick={() => { setPreparationError(null); void checks.load(); }}>Refresh check plan</TerasActionButton>} /> : null}
          </> : null}
          <TerasNoteField label={needsCatalog && !manualChecks ? "Additional check notes (optional)" : "Source-check notes (optional for repository-owned controls)"}
            minimumHeight="medium" value={draft.validationNotes} disabled={busy}
            placeholder="Add any existing source-check arrangement. You can leave this blank for repository-owned controls; application testing is configured separately."
            onValueChange={value => update("validationNotes", value)} />
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="3. Security responsibility" description="A security binding is an explicit link to controls maintained by a security owner. It is separate from repository visibility or ordinary security review.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="Does the agreed design require a security binding?" value={draft.securityBinding} disabled={busy}
            helper="Choose Yes only when that requirement is part of the security design. This selection grants no access or credentials."
            options={[{ label: "Choose the security requirement", value: "" }, { label: "No dedicated security binding", value: "false" }, { label: "Yes, a dedicated security binding is required", value: "true" }]}
            onValueChange={value => update("securityBinding", value)} />
          {draft.securityBinding === "true" ? <>
            <TerasSelectField label="Which repository owns the security binding?" value={customSecurityOwner ? "custom" : draft.securityOwner} disabled={busy}
              helper="Select the responsible owner. Security-bound registration needs its separate reviewed owner change."
              options={[{ label: "Choose a security owner", value: "" }, ...ownerRepositories.map(value => ({ label: value, value })), { label: "An owner outside this list", value: "custom" }]}
              onValueChange={value => { setCustomSecurityOwner(value === "custom"); update("securityOwner", value === "custom" ? "" : value); }} />
            {customSecurityOwner ? <TerasTextField label="Security owner repository name" placeholder="The agreed repository short name, for example security-architecture."
              value={draft.securityOwner} disabled={busy} onValueChange={value => update("securityOwner", value)} /> : null}
          </> : null}
        </TerasFieldStack>
      </TerasContentTray>
      <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy} onClick={() => setAdvancedOpen(open => !open)}>{advancedOpen ? "Hide advanced settings" : "Advanced settings"}</TerasActionButton></TerasActionRow>
      {advancedOpen ? <TerasContentTray kicker="Advanced settings" description="Override derived metadata only for an agreed owner configuration. Canonical validation still checks every choice.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="Validation role" value={draft.graphRole} disabled={busy}
            helper="Normally filled from the repository type. Proposed and implementation-only profiles support only the roles shown here."
            options={[{ label: "Choose a validation role", value: "" }, ...repositoryIntakeRoles(draft.validationPosture)]}
            onValueChange={value => update("graphRole", value)} />
          {needsCatalog ? <TerasSelectField label="Registered check bindings" value={manualChecks ? "manual" : "owner"} disabled={busy}
            helper="Use the owner's recorded plan when available. Manual IDs must already exist in the validation catalog."
            options={[{ value: "owner", label: "Collect from the selected owner" }, { value: "manual", label: "Use explicitly reviewed check IDs" }]}
            onValueChange={value => setManualChecks(value === "manual")} /> : null}
          {manualChecks || !needsCatalog ? <TerasTextField label="Registered check IDs (optional unless this approach invokes checks)" value={draft.catalogRefs} disabled={busy}
            placeholder="Existing catalog IDs, separated by commas. Do not enter test commands or invent IDs."
            onValueChange={value => update("catalogRefs", value)} /> : null}
        </TerasFieldStack>
      </TerasContentTray> : null}
      <TerasContentTray kicker="Owner setup" description={ownerSetupAvailable
        ? "A proposed or admitted classification is recorded. Owner setup can inspect the repository's review controls and planned checks before active registration."
        : "Owner setup needs a recorded Proposed or Admitted classification. Review the classification first; setup does not need to be completed to propose this repository."}
        actions={<TerasActionButton emphasis="secondary" disabled={!custody || busy || !ownerSetupAvailable} onClick={() => setOwnerSetup(true)}>Review owner setup</TerasActionButton>} />
      <TerasContentTray kicker="Previous registration requests"
        description={runtime.requestPage ? runtime.requestPage.pending_request_count
          ? "A registration request is still pending. Open it below before starting another."
          : runtime.requestPage.records.length ? "Open an earlier request to inspect its original decision and result." : "No previous registration requests."
          : runtime.error ? "Registration history could not be read. Refresh it before starting a review." : "Reading registration history…"}
        actions={<TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={!targetName || !custodyRequestId || busy} onClick={refreshJournal}>Refresh registration history</TerasActionButton>
          {runtime.requestPage?.next_cursor ? <TerasActionButton emphasis="secondary" disabled={busy}
            onClick={() => { if (targetName && custodyRequestId) void runtime.list(targetName, custodyRequestId, runtime.requestPage!.next_cursor).catch(() => undefined); }}>More requests</TerasActionButton> : null}
        </TerasActionRow>}>
        {runtime.requestPage?.records.length ? <TerasList frame="contained" scrollHeight="short">
          {runtime.requestPage.records.map(entry => <TerasSignalItem key={entry.request_id}
            label={repository.name} title={`${entry.classification === "admitted" ? "Admitted" : entry.classification === "proposed" ? "Proposed" : "Out of scope"} · ${entry.status.replaceAll("-", " ")}`} detail={new Date(entry.updated_at).toLocaleString()}
            {...(busy ? { statusLabel: "Reading" } : { ariaLabel: `Open registration request ${entry.request_id}`, actionLabel: "Open request", onSelect: () => requestLeave(() => setReview({ requestId: entry.request_id,
              candidate: { label: repository.name, target: { kind: entry.candidate.target.kind, name: entry.candidate.target.name },
                requested_record: entry.candidate.requested_record, source: entry.candidate.source, evidence_refs: entry.candidate.evidence_refs } })) })} tone="info" />)}
        </TerasList> : null}
      </TerasContentTray>
      <TerasTechnicalDetails summary="Registration technical details" items={[
        { label: "Custody request", value: custody?.requestId ?? "Unavailable" },
        { label: "Repository category", value: draft.repoClass || "Not selected" },
        { label: "Validation approach", value: draft.validationPosture || "Not selected" },
        { label: "Validation role", value: draft.graphRole || "Not selected" },
        { label: "Registered check IDs", value: effectiveDraft.catalogRefs || "No direct checks selected" },
        ...(checks.current && checks.setup ? [{ label: "Check owner source", value: checks.setup.evidenceRef }] : []),
        ...(runtime.requestPage?.records ?? []).map(entry => ({ label: "Original registration request", value: entry.request_id })),
      ]} />
      {(attempted && issues.length > 0) || preparationError || runtime.error || !custody ? <div ref={errorRef} tabIndex={-1} role="alert">
        <TerasContentTray kicker="Check registration details" description={preparationError ?? runtime.error?.message ?? (!custody ? "A successful custody receipt for this exact repository is required." : undefined)}>
          {attempted && issues.length ? <ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
        </TerasContentTray>
      </div> : null}
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={Boolean(leaveAction)} kicker="Unsaved registration"
    title="Discard registration draft?" description="Your registration details have not been submitted." leaveLabel="Discard Draft"
    onKeepEditing={() => setLeaveAction(null)} onLeave={() => { const next = leaveAction; setLeaveAction(null); setDraft(initialDraft); setRecordedFormState(null); setRepositoryType(""); setCheckOwner(""); setManualChecks(false); setCustomSecurityOwner(false); setAttempted(false); next?.(); }} /></>;
}
