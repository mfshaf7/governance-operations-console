"use client";

import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDraftCloseGuardDialog,
  TerasFieldStack, TerasLoadingState, TerasList, TerasMetadataList, TerasModalShell, TerasNoteField,
  TerasSelectField, TerasSignalItem, TerasTechnicalDetails, TerasTextField } from "@/teras";
import { WorkspaceIntakeDialog } from "@/console-integration/workspace-intake/presentation/workspace-intake-dialog.tsx";
import { useWorkspaceIntakeLiveRuntime } from "@/console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime.ts";
import type { WorkspaceIntakeCandidate, WorkspaceIntakeCustodyPreparation, WorkspaceIntakeDecision } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";
import { useIntakeOwnerSetup } from "@/workspace-registry/live-runtime/use-intake-owner-setup.ts";
import type { IntakeOwnerSetup } from "@/workspace-registry/model/workspace-intake-guidance.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryIntakeCustody, repositoryIntakeRecord, type RepositoryIntakeDraft } from "./repository-intake-candidate.ts";
import { repositoryIntakeDraftFromCustody, repositoryIntakeMissingFields, repositoryIntakeRequiresCatalog,
  repositoryIntakeRoles, repositoryIntakeTypeDraft, repositoryIntakeTypes, repositoryCheckApproaches, repositoryIntakeRecordedDraft } from "./repository-intake-guidance.ts";
import { RepositoryOwnerBootstrapDialog } from "./repository-owner-bootstrap-dialog.tsx";
import { RepositoryDevelopmentScope } from "../../shared/repository-development-scope.tsx";

function withOwnerChecks(draft: RepositoryIntakeDraft, setup: IntakeOwnerSetup | null): RepositoryIntakeDraft {
  if (!setup) return draft;
  return { ...draft, catalogRefs: setup.catalogRefs.join(","),
    validationNotes: `Recorded check plan from ${setup.repository}: ${setup.notes}\nThis is a plan, not evidence that these checks have passed.${draft.validationNotes.trim() ? `\nAdditional notes: ${draft.validationNotes.trim()}` : ""}` };
}

export function RepositoryIntakeDialog({ repository, custodyResult, ownerRepositories = [], classification, onActivate, onClose }: {
  repository: RepositoryWorkspaceRecord;
  custodyResult: RepositoryCustodyWorkflowResult;
  ownerRepositories?: readonly string[];
  classification?: WorkspaceIntakeDecision;
  onActivate?: () => void;
  onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [initialDraft, setInitialDraft] = useState(() => repositoryIntakeDraftFromCustody(custodyResult));
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
  const [review, setReview] = useState<{ candidate: WorkspaceIntakeCandidate; custody?: WorkspaceIntakeCustodyPreparation; requestId?: string; decision?: WorkspaceIntakeDecision } | null>(null);
  const restored = useRef(false);
  const [restoredAnswers, setRestoredAnswers] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const custody = repositoryIntakeCustody(repository, custodyResult);
  const targetName = custody?.target.name, custodyRequestId = custody?.requestId;
  const busy = runtime.pending || preparing;
  const needsCatalog = repositoryIntakeRequiresCatalog(draft.validationPosture);
  const checks = useIntakeOwnerSetup(null, false, needsCatalog && !manualChecks ? checkOwner : "");
  const effectiveDraft = withOwnerChecks(draft, needsCatalog && !manualChecks && checks.current ? checks.setup : null);
  const issues = repositoryIntakeMissingFields(effectiveDraft);
  if (needsCatalog && !manualChecks && !checks.current) {
    issues.push(checkOwner ? "Wait for the selected repository’s check plan, or refresh it." : "Choose the repository that owns the registered checks.");
  }
  const formState = JSON.stringify({ draft, repositoryType, checkOwner, manualChecks, customSecurityOwner });
  const dirty = recordedFormState !== null ? formState !== recordedFormState
    : Object.entries(draft).some(([key, value]) => value !== initialDraft[key as keyof RepositoryIntakeDraft]) || Boolean(repositoryType || checkOwner || manualChecks || customSecurityOwner);
  const ownerSetupAvailable = classification === "proposed" || classification === "admitted";
  useEffect(() => {
    if (targetName && custodyRequestId) void runtime.list(targetName, custodyRequestId).catch(() => undefined);
  }, [targetName, custodyRequestId, runtime.list]);
  useEffect(() => {
    if (restored.current || !runtime.requestPage) return;
    restored.current = true;
    if (dirty) return;
    const entry = [...runtime.requestPage.records].filter(entry => entry.status === "succeeded" && entry.classification !== "out-of-scope")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    const saved = entry && repositoryIntakeRecordedDraft(entry.candidate.requested_record);
    if (!saved) return;
    setInitialDraft(saved.draft); setDraft(saved.draft); setRepositoryType(saved.type);
    const manual = repositoryIntakeRequiresCatalog(saved.draft.validationPosture);
    const customSecurity = Boolean(saved.draft.securityOwner && !ownerRepositories.includes(saved.draft.securityOwner));
    setManualChecks(manual); setCustomSecurityOwner(customSecurity); setRestoredAnswers(true);
    setRecordedFormState(JSON.stringify({draft:saved.draft,repositoryType:saved.type,checkOwner:"",manualChecks:manual,customSecurityOwner:customSecurity}));
  }, [runtime.requestPage, dirty, ownerRepositories]);
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
      if (needsCatalog && !manualChecks && !setup) throw new Error("The selected repository’s check plan could not be read. Your draft is kept; refresh the plan to continue.");
      const resolved = withOwnerChecks(draft, setup);
      const requestedRecord = repositoryIntakeRecord(resolved);
      if (!requestedRecord) throw new Error(repositoryIntakeMissingFields(resolved).join(" "));
      const selection = { request_id: custody.requestId, requested_record: requestedRecord };
      const preparation = await runtime.prepare({ target: custody.target }, selection);
      const source = preparation.source_candidate;
      if (!source || source.requested_record.kind !== "repo") throw new Error("The registration service did not return a candidate for this repository. Your draft is kept.");
      setReview({ custody: selection, candidate: {
        label: repository.name, target: { kind: source.target.kind, name: source.target.name },
        source: source.source, requested_record: source.requested_record, evidence_refs: source.evidence_refs,
      } });
    } catch (failure) { setPreparationError(failure instanceof Error ? failure.message : "Registration details could not be prepared."); }
    finally { setPreparing(false); }
  }
  function returnToForm() { setReview(null); refreshJournal(); }
  if (ownerSetup && targetName && custodyRequestId) return <RepositoryOwnerBootstrapDialog key={`${targetName}:${custodyRequestId}`} ownerRepo={targetName} custodyRequestId={custodyRequestId} returnLabel="Back to onboarding details" onClose={() => { setOwnerSetup(false); refreshJournal(); }} />;
  if (review) return <WorkspaceIntakeDialog singleReview candidate={review.candidate} repositoryCustody={review.custody}
    onRequestRecorded={() => setRecordedFormState(formState)}
    initialRequestId={review.requestId} initialDecision={review.decision} onRepositoryNextAction={decision => { if (decision === "proposed") { setReview(null); setOwnerSetup(true); } else if (decision === "admitted") onActivate?.(); }} onNewCandidate={returnToForm} returnLabel="Back to onboarding details" onClose={returnToForm} />;
  return <><TerasModalShell busy={busy} busyLabel={preparing ? "Preparing onboarding review…" : "Loading recorded onboarding…"} bodyLayout="scroll" height="content" width="standard"
    kicker="Workspace Registry" title="Repository onboarding details" surfaceId="repository-intake-preparation"
    description="Review its purpose, how source changes are checked and whether a separate security repository is required. Known details are collected automatically."
    onClose={() => requestLeave(onClose)} footer={<>
      <TerasActionButton emphasis="secondary" disabled={busy} onClick={() => requestLeave(onClose)}>Back to onboarding</TerasActionButton>
      <TerasActionButton busy={busy} disabled={!custody || busy || !runtime.requestPage || Boolean(runtime.requestPage.pending_request_count)} onClick={() => void prepare()}>
        {busy ? "Preparing review…" : "Review onboarding"}
      </TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <RepositoryDevelopmentScope visibility={custodyResult.provider_readback?.visibility} />
      {restoredAnswers ? <TerasContentTray role="status" kicker="Recorded answers loaded" description="Your previous completed onboarding answers are filled in. Review or change them before submitting a new decision; loading them does not approve or activate this repository." /> : null}
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
            placeholder="For example: Maintains the client portal source and tests. Hosting, shared services and security policies remain with their responsible components."
            onValueChange={value => update("notes", value)} />
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="2. Checking source changes" description="Choose who maintains source review and quality checks. You do not need a finished app or application test plan to onboard.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="How are source changes checked?" value={draft.validationPosture} disabled={busy}
            helper={repositoryCheckApproaches.find(item => item.value === draft.validationPosture)?.detail ?? "Choose who runs the checks. For an app or library, this is normally maintained in the repository itself."}
            options={[{ label: "Choose a check approach", value: "" }, ...repositoryCheckApproaches]}
            onValueChange={value => {
              update("validationPosture", value);
              if (draft.graphRole && !repositoryIntakeRoles(value).some(role => role.value === draft.graphRole)) {
                setDraft(current => ({ ...current, validationPosture: value, graphRole: "" })); setAdvancedOpen(true);
              }
            }} />
          {restoredAnswers && needsCatalog && manualChecks ? <TerasContentTray kicker="Recorded shared checks" description={`${draft.catalogRefs.split(",").filter(Boolean).length} existing check IDs are retained from your recorded answers. Advanced settings lets you review or change them.`} /> : null}
          {needsCatalog && !manualChecks ? <>
            <TerasSelectField label="Repository with the shared check plan" value={checkOwner} disabled={busy}
              helper="Reads the selected repository’s recorded check IDs and plan automatically. No check is created or run."
              options={[{ label: "Choose a repository with shared checks", value: "" }, ...ownerRepositories.map(value => ({ label: value, value }))]}
              onValueChange={value => { setPreparationError(null); setCheckOwner(value); }} />
            {checks.current && checks.setup ? <TerasContentTray kicker="Recorded check plan" description={checks.setup.notes} /> : null}
            {checkOwner ? <TerasContentTray kicker={checks.status === "loading" ? "Reading check plan" : checks.error ? "Check plan unavailable" : "Check bindings"}
              description={checks.error ?? (checks.status === "loading" ? "Reading the selected repository’s current plan…" : checks.setup?.catalogRefs.length ? `${checks.setup.catalogRefs.length} registered check binding(s) collected.` : "This repository has no registered checks for this approach. Choose another repository or use repository-run tests.")}
              actions={<TerasActionButton emphasis="secondary" disabled={busy || checks.status === "loading"} onClick={() => { setPreparationError(null); void checks.load(); }}>Refresh check plan</TerasActionButton>} /> : null}
          </> : null}
          <TerasNoteField label={needsCatalog && !manualChecks ? "Additional check notes (optional)" : "Source-check notes (optional)"}
            minimumHeight="medium" value={draft.validationNotes} disabled={busy}
            placeholder="Add any existing source-check arrangement. You can leave this blank for repository-owned controls; application testing is configured separately."
            onValueChange={value => update("validationNotes", value)} />
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray kicker="3. Security policies" description="Some projects require policies or reviews from a separate security repository. This is a project requirement, independent of whether the GitHub repository is private or public.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="Is a separate security repository required?" value={draft.securityBinding} disabled={busy}
            helper="Use the agreed project requirements. This records responsibility; it does not grant access or waive security review."
            options={[{ label: "Choose the security requirement", value: "" }, { label: "No separate security repository required", value: "false" }, { label: "A separate security repository is required", value: "true" }]}
            onValueChange={value => update("securityBinding", value)} />
          {draft.securityBinding === "true" ? <>
            <TerasSelectField label="Security repository" value={customSecurityOwner ? "custom" : draft.securityOwner} disabled={busy}
              helper="Select the repository that maintains the required policies and reviews. Its linkage must be verified before activation."
              options={[{ label: "Choose a security repository", value: "" }, ...ownerRepositories.map(value => ({ label: value, value })), { label: "A repository outside this list", value: "custom" }]}
              onValueChange={value => { setCustomSecurityOwner(value === "custom"); update("securityOwner", value === "custom" ? "" : value); }} />
            {customSecurityOwner ? <TerasTextField label="Security repository name" placeholder="The agreed repository short name, for example security-architecture."
              value={draft.securityOwner} disabled={busy} onValueChange={value => update("securityOwner", value)} /> : null}
          </> : null}
        </TerasFieldStack>
      </TerasContentTray>
      <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy} onClick={() => setAdvancedOpen(open => !open)}>{advancedOpen ? "Hide advanced settings" : "Advanced settings"}</TerasActionButton></TerasActionRow>
      {advancedOpen ? <TerasContentTray kicker="Advanced settings" description="Override derived metadata only for an agreed repository configuration. Canonical validation still checks every choice.">
        <TerasFieldStack spacing="normal">
          <TerasSelectField label="Workspace role" value={draft.graphRole} disabled={busy}
            helper="Normally filled from the repository type. Proposed and implementation-only profiles support only the roles shown here."
            options={[{ label: "Choose a validation role", value: "" }, ...repositoryIntakeRoles(draft.validationPosture)]}
            onValueChange={value => update("graphRole", value)} />
          {needsCatalog ? <TerasSelectField label="Shared check plan details" value={manualChecks ? "manual" : "owner"} disabled={busy}
            helper="Use the repository’s recorded plan when available. Manual IDs must already exist in the validation catalog."
            options={[{ value: "owner", label: "Collect from the selected repository" }, { value: "manual", label: "Use explicitly reviewed check IDs" }]}
            onValueChange={value => setManualChecks(value === "manual")} /> : null}
          {manualChecks || !needsCatalog ? <TerasTextField label="Existing shared check IDs" value={draft.catalogRefs} disabled={busy}
            placeholder="Existing catalog IDs, separated by commas. Do not enter test commands or invent IDs."
            onValueChange={value => update("catalogRefs", value)} /> : null}
        </TerasFieldStack>
      </TerasContentTray> : null}
      <TerasContentTray kicker="Repository setup" description={ownerSetupAvailable
        ? "The repository is recorded for onboarding. Inspect or complete its source-review controls here, then return to the onboarding overview to review approval and activation."
        : "First choose Review onboarding and Record for setup and review. Once that request completes, source setup becomes available. Project use stays blocked until activation."}
        actions={<TerasActionButton emphasis="secondary" disabled={!custody || busy || !ownerSetupAvailable} onClick={() => setOwnerSetup(true)}>Review repository setup</TerasActionButton>} />
      {runtime.pending && !runtime.requestPage ? <TerasLoadingState label="Loading onboarding history…" skeleton="details" /> : null}
      {runtime.error || runtime.requestPage?.records.length ? <TerasContentTray kicker="Previous onboarding requests"
        description={runtime.requestPage ? runtime.requestPage.pending_request_count
          ? "A registration request is still pending. Open it below before starting another."
          : runtime.requestPage.records.length ? "Open an earlier request to inspect its original decision and result." : "No previous registration requests."
          : runtime.error ? "Registration history could not be read. Refresh it before starting a review." : "Reading registration history…"}
        actions={<TerasActionRow>
          {runtime.error ? <TerasActionButton emphasis="secondary" disabled={!targetName || !custodyRequestId || busy} onClick={refreshJournal}>Retry onboarding history</TerasActionButton> : null}
          {runtime.requestPage?.next_cursor ? <TerasActionButton emphasis="secondary" disabled={busy}
            onClick={() => { if (targetName && custodyRequestId) void runtime.list(targetName, custodyRequestId, runtime.requestPage!.next_cursor).catch(() => undefined); }}>More requests</TerasActionButton> : null}
        </TerasActionRow>}>
        {runtime.requestPage?.records.length ? <TerasList frame="contained" scrollHeight="short">
          {runtime.requestPage.records.map(entry => <TerasSignalItem key={entry.request_id}
            label={repository.name} title={`${entry.classification === "admitted" ? "Approval for activation" : entry.classification === "proposed" ? "Setup and review" : "Outside managed workspace"} · ${entry.status.replaceAll("-", " ")}`} detail={new Date(entry.updated_at).toLocaleString()}
            {...(busy ? { statusLabel: "Reading" } : { ariaLabel: `Open registration request ${entry.request_id}`, actionLabel: "Open request", onSelect: () => requestLeave(() => setReview({ requestId: entry.request_id, decision: entry.classification,
              candidate: { label: repository.name, target: { kind: entry.candidate.target.kind, name: entry.candidate.target.name },
                requested_record: entry.candidate.requested_record, source: entry.candidate.source, evidence_refs: entry.candidate.evidence_refs } })) })} tone="info" />)}
        </TerasList> : null}
      </TerasContentTray> : null}
      <TerasTechnicalDetails summary="Registration technical details" items={[
        { label: "Custody request", value: custody?.requestId ?? "Unavailable" },
        { label: "Repository category", value: draft.repoClass || "Not selected" },
        { label: "Validation approach", value: draft.validationPosture || "Not selected" },
        { label: "Workspace role", value: draft.graphRole || "Not selected" },
        { label: "Registered check IDs", value: effectiveDraft.catalogRefs || "No direct checks selected" },
        ...(checks.current && checks.setup ? [{ label: "Check repository source", value: checks.setup.evidenceRef }] : []),
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
