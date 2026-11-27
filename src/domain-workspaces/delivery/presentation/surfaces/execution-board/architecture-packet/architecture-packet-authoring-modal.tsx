"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SavedWorkBoundary, SavedWorkStatus, useSavedWorkSession } from "@/console-integration/saved-work/saved-work-boundary";

import {
  TerasPlanning,
  TerasActionButton,
  TerasChoiceGroup,
  TerasContentTray,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSignalItem,
  TerasTechnicalDetails,
  TerasZone,
} from "@/teras";
import { ArchitecturePacketLiveRuntimeError, useArchitecturePacketLiveRuntime } from "../../../../live-runtime/use-architecture-packet-live-runtime.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketCurrentResult,
  ArchitecturePacketDraftResult,
  ArchitecturePacketPersistResult,
} from "../../../../live-runtime/architecture-packet-live-types.ts";
import {
  architecturePacketEditorFromArtifact,
  architecturePacketEditorIssues,
  architecturePacketInputFromEditor,
  emptyArchitecturePacketEditor,
  normalizeSavedTechnicalPlan,
  starterTechnicalPlanEditor,
  type SavedTechnicalPlan,
  type ArchitecturePacketEditor,
} from "./architecture-packet-editor-model.ts";
import type { DeliveryReadModel } from "../../../../read-model/delivery-read-model.ts";
import { ArchitecturePlanEditor } from "./architecture-plan-editor.tsx";
import { ArchitectureSavedContext, useArchitectureSavedContext } from "./architecture-saved-context.tsx";
import { architectureFormContract } from "../../../../work-model/execution/architecture-form-model.ts";
import { technicalPlanDefaultSection, technicalPlanPrepareDraft, technicalPlanReplaceScope, technicalPlanScopeDropsChoices, technicalPlanWorkItems, technicalPlanWorkLabel } from "../../../../work-model/execution/technical-plan-model.ts";
import type { PlanChangeConfirmation } from "./architecture-plan-field.tsx";
import { TechnicalPlanAdvisor } from "./technical-plan-advisor.tsx";
import { TechnicalPlanReview } from "./technical-plan-review.tsx";
import { TechnicalPlanSessionImpact } from "./technical-plan-session-impact.tsx";
import { TechnicalPlanScope } from "./technical-plan-overview.tsx";
import { TechnicalPlanActionPanel } from "./technical-plan-action-panel.tsx";
import { technicalPlanRequirement, type TechnicalPlanRequirement } from "../../../../work-model/execution/technical-plan-requirement.ts";
import { TechnicalPlanSequenceView } from "./technical-plan-sequence-view.tsx";
import { technicalPlanCheckSection } from "../../../../live-runtime/architecture-packet-live-contract.ts";
import { technicalPlanSection } from "../../../../work-model/execution/technical-plan-model.ts";
import { technicalPlanGuidanceScope, type TechnicalPlanSourceContext } from "../../../../work-model/execution/technical-plan-guidance.ts";
import type { ExecutionPlanStarterTransfer } from "../work-session/execution-technical-plan-guidance.tsx";

type ArchitecturePacketAuthoringProps = {
  defaultDeliveryId: string | null;
  defaultWorkItemId: number | null;
  onClose: () => void;
  model: DeliveryReadModel;
  readOnly?: boolean;
  onCanonicalChanged?: () => Promise<void>;
  requirement?: TechnicalPlanRequirement;
  starter?: ExecutionPlanStarterTransfer | null;
  onOpenWorkBoard?: (workItemId: number | null) => void;
  sourceContext?: TechnicalPlanSourceContext;
};

export function ArchitecturePacketAuthoringModal(props: ArchitecturePacketAuthoringProps) {
  const packageId = props.defaultDeliveryId;
  if (props.readOnly || !packageId) return <ArchitecturePacketEditorModal {...props} />;
  return <SavedWorkBoundary key={packageId} storageKey={`delivery-technical-plan-draft:${packageId}:v1`}
    onClose={props.onClose} normalize={value => normalizeSavedTechnicalPlan(value, packageId)}>
    <ArchitecturePacketEditorModal {...props} />
  </SavedWorkBoundary>;
}

function ArchitecturePacketEditorModal({
  defaultDeliveryId,
  defaultWorkItemId,
  onClose,
  model,
  readOnly = false,
  onCanonicalChanged,
  sourceContext,
  requirement: suppliedRequirement,
  starter,
  onOpenWorkBoard,
}: ArchitecturePacketAuthoringProps) {
  const runtime = useArchitecturePacketLiveRuntime();
  const draftSession = useSavedWorkSession();
  const exitAction = useRef(onClose);
  const [startingDraft] = useState(() => {
    const raw = draftSession?.read();
    try { return raw ? normalizeSavedTechnicalPlan(JSON.parse(raw), defaultDeliveryId ?? "")?.draft ?? null : null; }
    catch { return null; }
  });
  const [editor, setEditor] = useState(() =>
    technicalPlanPrepareDraft(startingDraft ?? emptyArchitecturePacketEditor({
      deliveryId: defaultDeliveryId ?? "",
      workItemId: defaultWorkItemId,
    }), model),
  );
  const [current, setCurrent] = useState<ArchitecturePacketCurrentResult | null>(null);
  const [validated, setValidated] = useState<ArchitecturePacketDraftResult | null>(null);
  const [approved, setApproved] = useState<ArchitecturePacketDraftResult | null>(null);
  const [persisted, setPersisted] = useState<ArchitecturePacketPersistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<(PlanChangeConfirmation & { draft: ArchitecturePacketEditor }) | null>(null);
  const live = model.source_truth === "OpenProject-backed OOS";
  const [step, setStep] = useState<"scope" | "plan" | "review">(readOnly ? "review" : "scope");
  const [planView, setPlanView] = useState<"edit" | "design" | "sequence">("edit");
  const [section, setSection] = useState<string>(technicalPlanDefaultSection);
  const [advisorWide, setAdvisorWide] = useState(false);
  const [confirmed,setConfirmed] = useState(false),[readError,setReadError] = useState<string|null>(null),[checking,setChecking] = useState(live),[editing,setEditing] = useState(Boolean(startingDraft)),[missing,setMissing] = useState(false);
  const saved = useArchitectureSavedContext(editor.deliveryId,live);
  const item = model.packages.find(item=>item.delivery_package_id===editor.deliveryId||`delivery-${item.legacy_epic_id}`===editor.deliveryId);
  const nodes = useMemo(() => technicalPlanWorkItems(model, editor.deliveryId), [model, editor.deliveryId]);
  const titles = useMemo(() => Object.fromEntries(nodes.map(node => [
    `work-item-${node.legacy_work_package_id}`, technicalPlanWorkLabel(node),
  ])), [nodes]);
  useEffect(()=>{
    if(!live){setChecking(false);return;}
    let active=true;setChecking(true);
    void runtime.inspectCurrent(editor.deliveryId).then(snapshot=>{
      if(!active)return;
      if(snapshot.result?.workflow_id!=="delivery-art-architecture-packet-current"||snapshot.result.artifact.delivery_id!==editor.deliveryId)throw Error("The recorded plan did not match this package.");
      setCurrent(snapshot.result);setReadError(null);setMissing(false);
    }).catch(error=>{if(!active)return;if(error?.code==="delivery_art_reference_missing")setMissing(true);else setReadError(error instanceof Error?error.message:"The recorded plan could not be checked.");})
      .finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
  },[live,editor.deliveryId,runtime.inspectCurrent]);
  const savedDraft = useRef(JSON.stringify(editor));
  const pendingDraft = useMemo<SavedTechnicalPlan>(() => ({ schemaVersion: 1, packageId: editor.deliveryId, draft: editor }), [editor]);
  const dirty = JSON.stringify(editor) !== savedDraft.current;
  const [starterNotice, setStarterNotice] = useState<string | null>(null);
  const attemptedStarter = useRef<ExecutionPlanStarterTransfer | null>(null);
  useEffect(() => {
    if (!starter || checking || attemptedStarter.current === starter) return;
    attemptedStarter.current = starter;
    if (startingDraft || current || dirty) {
      setStarterNotice("Opened the existing plan. Its content is preserved.");
      return;
    }
    const saveStatus = draftSession?.getSnapshot().status;
    if (!live || readOnly || !missing || readError || !draftSession ||
        !["ready", "saved"].includes(saveStatus ?? "")) {
      setStarterNotice("Could not confirm that this package is clear for a new draft. Read the existing plan before trying again.");
      return;
    }
    const activeScope = technicalPlanGuidanceScope(model, editor.deliveryId, starter.scope.work.id, sourceContext);
    if (activeScope?.basis !== starter.scope.basis || activeScope.sourceRevision !== starter.scope.sourceRevision) {
      setStarterNotice("The work changed before the editor opened. Check the current scope again.");
      return;
    }
    setEditor(technicalPlanPrepareDraft(starterTechnicalPlanEditor(activeScope, starter.draft), model));
    setEditing(true);
    setStarterNotice("The starter includes an approach, checks and rollback steps for the selected work. Review and complete it before validating.");
  }, [starter, checking, startingDraft, current, dirty, draftSession, live, readOnly, missing, readError, model, editor.deliveryId, sourceContext]);
  const draftBasis = editor.starterBasis;
  const staleStarter = draftBasis && !persisted && editing && (
    editor.coveredWorkItemIds.length !== 1 ||
    editor.coveredWorkItemIds[0] !== `work-item-${draftBasis.workItemId}` ||
    technicalPlanGuidanceScope(model, editor.deliveryId, draftBasis.workItemId, sourceContext)?.basis !== draftBasis.scope
  );

  useEffect(() => {
    if (editing && dirty && !persisted) draftSession?.write(pendingDraft);
  }, [draftSession, editing, dirty, pendingDraft, persisted]);

  const draftNeedsCloseGuard = useCallback(() => {
    const status = draftSession?.getSnapshot().status;
    return dirty && (!draftSession || draftSession.read() !== JSON.stringify(pendingDraft) ||
      (status !== "saved" && status !== "local"));
  }, [dirty, draftSession, pendingDraft]);

  function requestClose() {
    exitAction.current = onClose;
    if (submitting) return;
    if (draftNeedsCloseGuard()) setCloseGuardOpen(true);
    else onClose();
  }

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (submitting || draftNeedsCloseGuard()) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [draftNeedsCloseGuard, submitting]);

  const changeConfirmation = pendingChange?.draft === editor ? pendingChange : null;
  function confirmChange(change: PlanChangeConfirmation) {
    setPendingChange({ ...change, draft: editor });
  }

  function changeScope(ids: string[]) {
    const apply = () => edit(current => technicalPlanReplaceScope(current, ids, model));
    if (technicalPlanScopeDropsChoices(editor, ids)) {
      confirmChange({ title: "Remove work from this plan?", description: "This scope change removes assigned checks or dependency timing for the excluded work.",
        actionLabel: "Remove from scope", apply });
    } else apply();
  }

  const draftIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "draft"),
    [editor],
  );
  const approvalIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "architecture-ready"),
    [editor],
  );

  function edit(update: (current: ArchitecturePacketEditor) => ArchitecturePacketEditor) {
    if(readOnly||submitting)return;
    setEditor(current => {
      const next = update(current);
      return next === current ? current : technicalPlanPrepareDraft(next, model);
    });
    setEditing(true);setConfirmed(false);
    setValidated(null);
    setApproved(null);
    setPersisted(null);
    setError(null);
    setValidationIssues([]);
  }

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    setValidationIssues([]);
    try {
      await action();
    } catch (caught) {
      if (caught instanceof ArchitecturePacketLiveRuntimeError &&
        ["delivery_art_plan_impact_changed", "delivery_art_snapshot_stale"].includes(caught.code ?? "")) {
        setValidated(null);
        setApproved(null);
        setConfirmed(false);
      }
      setValidationIssues(caught instanceof ArchitecturePacketLiveRuntimeError ? caught.issues : []);
      setError(
        caught instanceof Error ? caught.message : "Architecture Packet request failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function inspectCurrent() {
    const deliveryId = editor.deliveryId.trim();
    if (!/^delivery-[1-9][0-9]*$/.test(deliveryId)) {
      throw new Error("Enter a Delivery identity such as delivery-1275 first.");
    }
    setChecking(true);
    try {
      const snapshot = await runtime.inspectCurrent(deliveryId);
      const result = snapshot.result;
      if (!result || result.workflow_id !== "delivery-art-architecture-packet-current" || result.artifact.delivery_id!==editor.deliveryId) throw new Error("The recorded plan did not match this package.");
      setCurrent(result);setReadError(null);setMissing(false);
    } catch(error) {
      setCurrent(null);
      if(error&&typeof error==="object"&&"code"in error&&error.code==="delivery_art_reference_missing"){setMissing(true);setReadError(null);}
      else {setMissing(false);setReadError(error instanceof Error?error.message:"The recorded plan could not be checked.");}
    } finally {setChecking(false);}

  }

  async function validateDraft() {
    const draft = technicalPlanPrepareDraft(editor, model);
    if (draft !== editor) {
      setEditor(draft);
      setEditing(true);
    }
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(draft, "draft"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft" || !result.session_impact) {
      throw new Error("Plan validation did not return a work-session impact check.");
    }
    if(result.architecture_packet.delivery_id!==editor.deliveryId || [...result.architecture_packet.covered_work_item_ids].sort().join()!==editor.coveredWorkItemIds.map(id=>id.trim()).filter(Boolean).sort().join()) throw Error("The validated plan did not match the selected package and covered work.");
    setValidated(result);
    setConfirmed(false);setStep("review");
    setApproved(null);
    setPersisted(null);
  }

  async function approveCandidate() {
    if(readOnly||!validated||!confirmed)throw Error("Review and explicitly approve the current plan first.");
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(editor, "architecture-ready"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft" || !result.session_impact) {
      throw new Error("Plan approval did not return a work-session impact check.");
    }
    if (result.architecture_packet.decision.status !== "architecture-ready") {
      throw new Error("OOS did not preserve the architecture-ready decision.");
    }
    if(result.source_snapshot.art_digest!==validated.source_snapshot.art_digest || JSON.stringify(result.architecture_packet.architecture)!==JSON.stringify(validated.architecture_packet.architecture) || JSON.stringify(result.architecture_packet.conformance_plan)!==JSON.stringify(validated.architecture_packet.conformance_plan) || JSON.stringify(result.architecture_packet.source_snapshot.repo_revisions)!==JSON.stringify(validated.architecture_packet.source_snapshot.repo_revisions) || JSON.stringify(result.architecture_packet.covered_work_item_ids)!==JSON.stringify(validated.architecture_packet.covered_work_item_ids)) {
      setValidated(null);setConfirmed(false);throw Error("Source facts changed during approval. Validate and review the current plan again; nothing was recorded.");
    }
    if (result.session_impact.revision !== validated.session_impact?.revision) {
      setValidated({ ...validated, session_impact: result.session_impact });
      setConfirmed(false);
      throw new Error("Work-session impact changed during approval. Review the updated impact before approving.");
    }
    setApproved(result);
    setPersisted(null);
  }

  async function persistCandidate() {
    if (readOnly) throw Error("History cannot record a plan.");
    if (!approved?.session_impact) throw new Error("Approve the exact plan and work-session impact before recording.");
    const persistedDraft = JSON.stringify(editor);
    const snapshot = await runtime.persist(approved.architecture_packet, approved.session_impact.revision);
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-persist") {
      throw new Error("OOS did not return durable Architecture Packet custody.");
    }
    if(result.artifact.delivery_id!==editor.deliveryId || result.artifact.integrity.content_digest!==approved.architecture_packet.integrity.content_digest)throw Error("Recording was not confirmed for the reviewed plan. Its approval is retained for retry.");
    setPersisted(result);
    setConfirmed(false);void onCanonicalChanged?.().catch(()=>undefined);
    savedDraft.current = persistedDraft;
    draftSession?.write({ schemaVersion: 1, packageId: editor.deliveryId, draft: null } satisfies SavedTechnicalPlan);
  }

  const recordedPlan = editing ? null : current;
  const sessionImpact = persisted ? persisted.session_impact : approved?.session_impact ?? validated?.session_impact;
  const displayed = persisted?.artifact ?? approved?.architecture_packet ?? validated?.architecture_packet ?? recordedPlan?.artifact ?? null;
  const viewEditor = displayed ? architecturePacketEditorFromArtifact(displayed) : editor;
  const sourceLabel = persisted || recordedPlan?.contract_posture === "current" ? "Recorded approved plan" :
    recordedPlan ? "Historical plan" : approved ? "Approved · recording pending" : validated ? "Validated draft" :
    validationIssues.length ? "Draft · changes needed" : "Draft · awaiting validation";
  const stateLabel = readOnly ? "Read-only" : displayed ? sourceLabel : checking ? "Reading recorded plan…" :
    validationIssues.length ? "Draft · changes needed" :
    editing ? "Draft in progress" : missing ? "No approved plan recorded" : !live ? "Disconnected preview" : "Plan status unavailable";
  const requirement = suppliedRequirement ?? technicalPlanRequirement({ deliveryId: editor.deliveryId, available: live });
  const workTitle = defaultWorkItemId ? titles[`work-item-${defaultWorkItemId}`] ?? `Work item #${defaultWorkItemId}` : undefined;
  const workReason = defaultWorkItemId && requirement.status !== "unknown" ? requirement.detail : undefined;
  const editable = !readOnly && !recordedPlan && !persisted && !submitting && (!checking || editing);
  const needsScope = viewEditor.coveredWorkItemIds.length === 0;
  const needsSummary = viewEditor.rationale.trim().length < 20;
  const canRevise = !readOnly && recordedPlan?.contract_posture === "current";
  const returnLabel = defaultWorkItemId ? "Return to work start" : "Open Work Board";
  const hasRecordedPlan = Boolean(persisted || recordedPlan);
  const inspectPlan = readOnly || hasRecordedPlan;
  const canOpenPlanForm = !inspectPlan || displayed?.schema_version === architectureFormContract.authoringVersion;
  let architecture: unknown = null;
  try { architecture = JSON.parse(viewEditor.architectureJson); } catch {}
  const architectureError = !architecture || typeof architecture !== "object" || Array.isArray(architecture);

  function returnToWorkBoard() {
    if (!onOpenWorkBoard || submitting) return;
    const navigate = () => onOpenWorkBoard(defaultWorkItemId);
    exitAction.current = navigate;
    if (draftNeedsCloseGuard()) setCloseGuardOpen(true); else navigate();
  }

  function openChanges(view: typeof planView = "edit") {
    setPlanView(view);
    setStep("plan");
  }

  function openCheck(issue: string) {
    if (issue.startsWith("Covered work") || issue.startsWith("Operator rationale") ||
        technicalPlanCheckSection(issue) === "architecture:descendant_owner_map") {
      setStep("scope");
      return;
    }
    const target = technicalPlanCheckSection(issue);
    if (target) setSection(target);
    openChanges();
  }

  function checkLabelFor(issue: string) {
    if (issue.startsWith("Covered work")) return "Choose the work this plan covers.";
    if (issue.startsWith("Operator rationale")) return "Explain the approach and its limits in the plan summary.";
    if (issue.startsWith("Conformance requirement")) return "Include the verification required to approve this plan.";
    if (/^(At least one evidence handoff|Runtime activation steps|Verification cases must|Git dependency verification)/.test(issue)) return issue;
    const target = technicalPlanCheckSection(issue);
    return target ? `Review ${technicalPlanSection(target)[1].toLowerCase()}.` : issue;
  }

  function reviseCurrent() {
    if (!canRevise || !current || submitting) return;
    const next = architecturePacketEditorFromArtifact(current.artifact);
    edit(() => next);
    savedDraft.current = JSON.stringify(next);
    openChanges();
  }

  const checkToResolve = !displayed && draftIssues[0];
  const historyWithoutPlan = readOnly && !hasRecordedPlan;
  const recordedPlanTitle = recordedPlan?.contract_posture === "historical-read-only" ? "Historical plan" : "Plan recorded";
  const reviewPreparation = planView === "design" ? "Use the saved diagrams and brief to check the plan against the system design." :
    planView === "sequence" ? "Check the order of work and required approvals before continuing." :
    "Prepare the changes, verification, and recovery steps before review.";
  const actionTitle = historyWithoutPlan ? (checking ? "Checking for a recorded plan" : missing ? "No recorded plan" : "Recorded plan unavailable") :
    step === "scope" ? (inspectPlan ? "Review the saved scope" : needsScope ? "Choose work to include" : "Review the plan’s scope") :
    step === "plan" ? (inspectPlan ? "Review the saved plan" : "Review your plan") : hasRecordedPlan ? recordedPlanTitle :
    approved ? "Record the approved plan" : validated ? "Approve the reviewed plan" :
    validationIssues.length ? "Review the changes needed" :
    checkToResolve ? "Resolve the remaining checks" : "Validate this draft";
  const actionDescription = historyWithoutPlan ? (checking ? "Reading the plan saved for this package." : "History displays plans recorded for this package.") :
    step === "scope" ? (inspectPlan ? "See the work included in the recorded plan." : "Review the included work and explain the approach before continuing.") :
    step === "plan" ? (inspectPlan ? "Continue to review the recorded plan and its evidence." : reviewPreparation) :
    hasRecordedPlan ? (readOnly || !onOpenWorkBoard ? "Inspect the saved plan and its source evidence." :
      defaultWorkItemId ? "Return to the work-start check for the selected item." : "Open the package’s Work Board to see its work items.") :
    approved ? "Record this approved version for work start." :
    validated ? "Review the checked plan and approve it for the covered work." :
    validationIssues.length ? "Review the findings below the plan summary, then check the updated draft." :
    checkToResolve ? checkLabelFor(checkToResolve) : "Check that the plan matches the current work and repository revisions.";
  const disabledReason = step !== "review" ? null :
    validated && !approved && !confirmed ? "Confirm the approval decision below the reviewed plan." :
    !live && !recordedPlan && !persisted ? "Validation and recording need a connected workspace." : null;

  function primaryAction() {
    if (historyWithoutPlan) return null;
    if (step === "scope") return <TerasActionButton disabled={submitting} onClick={() => openChanges(
      canOpenPlanForm ? "edit" : "sequence")}>Continue to plan</TerasActionButton>;
    if (step === "plan") return <TerasActionButton disabled={submitting} onClick={() => setStep("review")}>Continue to review</TerasActionButton>;
    if (readOnly || recordedPlan || persisted) return onOpenWorkBoard && !readOnly ?
      <TerasActionButton disabled={submitting} onClick={returnToWorkBoard}>{returnLabel}</TerasActionButton> : null;
    if (approved) return <TerasActionButton disabled={submitting || !live}
      onClick={() => void run(persistCandidate)}>Record Approved Plan</TerasActionButton>;
    if (validated) return <TerasActionButton disabled={submitting || !live || !confirmed || approvalIssues.length > 0}
      onClick={() => void run(approveCandidate)}>Approve Plan</TerasActionButton>;
    const nextIssue = validationIssues.find(issue => validationFinding(issue, titles, architecture).section) ?? checkToResolve;
    if (nextIssue) return <TerasActionButton disabled={submitting} onClick={() => {
      const finding = validationFinding(nextIssue, titles, architecture);
      if (finding.section) { setSection(finding.section); openChanges(); }
      else openCheck(nextIssue);
    }}>Review next issue</TerasActionButton>;
    return <TerasActionButton disabled={submitting || !live} onClick={() => void run(validateDraft)}>Validate Plan</TerasActionButton>;
  }

  const recordingEvidence = persisted ? <TerasTechnicalDetails summary="Recording evidence" items={[
    { label: "Plan reference", value: persisted.artifact.custody.uri },
    { label: "Custody receipt", value: JSON.stringify(persisted.custody_receipt) },
    { label: "Source receipt", value: JSON.stringify(persisted.owner_receipt) },
  ]} /> : undefined;

  return <>
    <TerasPlanning.Modal busy={submitting} busyLabel="Checking or recording this technical plan…" bodyLayout="fill" height="fill" width="viewport"
      kicker="Delivery · Execution" title="Technical Plan & Approval" surfaceId="delivery-architecture-packet-authoring" onClose={requestClose}

      footer={<><SavedWorkStatus />{dirty && draftSession && !persisted ? <TerasActionButton disabled={submitting} emphasis="secondary"
        onClick={() => { draftSession.write(pendingDraft); void draftSession.retry(); }}>Save Draft</TerasActionButton> : null}
        <TerasActionButton disabled={submitting} emphasis="secondary" onClick={requestClose}>Back to Execution Board</TerasActionButton></>}>
      <TerasPlanning.Zones
        variant={advisorWide ? "main-aside" : "main-support"}>
        <TerasZone fit="fill"><TerasPanel fit="fill" frame="padded" layout="header-toolbar-body" spacing="normal" treatment="neutral">
          <TerasPanelHeader kicker={`Delivery package · Epic #${item?.legacy_epic_id ?? editor.deliveryId.replace("delivery-", "")}`}
            title={item?.display_name ?? "Selected work"} statusLabel={stateLabel} statusTone={persisted ? "ok" : readError ? "warn" : "info"} />
          <TerasFieldStack spacing="compact">
            {staleStarter || starterNotice ? <TerasContentTray role="status"
              title={staleStarter ? "Review the starter against the current scope" : undefined}
              description={staleStarter
                ? "The plan scope, schedule or recorded dependencies changed. Review the retained draft against the current work."
                : starterNotice ?? undefined} /> : null}
            <TerasPlanning.Progress ariaLabel="Technical plan flow" activeStepId={step}
              onSelectStep={next => { setStep(next); if (next === "plan" && !canOpenPlanForm && planView === "edit") setPlanView("sequence"); }}
              steps={[
                { id: "scope", label: "Choose scope", detail: "Work included in the plan", available: !submitting },
                { id: "plan", label: "Plan the changes", detail: "Order, checks and recovery", available: !submitting },
                { id: "review", label: "Review & record", detail: persisted || recordedPlan ? "Plan recorded" : "Check and approve", available: !submitting },
              ]} />
          </TerasFieldStack>
          <TerasPlanning.StepRegion key={`${step}-${step === "plan" ? planView : ""}`}
            step={step}
            fill scroll={step !== "plan"} gap="normal">
            {step === "scope" ? <TechnicalPlanScope plan={viewEditor} nodes={nodes} editable={editable}
              loading={checking && !editing} workTitle={workTitle} workReason={workReason}
              onScopeChange={changeScope}
              onRationaleChange={rationale => edit(current => ({ ...current, rationale }))}
              guidance={<TerasTechnicalDetails summary="When does this work need a plan?" items={[]} defaultOpen>
                <TerasContentTray title="Work with a shared rollout"
                  description="For example, coordinate a contact form and its service so the service is ready before visitors can send a message. The work-start review checks the recorded plan for the specific item being started." />
              </TerasTechnicalDetails>} /> : null}
            {step === "plan" ? <TerasFieldStack spacing="compact" fill="last">
              <TerasPlanning.ViewActions role="group" aria-label="Plan tools">
                {canOpenPlanForm ? <TerasActionButton emphasis="secondary" size="table-compact"
                  aria-pressed={planView === "edit"} disabled={submitting} onClick={() => setPlanView("edit")}>
                  {inspectPlan ? "View plan" : "Edit plan"}
                </TerasActionButton> : null}
                <TerasActionButton emphasis="secondary" size="table-compact" aria-pressed={planView === "sequence"}
                  disabled={submitting} onClick={() => setPlanView("sequence")}>Implementation sequence</TerasActionButton>
                <TerasActionButton emphasis="secondary" size="table-compact" aria-pressed={planView === "design"}
                  disabled={submitting} onClick={() => setPlanView("design")}>Saved architecture</TerasActionButton>
              </TerasPlanning.ViewActions>
              {planView === "edit" && canOpenPlanForm ? <ArchitecturePlanEditor editor={inspectPlan ? viewEditor : editor}
                model={model} disabled={!editable} navigationDisabled={submitting}
                approvedRuntimeResponsibilities={current?.contract_posture === "current" ? current.artifact.architecture.runtime_boundaries : undefined}
                onEdit={update => { if (editable) edit(update); }}
                selectedSection={section} onSectionChange={setSection} confirmChange={confirmChange} /> : null}
              {planView === "design" ? <ArchitectureSavedContext deliveryId={editor.deliveryId} live={live} context={saved} /> : null}
              {planView === "sequence" ? architectureError ? <TerasEmptyState>
                The saved plan could not be used to build this diagram.
                {editable ? <TerasActionButton emphasis="secondary" onClick={() => {
                  setSection(technicalPlanDefaultSection);
                  openChanges();
                }}>Review saved draft</TerasActionButton> : null}
              </TerasEmptyState> :
                <TechnicalPlanSequenceView architecture={architecture} titles={titles} sourceLabel={sourceLabel} /> : null}
            </TerasFieldStack> : null}
            {step === "review" ? <TerasFieldStack spacing="normal">
              {!inspectPlan && editor.inactiveArchitectureSections ? <TerasContentTray title="Previous details kept in this draft"
                description="Recording keeps the active plan choices and closes this draft. Restore any access or lifecycle details you want to include from Edit plan." /> : null}
              {!displayed && !readOnly && draftIssues.length ? <TerasTechnicalDetails summary={`Before validation · ${draftIssues.length} ${draftIssues.length === 1 ? "check" : "checks"}`} items={[]}>
                <TerasFieldStack spacing="compact">{draftIssues.map(issue => <TerasSignalItem key={issue}
                  label="Preparation" title={checkLabelFor(issue)} textOverflow="wrap" tone="warn"
                  actions={<TerasActionButton size="table-compact" emphasis="secondary" disabled={submitting}
                    onClick={() => openCheck(issue)}>Open section</TerasActionButton>} />)}</TerasFieldStack>
              </TerasTechnicalDetails> : null}
              <TechnicalPlanReview editor={viewEditor} titles={titles} sourceLabel={sourceLabel}
                approval={<>
                  {validationIssues.length ? <TerasPanel frame="padded" treatment="neutral" spacing="normal">
                    <TerasPanelHeader kicker="Plan checks" title="Changes needed before approval"
                      description="Open the relevant section to check each finding." />
                    <TerasFieldStack spacing="compact">
                      {validationIssues.map((issue, index) => {
                        const finding = validationFinding(issue, titles, architecture);
                        return <TerasSignalItem key={index} label={finding.section ? technicalPlanSection(finding.section)[1] : "Plan check"}
                          title={finding.summary} tone="warn" textOverflow="wrap"
                          actions={finding.section ? <TerasActionButton emphasis="secondary" size="table-compact" disabled={submitting}
                            onClick={() => { setSection(finding.section!); openChanges(); }}>Open section</TerasActionButton> : undefined} />;
                      })}
                    </TerasFieldStack>
                    <TerasTechnicalDetails summary={`Plan checks requiring attention · ${validationIssues.length}`}
                      items={[...(error ? [{ label: "Validation response", value: error }] : []),
                        ...validationIssues.map((value, index) => ({ label: `Check ${index + 1}`, value }))]} />
                  </TerasPanel> : null}
                  {sessionImpact ? <TechnicalPlanSessionImpact impact={sessionImpact} titles={titles} recorded={Boolean(persisted)}
                    onOpenSession={persisted ? onOpenWorkBoard : undefined} /> : null}
                  {validated && !readOnly && !approved ? <TerasChoiceGroup frame="tray" ariaLabel="Technical plan approval" label="Operator approval"
                  selectedId={confirmed ? "approve" : "review"} onSelect={value => setConfirmed(value === "approve")} disabled={submitting}
                  options={[{ id: "review", label: "Review required", tone: "warn" }, { id: "approve", label: "I approve this technical plan for the covered work", tone: "ok" }]} /> : null}
                </>} />
              {displayed ? <TerasTechnicalDetails summary="Plan identity and source evidence" items={candidateMetadata(displayed)} /> : null}
            </TerasFieldStack> : null}
          </TerasPlanning.StepRegion>
        </TerasPanel></TerasZone>
        <TerasZone fit="fill">
          <TerasPanelStack fill="last" minimumFillHeight="medium" scroll>
            <TechnicalPlanActionPanel kicker={readOnly && (step === "review" || historyWithoutPlan) ? "Plan status" : undefined}
              title={actionTitle} description={actionDescription} disabledReason={disabledReason}
              error={validationIssues.length ? "This plan needs correction." : error ?? readError}
              recorded={Boolean(persisted || recordedPlan?.contract_posture === "current")} evidence={recordingEvidence}>
              {primaryAction()}
              {canRevise ? <TerasActionButton disabled={submitting} emphasis="secondary" onClick={reviseCurrent}>Revise Current Plan</TerasActionButton> : null}
              {readError ? <TerasActionButton disabled={submitting} emphasis="secondary" onClick={() => void run(inspectCurrent)}>Retry plan check</TerasActionButton> : null}
              {step !== "scope" && !readOnly && onOpenWorkBoard && (step === "plan" || !recordedPlan && !persisted) ?
                <TerasActionButton disabled={submitting} emphasis="secondary" onClick={returnToWorkBoard}>{returnLabel}</TerasActionButton> : null}
            </TechnicalPlanActionPanel>
            <TechnicalPlanAdvisor key={editor.deliveryId} view={step === "plan" ? planView : step} sourceContext={sourceContext} editor={displayed ? viewEditor : editor} section={section}
              onSectionChange={setSection} model={model} brief={saved.brief} contextState={saved.loading ? "loading" : saved.error ?? (saved.brief ? "available" : "no finalized brief returned")}
              widthControl={{ wide: advisorWide, onToggle: () => setAdvisorWide(wide => !wide) }}
              currentPlanRef={persisted?.artifact.custody.uri ?? current?.artifact.custody.uri ?? null}
              disabled={!editable || Boolean(validated || approved)} onEdit={next => edit(() => next)} />
          </TerasPanelStack>
        </TerasZone>
      </TerasPlanning.Zones>
    </TerasPlanning.Modal>
    {changeConfirmation ? <TerasDraftCloseGuardDialog open title={changeConfirmation.title} kicker="Technical plan draft"
      description={changeConfirmation.description} keepEditingLabel="Cancel" leaveLabel={changeConfirmation.actionLabel}
      onKeepEditing={() => setPendingChange(null)} onLeave={() => {
        setPendingChange(null);
        if (editable) changeConfirmation.apply();
      }} /> : null}
    <TerasDraftCloseGuardDialog open={closeGuardOpen} title="Leave before draft save finishes?" kicker="Technical plan draft"
      description="Stay until the save is confirmed to resume this version from another session." leaveLabel="Leave Now"
      onKeepEditing={()=>{exitAction.current=onClose;setCloseGuardOpen(false);}} onLeave={()=>exitAction.current()}/>
  </>;
}

function validationFinding(issue: string, titles: Record<string, string>, architecture: unknown) {
  if (/\bacyclic\b/.test(issue)) {
    if (/\bparent links\b/.test(issue)) return { section: null, summary: "Some work items are set as parents of one another. Check the package tree for a parent loop." };
    if (/\bsource landing graph\b/.test(issue)) return { section: "architecture:landing_units",
      summary: "Some change groups require each other to merge first. Review their merge order." };
    return { section: "architecture:work_item_execution_plan",
      summary: "Some work or approvals depend on each other. Review the order to see what can start first." };
  }
  if (issue === "architecture human gate ids must be unique") return { section: "architecture:required_human_gates",
    summary: "Two approvals use the same identifier. Review the list for a duplicate approval." };
  const approval = /^architecture human gate (\S+) (.*)$/.exec(issue);
  if (approval) {
    const [, id, reason] = approval;
    const details = architecture as { required_human_gates?: Array<{ gate_id?: string; authority_work_item_id?: string }> } | null;
    const record = Array.isArray(details?.required_human_gates) ? details.required_human_gates.find(gate => gate?.gate_id === id) : null;
    const heading = record?.authority_work_item_id ? titles[record.authority_work_item_id] ??
      record.authority_work_item_id.replace(/^work-item-([1-9]\d*)$/, "Work item #$1") : "An approval";
    const work = [...new Set([...reason.matchAll(/\bwork-item-([1-9]\d*)\b/g)].map(([ref, number]) => titles[ref] ?? `Work item #${number}`))];
    const summary = reason.includes("evidence prerequisites are absent")
      ? `${heading} is missing a dependency for its required evidence${work.length ? ` (${work.join(", ")})` : ""}.`
      : reason.includes("authority owner does not match") ? `${heading} must use the repository assigned to its approval work item.`
      : reason.includes("references unknown") ? `${heading} points to work or a change group outside this plan.`
      : reason.includes("blocks source merge") ? `${heading} applies a merge approval to a group without file changes.`
      : `Review which work item records the approval for ${heading}.`;
    return { section: "architecture:required_human_gates", summary };
  }
  const section = technicalPlanCheckSection(issue);
  return { section, summary: section ? `Review the entries in ${technicalPlanSection(section)[1]}.` :
    "The plan did not pass this check. Open Plan checks requiring attention for the recorded finding." };
}

function candidateMetadata(artifact: ArchitecturePacketArtifact) {
  return [
    { label: "Artifact", value: artifact.artifact_id },
    { label: "Delivery", value: artifact.delivery_id },
    { label: "Decision", value: artifact.decision.status },
    { label: "Operator", value: artifact.operator.id },
    { label: "Covered scope", value: `${artifact.covered_work_item_ids.length} work items` },
    { label: "Digest", value: artifact.integrity.content_digest },
    { label: "Custody", value: artifact.custody.state },
  ];
}
