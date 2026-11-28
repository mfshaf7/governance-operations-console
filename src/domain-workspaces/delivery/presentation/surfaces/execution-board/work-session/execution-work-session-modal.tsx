import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TerasLoadingState,
  TerasActionButton,
  TerasContentTray,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasFieldStack,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasSignalItem,
  TerasTextField,
  TerasTechnicalDetails,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";
import type {
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionProjection,
} from "../../../../live-runtime/delivery-work-session-live-types.ts";
import type { DeliveryPublication } from "../../../../live-runtime/delivery-command-outcome.ts";
import { workSessionCommand, workSessionCommandLabel, workSessionMove, workSessionReviewUrl, type ExecutionWorkSessionTarget } from "./execution-work-session-target.ts";
import { ExecutionSourceRealizationPanel } from "./execution-source-realization-panel.tsx";
import { canContinueApprovedSourceAccess } from "./execution-source-access.ts";
import { SourceAuthorizationPanel } from "../../../../../../environment-lifecycle/presentation/source-authorization-panel.tsx";
import { assertDeliveryWorkSessionDecision } from "../../../../live-runtime/delivery-work-session-live-contract.ts";

import type { TechnicalPlanGuidanceScope } from "../../../../work-model/execution/technical-plan-guidance.ts";
import type { TechnicalPlanRequirement } from "../../../../work-model/execution/technical-plan-requirement.ts";
import { ExecutionTechnicalPlanGuidance, type ExecutionPlanStarterTransfer } from "./execution-technical-plan-guidance.tsx";

type WorkSessionRuntime = {
  reconstructWork?: () => Promise<unknown>;
  resumeRebuild?: () => Promise<unknown>;
  recoverWork?: (reason: string) => Promise<unknown>;
  closeWork: () => Promise<unknown>;
  continueWork: (sourceIntentRef?: string, reviewedVerificationDigest?: string) => Promise<unknown>;
  mergeWork: () => Promise<unknown>;
  operationStatus?: "idle" | "checking" | "completed" | "failed";
  publication?: DeliveryPublication | null;
  accessCheckStatus?: "idle" | "checking" | "failed";
  mode: "disconnected-preview" | "live" | null;
  prepare: () => Promise<unknown>;
  projection: DeliveryWorkSessionProjection | null;
  projectionError: string | null;
  projectionStatus: "current" | "loading" | "offline";
  refresh: () => Promise<unknown>;
  start: (decision: DeliveryWorkSessionDecisionInput, sourceIntentRef?: string) => Promise<unknown>;
};

export function ExecutionWorkSessionModal({
  onClose,
  runtime,
  target,
  onNavigate,
  planRequirement,
  planGuidance,
  onDraftTechnicalPlan,
  onViewApprovedPlan,
  workRecords,
  featureReview,
}: {
  onClose: () => void;
  runtime: WorkSessionRuntime;
  target: ExecutionWorkSessionTarget;
  planRequirement?: TechnicalPlanRequirement;
  planGuidance?: TechnicalPlanGuidanceScope | null;
  onDraftTechnicalPlan?: (transfer: ExecutionPlanStarterTransfer) => void;
  onViewApprovedPlan?: () => void;
  workRecords?: ReadonlyMap<string, { title: string; repository: string | null }>;
  featureReview?: { title: string; workItemId: number; open: () => void };
  onNavigate?: (destination: "work" | "closeout" | "architecture", deliveryId: string | null, workItemId?: number) => void;
}) {
  const draft = runtime.projection?.decision_draft ?? null;
  const [decision, setDecision] = useState<DeliveryWorkSessionDecisionInput | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const submitting = pendingAction !== null;
  const [sourceAccess, setSourceAccess] = useState<{ scope: string; intent: string | null } | null>(null);
  const [recoveryReason, setRecoveryReason] = useState("");

  const [closeGuard, setCloseGuard] = useState<"close" | "reload" | null>(null);
  const [sourceChanged, setSourceChanged] = useState(false);
  const sourceKey = JSON.stringify(draft);
  const initializedSource = useRef<string | null>(null);
  const savedDecision = useRef<string | null>(null);
  const decisionKey = JSON.stringify(decision);
  const decisionRef = useRef(decisionKey); decisionRef.current = decisionKey;
  const dirty = !runtime.projection?.session_id && savedDecision.current !== null && decisionKey !== savedDecision.current;
  function loadDecision() {
    const next = decisionInputFromDraft(draft ?? undefined);
    initializedSource.current = sourceKey;
    savedDecision.current = JSON.stringify(next);
    setDecision(next); setSourceChanged(false); setCloseGuard(null);
  }
  useEffect(() => {
    if (initializedSource.current === sourceKey) return;
    if (!runtime.projection?.session_id && savedDecision.current !== null && savedDecision.current !== decisionRef.current) {
      setSourceChanged(true); return;
    }
    const next = decisionInputFromDraft(draft ?? undefined);
    initializedSource.current = sourceKey;
    savedDecision.current = JSON.stringify(next);
    setDecision(next); setSourceChanged(false);
  }, [sourceKey, draft, runtime.projection?.session_id]);
  function requestClose() {
    if (submitting) return;
    if (dirty) setCloseGuard("close");
    else onClose();
  }
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || submitting) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, submitting]);

  const decisionReady = useMemo(
    () => (decision ? workSessionDecisionReady(decision) &&
      (!decision.coveredWorkItemIds || decision.coveredWorkItemIds.includes(`work-item-${target.workItemId}`)) : false),
    [decision, target.workItemId],
  );
  const artifactLocation = decision?.architecture.artifactLocation;
  const recordedPlan = Boolean(artifactLocation && "recorded_artifact_digest" in artifactLocation);
  const repositoryLocation = artifactLocation && "repo" in artifactLocation ? artifactLocation : null;
  const projection = runtime.projection;
  const sourceDecision = draft && decision ? {
    ...draft,
    covered_work_item_ids: decision.coveredWorkItemIds ?? draft.covered_work_item_ids,
    architecture: { required: decision.architecture.required, artifact_location: decision.architecture.artifactLocation },
    landing_unit: { ...draft.landing_unit, branch: decision.branch, decision: decision.landingUnitDecision, id: decision.landingUnitId, rollback_boundary: decision.rollbackBoundary, split_reason: decision.splitReason },
  } : null;
  const scope = projection?.source_access_scope;
  const boundIntentRef = projection?.source_authorization?.intent_ref ?? null;
  const sourceAccessKey = JSON.stringify([target.workItemId, projection?.session_id, scope, boundIntentRef, sourceDecision]);
  const sourceIntent = sourceAccess?.scope === sourceAccessKey ? sourceAccess.intent : null;
  const updateSourceIntent = useCallback((intent: string | null) => {
    setSourceAccess(current => current?.scope === sourceAccessKey && current.intent === intent ? current : { scope: sourceAccessKey, intent });
  }, [sourceAccessKey]);
  const nextAction = projection?.next_action ?? null;
  const verification = projection?.operating_verification;
  const closedReview = projection?.closed_review;
  const setupItems = decision?.coveredWorkItemIds ?? draft?.covered_work_item_ids ?? [];
  const setupRepositories = [...new Set(setupItems.map(id => workRecords?.get(id)?.repository).filter(Boolean))];
  const configuredRepository = (projection?.configured_path?.landing_unit as { owner_repo?: unknown } | undefined)?.owner_repo;
  const workLabel = (id: string) => {
    const number = id.slice("work-item-".length);
    const title = workRecords?.get(id)?.title;
    return title ? `#${number} · ${title}` : `Work item #${number}`;
  };
  const requiresSourceAccess = nextAction?.code === "source-worktree-required" || nextAction?.code === "architecture-compatible-refresh-required";
  const move = nextAction ? workSessionMove(nextAction.code, projection?.facts?.operating_evidence) : null;
  const diagnostic = error ?? runtime.projectionError;
  const unavailable = runtime.projectionStatus === "offline";
  const publishingUrl = workSessionReviewUrl(runtime.publication?.url);
  const reviewUrl = publishingUrl ?? workSessionReviewUrl(projection?.pull_request?.url);
  const merged = projection?.pull_request?.state === "merged";
  const sourceAccessClosing = nextAction?.code === "source-revocation-required" || nextAction?.code === "source-revocation-pending";
  const reviewFeature = projection?.state === "closed" && !sourceAccessClosing ? featureReview : undefined;
  const sourceStageFinished = merged || ["closed", "cleanup-required", "cleanup-blocked", "recovery-recorded"].includes(projection?.state ?? "");
  const showSourceAccess = runtime.mode === "live" && target.workItemId !== null &&
    (sourceAccessClosing || !sourceStageFinished && Boolean(projection?.session_id || draft));
  const refreshAfterAccessClosure = useCallback(() => { void runtime.refresh().catch(() => undefined); }, [runtime.refresh]);
  const prerequisite = nextAction && ["architecture-prerequisite-required", "architecture-human-gate-required"].includes(nextAction.code);
  const requiredWorkRef = nextAction?.inputs?.work_item_id;
  const requiredWorkId = typeof requiredWorkRef === "string" && /^work-item-[1-9][0-9]*$/.test(requiredWorkRef) ? Number(requiredWorkRef.replace("work-item-", "")) : undefined;
  const followUp = nextAction && ["initiative-closeout-required", "initiative-closeout-gates-required"].includes(nextAction.code) ? "closeout" :
    prerequisite || nextAction && ["initiative-work-remains", "initiative-follow-up-required", "art-blocker-review-required"].includes(nextAction.code) ? "work" :
    nextAction && ["architecture-packet-required", "architecture-binding-required"].includes(nextAction.code) ? "architecture" : null;
  const configuredPlan = projection?.configured_path?.architecture as { required?: boolean } | undefined;
  const canAdvise = runtime.mode === "live" && runtime.projectionStatus === "current" &&
    projection && !projection.session_id && configuredPlan?.required !== true &&
    planGuidance && projection.delivery_id === planGuidance.deliveryId &&
    projection.work_item_id === `work-item-${planGuidance.work.id}` &&
    (planRequirement?.status === "unknown" || planRequirement?.status === "not-required") &&
    (nextAction?.code === "work-session-start-required" || nextAction?.code === "work-session-start-ready");
  const projectedCommand = workSessionCommand(nextAction?.code);
  const canPrepare =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    !projection?.session_id &&
    !draft &&
    nextAction?.code === "work-session-start-required";
  const canStart =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    !projection?.session_id &&
    Boolean(draft && decisionReady && !sourceChanged);
  const checkingOperation = runtime.operationStatus === "checking";
  const checkingPublication = Boolean(publishingUrl && (submitting || checkingOperation));
  const checkingAccess = runtime.accessCheckStatus === "checking";
  const accessFailed = runtime.accessCheckStatus === "failed";
  const waitingForSourceAccess = requiresSourceAccess && (!scope || !sourceIntent);
  const sourceProgress = checkingPublication ? {
    title: "Pull request opened", status: "Verifying",
    description: "The pull request is open. Delivery is still collecting verification results for this revision.",
  } : checkingAccess ? {
    title: "Checking repository access", status: "Checking",
    description: "The Console is checking the original repository access request.",
  } : accessFailed ? {
    title: "Review repository access", status: "Access needs attention",
    description: "The access request needs attention. Check Repository access below for the current result.",
  } : null;
  const setupProgress = draft && decision && !projection?.session_id && runtime.projectionStatus === "current" &&
    !diagnostic && !checkingOperation && runtime.operationStatus !== "failed"
    ? workSessionSetupProgress(canStart, Boolean(sourceIntent), sourceChanged) : null;
  const pendingProgress = pendingAction && !checkingOperation ? {
    title: pendingAction,
    status: "In progress",
    description: "The Console will show the result when Delivery confirms it.",
  } : null;
  const nextProgress = sourceProgress ?? pendingProgress ?? (reviewFeature ? {
    title: "Review the completed Feature",
    status: "Ready for review",
    description: `Child work for ${reviewFeature.title} is closed. Review and record the overall result.`,
  } : setupProgress);
  const canRunProjectedCommand =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    Boolean(
      projection?.session_id &&
        projection.session_revision &&
        projectedCommand && (!publishingUrl || nextAction?.code !== "agent-source-publish-required") &&
        !waitingForSourceAccess,
    );

  async function run(command: () => Promise<unknown>, title = "Updating the work session") {
    setPendingAction(title);
    setError(null);
    try {
      await command();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Work-session request failed.");
    } finally {
      setPendingAction(null);
    }
  }

  function runProjectedCommand() {
    if (projectedCommand === "reconstruct") {
      if (!runtime.reconstructWork) throw new Error("Session reconstruction is unavailable.");
      return runtime.reconstructWork();
    }
    if (projectedCommand === "merge") return runtime.mergeWork();
    if (projectedCommand === "close") return runtime.closeWork();
    if (requiresSourceAccess && (!scope || !sourceIntent)) throw new Error("Confirm repository access before continuing.");
    if (verification) return runtime.continueWork(undefined, verification.digest);
    return runtime.continueWork(sourceIntent ?? undefined);
  }

  return (
    <>
    <TerasModalShell busy={submitting} busyLabel="Updating the work session…"
      bodyLayout="scroll"
      description="Prepare your work, edit files, and follow the review and checks through completion."
      footer={
        <TerasActionButton emphasis="secondary" disabled={submitting} onClick={requestClose}>
          Back to Board
        </TerasActionButton>
      }
      height="content"
      kicker="Delivery · Execution"
      onClose={requestClose}
      surfaceId="delivery-execution-work-session"
      title="Work Session"
      width="large"
    >
      <TerasZoneLayout variant="main-support">
        <TerasZone fit="content" role="region" aria-label="Work details">
          <TerasFieldStack spacing="normal">
          <TerasPanel spacing="normal"
            frame="padded"
            layout="header-body"
            tone="info"
            treatment="state"
          >
            <TerasPanelHeader
              actions={runtime.mode === "live" ? (
                <TerasActionButton disabled={submitting} emphasis="secondary" onClick={() => run(runtime.refresh)}>
                  Refresh session
                </TerasActionButton>
              ) : undefined}
              description={target.description}
              kicker="Selected work"
              title={target.title}
            />
            <TerasMetadataList
              items={[
                {
                  label: target.sourceLabel,
                  value: target.sourceValue,
                },
                {
                  label: "Work item",
                  value: target.workItemId
                    ? `Work item #${target.workItemId}`
                    : "Unavailable",
                },
                {
                  label: "Session",
                  value: projection?.state === "closed" ? "Closed" : projection?.state === "recovery-recorded" ? "Archived" :
                    projection?.session_id ? "Started" : "Not started",
                },
                {
                  label: "Work covered",
                  value: workSessionScope(projection, decision?.coveredWorkItemIds),
                },
              ]}
            />
          </TerasPanel>

          {sourceChanged ? <TerasContentTray role="status" title="Work setup changed"
            description="Your edits are still here. Review the updated setup before starting."
            actions={<TerasActionButton disabled={submitting} emphasis="secondary" onClick={() => setCloseGuard("reload")}>
              Reload current decision
            </TerasActionButton>} /> : null}
          {decision ? (
            <TerasPanel spacing="normal"
              frame="padded"
              layout="header-body"
              tone="warn"
              treatment="state"
            >
              <TerasPanelHeader
                description={recordedPlan ? "This is the scope and repository recorded in the approved Technical Plan." :
                  "Review which work will be merged together and what to undo if it fails."}
                kicker="Before you start"
                title={recordedPlan ? "Approved work scope" : "Work to review together"}
              />
              <TerasFieldStack spacing="normal">
                {recordedPlan ? <>
                  <TerasMetadataList columns={2} items={[
                    { label: "Repository", value: typeof configuredRepository === "string" && configuredRepository
                      ? configuredRepository : setupRepositories.join(", ") || "Read repository access below" },
                    { label: "Base branch", value: draft?.landing_unit.base_ref ?? "Unavailable" },
                    ...setupItems.map(id => ({ label: "Covered work", value: workLabel(id) })),
                  ]} />
                </> : <>
                <TerasTextField
                  disabled={submitting}
                  label="Work item numbers"
                  helper="Enter each number separated by a comma, such as 1386, 1387."
                  onValueChange={(value) => setDecision(current => current ? { ...current,
                    coveredWorkItemIds: value.split(",").map(item => item.trim().replace(/^#?([1-9][0-9]*)$/, "work-item-$1"))
                  } : current)}
                  value={(decision.coveredWorkItemIds ?? draft?.covered_work_item_ids ?? [])
                    .map(item => item.replace(/^work-item-/, "")).join(", ")}
                />
                <TerasSelectField
                  disabled={submitting}
                  label="How will the changes merge?"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "landingUnitDecision", value)
                  }
                  options={[
                    {
                      label: "Merge this work item separately",
                      value: "child_isolated_landing_unit",
                    },
                    {
                      label: "Merge the feature’s work together",
                      value: "feature_single_landing_unit",
                    },
                  ]}
                  value={decision.landingUnitDecision}
                />
                </>}
                <TerasFieldGrid>
                {!recordedPlan ? <TerasTextField
                  disabled={submitting}
                  label="Change group ID"
                  helper="Use a short label to identify this group, such as homepage-update."
                  onValueChange={(value) =>
                    updateDecision(setDecision, "landingUnitId", value)
                  }
                  value={decision.landingUnitId}
                /> : null}
                <TerasTextField
                  disabled={submitting}
                  label="Branch"
                  helper="The session will publish changes from this branch."
                  onValueChange={(value) =>
                    updateDecision(setDecision, "branch", value)
                  }
                  value={decision.branch}
                />
                </TerasFieldGrid>
                <TerasFieldGrid>
                <TerasNoteField
                  disabled={submitting}
                  label="Why group the changes this way?"
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "splitReason", value)
                  }
                  value={decision.splitReason}
                />
                <TerasNoteField
                  disabled={submitting}
                  label="What should be undone together?"
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "rollbackBoundary", value)
                  }
                  value={decision.rollbackBoundary}
                />
                </TerasFieldGrid>
                {!recordedPlan ? <TerasSelectField
                  disabled={submitting}
                  label="Technical Plan"
                  onValueChange={(value) =>
                    setDecision((current) =>
                      current
                        ? {
                            ...current,
                            architecture: {
                              ...current.architecture,
                              required: value === "required",
                              artifactLocation: value === "required" ? current.architecture.artifactLocation : null,
                            },
                          }
                        : current,
                    )
                  }
                  options={[
                    { label: "Required", value: "required" },
                    { label: "Not required", value: "not-required" },
                  ]}
                  value={decision.architecture.required ? "required" : "not-required"}
                /> : null}
                {!recordedPlan && decision.architecture.required ? (
                  <TerasContentTray kicker="Technical Plan file">
                    <TerasFieldStack spacing="normal">
                      <TerasTextField
                  disabled={submitting}
                        label="Implementation repository"
                        onValueChange={(value) =>
                          updateArchitectureLocation(setDecision, "repo", value)
                        }
                        value={repositoryLocation?.repo ?? ""}
                      />
                      <TerasTextField
                  disabled={submitting}
                        label="Path in the repository"
                        onValueChange={(value) =>
                          updateArchitectureLocation(
                            setDecision,
                            "relative_path",
                            value,
                          )
                        }
                        value={
                          repositoryLocation?.relative_path ?? ""
                        }
                      />
                    </TerasFieldStack>
                  </TerasContentTray>
                ) : null}
              </TerasFieldStack>
            </TerasPanel>
          ) : null}

          {runtime.mode === "live" && runtime.projectionStatus === "current" &&
            !sourceStageFinished && !sourceAccessClosing && nextAction?.code !== "source-worktree-required" &&
            projection?.session_id && projection.session_revision && target.workItemId ? (
            <ExecutionSourceRealizationPanel
              key={`${projection.session_id}:${target.workItemId}`}
              sessionId={projection.session_id}
              sessionRevision={projection.session_revision}
              sourceWorkRequired={nextAction?.code === "source-work-required"}
              sourceIntentRef={sourceIntent}
              workItemId={target.workItemId}
            />
          ) : null}
          {verification ? <TerasPanel spacing="normal" frame="padded" layout="header-body" treatment="neutral">
              <TerasPanelHeader kicker="Verification" title="What will be checked"
                description="Review the original merge, the verifier, and the approved checks." />
              <TerasMetadataList items={[
                { label: "Original merge", value: <a href={verification.source.pull_request_url} target="_blank" rel="noopener noreferrer">PR #{verification.source.pull_request_url.split("/").at(-1)} · {verification.source.merge_commit.slice(0, 7)} ↗</a> },
                { label: "Reviewed verifier", value: <a href={verification.verifier.pull_request_url} target="_blank" rel="noopener noreferrer">PR #{verification.verifier.pull_request_url.split("/").at(-1)} · {verification.verifier.revision.slice(0, 7)} ↗</a> },
                { label: "Approved checks", value: <ul>{verification.cases.map(testCase => <li key={testCase.id}>{testCase.title}</li>)}</ul> },
              ]} />
          </TerasPanel> : null}
          {nextAction?.code === "architecture-recovery-required" ? (
            <TerasPanel spacing="normal" frame="padded" layout="header-body" treatment="neutral">
              <TerasPanelHeader kicker="Recovery" title="Previous session records"
                description="Review the retained records and explain why you want to archive this session." />
              <TerasFieldStack spacing="normal">
                {reviewUrl ? <a href={reviewUrl} target="_blank" rel="noopener noreferrer">Open the original pull request ↗</a> : null}
                <TerasTechnicalDetails summary="Recovery evidence" items={[
                  { label: "Session", value: projection?.session_id ?? "Unavailable" },
                  { label: "Source head", value: String(projection?.pull_request?.head_commit ?? projection?.source?.head_commit ?? "Unavailable") },
                  { label: "Merge commit", value: String(projection?.pull_request?.merge_commit ?? "Unmerged source") },
                ]} />
                <TerasNoteField label="Reason for archiving" value={recoveryReason} onValueChange={setRecoveryReason} placeholder="Explain why the superseded attempt should be retained as history." />
              </TerasFieldStack>
            </TerasPanel>
          ) : null}
          {projection?.closeout ? (
            <TerasPanel spacing="normal"
              frame="padded"
              layout="header-body"
              tone={projection.closeout.state === "complete" ? "ok" : "warn"}
              treatment="state"
            >
              <TerasPanelHeader
                description="See which work items were marked complete and which still need attention."
                kicker="Completion"
                statusLabel={
                  projection.closeout.state === "complete" ? "Complete" : "Retry required"
                }
                statusTone={projection.closeout.state === "complete" ? "ok" : "warn"}
                title="Work item results"
              />
              <TerasMetadataList
                items={[
                  {
                    label: "Scope",
                    value: `${projection.closeout.covered_work_item_ids.length} work item${projection.closeout.covered_work_item_ids.length === 1 ? "" : "s"}`,
                  },
                  {
                    label: "Completed",
                    value: String(projection.closeout.completed.length),
                  },
                  {
                    label: "Already closed",
                    value: String(projection.closeout.skipped_work_items.length),
                  },
                  {
                    label: "Failed",
                    value: String(projection.closeout.failed.length),
                  },
                ]}
              />
            </TerasPanel>
          ) : null}

          {projection && (projection.session_id || projection.command_receipt || projection.cleanup_receipt) ? (
            <TerasPanel spacing="normal"
              frame="padded"
              layout="header-body"
              treatment="neutral"
            >
              <TerasPanelHeader
                kicker="Work Session"
                title="Session progress"
                description={projection.closed_review_unavailable ? "This session is closed. Its final review could not be read. Refresh the session to try again."
                  : projection.state === "closed" && !closedReview && !projection.facts && !projection.pull_request
                  ? "This session is closed. Its closure record does not list the pull request or verification results."
                  : undefined}
              />
              <TerasMetadataList items={workSessionProgress(projection)} />
              {closedReview ? <TerasMetadataList items={[
                ...closedReview.covered_work_item_ids.map(id => ({ label: "Closed work", value: workLabel(id) })),
                ...closedReview.pull_request_urls.map(url => {
                  const [, owner, repo, , number] = new URL(url).pathname.split("/");
                  return { label: "Merged pull request", value: <a href={url} target="_blank" rel="noopener noreferrer">{owner}/{repo} #{number} ↗</a> };
                }),
              ]} /> : null}
              {closedReview?.passed_checks?.length ? <TerasTechnicalDetails summary="Passed checks"
                items={closedReview.passed_checks.map(name => ({ label: name, value: "Passed" }))} /> : null}
              <TerasTechnicalDetails items={[
                ...workSessionDiagnostics(projection),
                ...(projection.command_receipt ? [
                  { label: "Latest result code", value: projection.command_receipt.result_state },
                  { label: "Latest action executor", value: projection.command_receipt.executor_id },
                  { label: "Latest action receipt", value: projection.command_receipt.ref },
                ] : []),
                ...(projection.cleanup_receipt ? [
                  { label: "Cleanup outcome code", value: projection.cleanup_receipt.outcome },
                  { label: "Recorded session state", value: projection.state },
                ] : []),
              ]} />
            </TerasPanel>
          ) : null}
          {canAdvise && planGuidance && onDraftTechnicalPlan && onViewApprovedPlan ? <ExecutionTechnicalPlanGuidance
            scope={planGuidance} disabled={submitting || sourceChanged} onDraft={onDraftTechnicalPlan} onViewApproved={onViewApprovedPlan} /> : null}
          {planRequirement?.status === "covered" && onNavigate ? <TerasContentTray title={planRequirement.title}
            description={planRequirement.detail}>
            <TerasActionButton emphasis="secondary" onClick={() => onNavigate("architecture", projection?.delivery_id ?? null)}>
              {planRequirement.actionLabel}
            </TerasActionButton>
          </TerasContentTray> : null}
          </TerasFieldStack>
        </TerasZone>

        <TerasZone fit="content" role="region" aria-label="Session actions">
          <TerasFieldStack spacing="normal">
          <TerasPanel spacing="normal"
            frame="padded"
            layout="header-body"
            tone={runtime.projectionStatus === "offline" ? "danger" : "info"}
            treatment="rail"
          >
            <TerasPanelHeader
              description={nextProgress?.description ?? (checkingOperation ? (runtime.resumeRebuild ? "Continue the saved rebuild if the connection was interrupted. The Console will use the original request." : "The Console will check the original request and show the result when Delivery confirms it.") : runtime.operationStatus === "failed" ? "Delivery reported a problem with the original request. Read the current session before trying again." : unavailable ? "Read the session again to check the current state." :
                diagnostic ? "The result could not be confirmed. Refresh the session before trying again." :
                waitingForSourceAccess ? "Review the repository and branch below before continuing." :
                verification ? "Review the checks under What will be checked, then verify the runtime results." :
                move?.description ?? (runtime.mode === "disconnected-preview" ? "This preview is disconnected from live work sessions." : undefined))}
              kicker={nextAction?.code === "work-complete" ? "Session status" : "Next action"}
              statusLabel={nextProgress?.status ?? (checkingOperation ? "Checking" : unavailable ? "Unavailable" : diagnostic ? "Check result" : waitingForSourceAccess ? "Access required" : move?.status)}
              statusTone={unavailable ? "danger" : pendingProgress ? "info" : diagnostic || move?.status === "Blocked" ? "warn" : move?.status === "Complete" ? "ok" : "info"}
              title={nextProgress?.title ?? (checkingOperation ? "Checking the original result" : unavailable ? "Session unavailable" : waitingForSourceAccess ? "Review repository access" : move?.title ?? "Work session status")}
            />
            {checkingOperation || checkingAccess || checkingPublication ? runtime.resumeRebuild ? (
              <TerasActionButton disabled={submitting} onClick={() => run(runtime.resumeRebuild!)}>Resume Saved Rebuild</TerasActionButton>
            ) : null : unavailable ? (
              <TerasActionButton emphasis="secondary" disabled={submitting} onClick={() => run(runtime.refresh)}>
                Retry loading session
              </TerasActionButton>
            ) : canPrepare ? (
              <TerasActionButton disabled={submitting} onClick={() => run(runtime.prepare)}>
                Prepare Session
              </TerasActionButton>
            ) : canStart && decision && sourceIntent ? (
              <TerasActionButton disabled={submitting}
                onClick={() => run(() => runtime.start(decision, sourceIntent), "Starting the work session")}>
                Start Work Session
              </TerasActionButton>
            ) : canRunProjectedCommand && nextAction ? (
              <TerasActionButton disabled={submitting} onClick={() => run(runProjectedCommand,
                nextAction.code === "acquire-operating-evidence" ? "Verifying runtime results"
                  : projectedCommand === "close" ? "Closing the work session" : undefined)}>
                {workSessionCommandLabel(nextAction.code)}
              </TerasActionButton>
            ) : nextAction?.code === "architecture-recovery-required" ? (
                <TerasActionButton disabled={submitting || runtime.mode !== "live" || runtime.projectionStatus !== "current" || !runtime.recoverWork || recoveryReason.trim().length < 20}
                  onClick={() => run(() => runtime.recoverWork!(recoveryReason))}>Archive Superseded Session</TerasActionButton>
            ) : reviewFeature ? (
              <TerasActionButton disabled={submitting} onClick={reviewFeature.open}>
                Review Feature #{reviewFeature.workItemId}
              </TerasActionButton>
            ) : followUp && onNavigate ? (
              <TerasActionButton disabled={submitting} onClick={() => onNavigate(followUp, projection?.delivery_id ?? null, requiredWorkId)}>
                {followUp === "closeout" ? "Review Closeout" : followUp === "architecture" ? planRequirement?.actionLabel ?? "Open Technical Plan" : prerequisite ? "Open Required Work" : "Open Work Board"}
              </TerasActionButton>
            ) : runtime.projectionStatus === "loading" ? (
              <TerasLoadingState label="Loading execution session…" skeleton="details" />
            ) : null}
            {reviewUrl && !verification && nextAction?.code !== "architecture-recovery-required" ? (
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer">{merged ? "Open Merged Pull Request ↗" : "Open Pull Request ↗"}</a>
            ) : null}
            {diagnostic || nextAction ? (
              <TerasTechnicalDetails items={[
                ...(diagnostic ? [{ label: "Read or action result", value: diagnostic }] : []),
                ...(projection ? [{ label: "Session reference", value: projection.session_id ?? "Not started" },
                  { label: "Recorded state", value: projection.state }] : []),
                ...(verification ? [
                  { label: "Original reviewed head", value: verification.source.head_commit },
                  { label: "Original merge commit", value: verification.source.merge_commit },
                  { label: "Verification profile revision", value: verification.verifier.revision },
                  { label: "Original Review Packet digest", value: verification.review_packet_digest },
                ] : nextAction?.code === "acquire-operating-evidence" && projection?.source?.head_commit
                  ? [{ label: "Verification profile revision", value: projection.source.head_commit }] : []),
                ...(nextAction ? [
                  { label: "Recorded reason", value: nextAction.reason },
                  { label: "Action code", value: nextAction.code },
                  { label: "Responsible component", value: nextAction.authority },
                ] : []),
              ]} />
            ) : null}
          </TerasPanel>

          {showSourceAccess ?
          <section aria-label="Repository access">
          <SourceAuthorizationPanel
            subject={{ kind: "delivery", work_item_ref: scope?.work_item_ref ?? `work-item-${target.workItemId}` }} sourceStartDigest={scope?.source_start_digest ?? null}
            decision={projection?.session_id || !decisionReady || sourceChanged ? null : sourceDecision} onIntentChange={updateSourceIntent}
            preparationAllowed={Boolean(projection?.session_id ? scope : (decisionReady && !sourceChanged))}
            boundIntentRef={boundIntentRef}
            activeSession={scope && projection?.session_id ? { sessionId: projection.session_id, landingUnitId: projection.landing_unit_id, predecessorIntentRef: scope.predecessor_intent_ref } : null}
            closureSessionId={sourceAccessClosing ? projection?.source_authorization?.session_id : undefined}
            onAccessClosed={sourceAccessClosing ? refreshAfterAccessClosure : undefined}
            onContinueApprovedScope={canContinueApprovedSourceAccess(runtime)
              ? (intentId) => run(() => runtime.continueWork(intentId)) : undefined}
            continuePending={submitting || checkingAccess}
            onRecoverDecision={(value) => {
              const original = assertDeliveryWorkSessionDecision(value);
              if (original.work_item_id !== `work-item-${target.workItemId}`) throw new Error("This access approval is for a different work item.");
              if (!projection?.session_id) setDecision(decisionInputFromDraft(original));
            }}
          />
          </section> : null}

          </TerasFieldStack>
        </TerasZone>
      </TerasZoneLayout>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={closeGuard !== null} title={closeGuard === "reload" ? "Reload work-session decision?" : "Discard work-session edits?"}
      kicker="Unsubmitted source decision" description="These decision edits have not started a work session. Discarding removes the local edits; the recorded decision remains available."
      leaveLabel={closeGuard === "reload" ? "Discard and Reload" : "Discard Draft"}
      onKeepEditing={() => setCloseGuard(null)} onLeave={() => { if (closeGuard === "reload") loadDecision(); else onClose(); }} />
    </>
  );
}

function decisionInputFromDraft(
  draft: DeliveryWorkSessionProjection["decision_draft"],
): DeliveryWorkSessionDecisionInput | null {
  if (!draft) return null;
  return {
    architecture: {
      artifactLocation: draft.architecture.artifact_location,
      required: draft.architecture.required === true,
    },
    branch: draft.landing_unit.branch,
    coveredWorkItemIds: draft.covered_work_item_ids,
    landingUnitDecision: draft.landing_unit.decision,
    landingUnitId: draft.landing_unit.id,
    rollbackBoundary: cleanRequiredMarker(draft.landing_unit.rollback_boundary),
    splitReason: cleanRequiredMarker(draft.landing_unit.split_reason),
  };
}

function cleanRequiredMarker(value: string) {
  return value.startsWith("REQUIRED:") ? "" : value;
}

function workSessionScope(projection: DeliveryWorkSessionProjection | null, selected?: string[]) {
  const workItemIds =
    (projection?.session_id ? projection.covered_work_item_ids : selected) ??
    projection?.covered_work_item_ids ??
    projection?.decision_draft?.covered_work_item_ids ??
    (projection?.work_item_id ? [projection.work_item_id] : []);
  if (workItemIds.length === 0) return "Not resolved";
  return `${workItemIds.length} work item${workItemIds.length === 1 ? "" : "s"} · ${workItemIds
    .map((workItemId) => `#${workItemId.replace("work-item-", "")}`)
    .join(", ")}`;
}

function workSessionSetupProgress(canStart: boolean, accessApproved: boolean, setupChanged: boolean) {
  if (!canStart) return {
    title: "Review the work setup", status: "Review needed",
    description: setupChanged ? "Load the updated setup before continuing." :
      "Check that the work includes the selected item and complete the setup fields.",
  };
  if (!accessApproved) return {
    title: "Approve access to start", status: "Access required",
    description: "Review the repository and branch below. Start appears once access is approved.",
  };
  return {
    title: "Start the reviewed work", status: "Ready to start",
    description: "Start the session to set up your files and branch.",
  };
}

function workSessionProgress(projection: DeliveryWorkSessionProjection) {
  const facts = projection.facts ?? {};
  const pullRequest = projection.pull_request?.state ?? facts.pull_request ??
    (projection.closed_review?.pull_request_urls.length ? "merged" : undefined);
  const review = projection.closed_review ? "finalized" : facts.review_packet;
  const checks = projection.closed_review?.verification_recorded ? "ready" :
    facts.operating_evidence === "not-required" ? facts.evidence : facts.operating_evidence ?? facts.evidence;
  const closed = projection.state === "closed";
  const cleanup = projection.cleanup_receipt?.outcome;
  return [
    ...(closed ? [{ label: "Work session", value: "Closed" }] : []),
    ...(cleanup === "complete" || cleanup === "complete-with-retained-resources"
      ? [{ label: "Cleanup", value: cleanup === "complete" ? "Complete" : "Complete with resources retained" }] : []),
    ...(!closed || pullRequest ? [{ label: "Pull request", value: pullRequest === "merged" ? "Merged" :
      pullRequest === "open" ? "Open for review" : pullRequest === "draft" ? "Draft" : "No open pull request shown" }] : []),
    ...(!closed || checks ? [{ label: "Verification", value: checks === "ready" ? "Results recorded" :
      checks === "invalid" ? "Results need attention" : checks === "stale" ? "New results needed" : closed ? "Result unavailable" : "Results pending" }] : []),
    ...(!closed || review ? [{ label: "Review record", value: review === "finalized" ? "Finalized" :
      review === "merge-ready" ? (pullRequest === "merged" ? "Merge review recorded" : "Ready for merge") :
      review === "draft" ? "Draft" : closed ? "Review unavailable" : "Final review pending" }] : []),
  ];
}

function workSessionDiagnostics(projection: DeliveryWorkSessionProjection) {
  const facts = projection.facts ?? {};
  const context = projection.lifecycle_context;
  const contextValue = context
    ? `${context.measurements.packet_count} packet, ${context.measurements.raw_fallback_count} raw fallback`
    : "Not observed";
  return [
    {
      label: "Lifecycle",
      value: projection.projection?.state ?? projection.state,
    },
    {
      label: "Source",
      value: facts.source ?? projection.source?.state ?? "Not observed",
    },
    {
      label: "Pull request",
      value: facts.pull_request ?? projection.pull_request?.state ?? "Not observed",
    },
    {
      label: "Evidence",
      value: facts.evidence ?? "Not observed",
    },
    {
      label: "Review packet",
      value: facts.review_packet ?? "Not observed",
    },
    {
      label: "Readiness",
      value: facts.readiness_receipt ?? "Not observed",
    },
    {
      label: "Context",
      value: contextValue,
    },
    {
      label: "Cleanup",
      value:
        projection.cleanup_receipt?.outcome ??
        projection.cleanup?.state ??
        "Not started",
    },
  ];
}

function updateArchitectureLocation(
  setDecision: React.Dispatch<
    React.SetStateAction<DeliveryWorkSessionDecisionInput | null>
  >,
  field: "relative_path" | "repo",
  value: string,
) {
  setDecision((current) => {
    if (!current) return current;
    const location = current.architecture.artifactLocation;
    if (location && "recorded_artifact_digest" in location) return current;
    return {
      ...current,
      architecture: {
        ...current.architecture,
        artifactLocation: {
          relative_path: location?.relative_path ?? "",
          repo: location?.repo ?? "",
          [field]: value,
        },
      },
    };
  });
}

function updateDecision(
  setDecision: React.Dispatch<
    React.SetStateAction<DeliveryWorkSessionDecisionInput | null>
  >,
  field:
    | "branch"
    | "landingUnitDecision"
    | "landingUnitId"
    | "rollbackBoundary"
    | "splitReason",
  value: string,
) {
  setDecision((current) =>
    current ? { ...current, [field]: value } as DeliveryWorkSessionDecisionInput : current,
  );
}

function workSessionDecisionReady(decision: DeliveryWorkSessionDecisionInput) {
  const location = decision.architecture.artifactLocation;
  return Boolean(
    (!decision.coveredWorkItemIds || (decision.coveredWorkItemIds.length > 0 &&
      new Set(decision.coveredWorkItemIds).size === decision.coveredWorkItemIds.length &&
      decision.coveredWorkItemIds.every(item => /^work-item-[1-9][0-9]*$/.test(item)))) &&
    decision.branch.trim() &&
      decision.landingUnitId.trim() &&
      decision.rollbackBoundary.trim() &&
      decision.splitReason.trim() &&
      (!decision.architecture.required ||
        (location && ("recorded_artifact_digest" in location ||
          (location.repo.trim() && location.relative_path.trim())))),
  );
}
