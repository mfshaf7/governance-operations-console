"use client";

import { useMemo, useRef, useState } from "react";

import {
  TerasChoiceGroup,
  TerasContentTray,
  TerasDraftCloseGuardDialog,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
  TerasSelectableRow,
  TerasStatusItem,
  TerasTextField,
  TerasTechnicalDetails,
  TerasTrayStack,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
} from "@/teras";

import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleBlockerDecision,
  RepositoryLifecycleCommandIntent,
  RepositoryLifecycleLiveSnapshot,
  RepositoryLifecycleWorkflowResult,
} from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryLifecycleClientError } from "../../../live-runtime/use-repository-lifecycle-live-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryLifecycleActionLabels,
  repositoryLifecycleActionDescriptions,
  repositoryLifecycleExecutionAvailable,
  repositoryLifecycleActionOptions,
  repositoryLifecycleResultFacts,
  repositoryLifecycleResultTone,
  repositoryLifecycleReviewFacts,
  repositoryLifecycleState,
  repositoryLifecycleStateFacts,
  repositoryLifecycleSteps,
  type RepositoryLifecycleStep,
} from "./repository-lifecycle-view-model.ts";

type LifecycleDraft = {
  action: RepositoryLifecycleAction;
  approvalNote: string;
  blockerDecision: RepositoryLifecycleBlockerDecision | "none";
  confirmed: boolean;
  impactJustification: string;
  sourceOwnerAcceptanceNote: string;
  targetOwnerAcceptanceNote: string;
  targetWorkspaceOwnerRef: string;
};

export function RepositoryLifecycleDialog({
  custodyResult,
  error,
  initialAction,
  onClose,
  onExecute,
  onOpenHistory,
  pending,
  repository,
  result,
  snapshot,
  executionAvailable = false,
}: {
  custodyResult?: RepositoryCustodyWorkflowResult;
  error?: RepositoryLifecycleClientError;
  initialAction?: RepositoryLifecycleAction;
  onClose: () => void;
  onExecute: (intent: RepositoryLifecycleCommandIntent) => Promise<void>;
  onOpenHistory: (repository: RepositoryWorkspaceRecord) => void;
  pending: boolean;
  repository: RepositoryWorkspaceRecord | null;
  result?: RepositoryLifecycleWorkflowResult;
  snapshot?: RepositoryLifecycleLiveSnapshot;
  executionAvailable?: boolean;
}) {
  const state = repository
    ? repositoryLifecycleState(repository, snapshot)
    : null;
  const initial = initialAction ??
    (state?.workspace_record_state === "retired"
      ? "restore-workspace-record"
      : "retire-workspace-record");
  const [activeStep, setActiveStep] =
    useState<RepositoryLifecycleStep>("action");
  const [requestId, setRequestId] = useState(createLifecycleRequestId);
  const [requestedAt, setRequestedAt] = useState(() => new Date().toISOString());
  const [edited, setEdited] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<"close" | "history" | null>(null);
  const [confirmedState, setConfirmedState] = useState<string | null>(null);
  const executing = useRef(false);
  const [draft, setDraft] = useState<LifecycleDraft>(() => ({
    action: initial,
    approvalNote: "",
    blockerDecision: "none",
    confirmed: false,
    impactJustification: "",
    sourceOwnerAcceptanceNote: "",
    targetOwnerAcceptanceNote: "",
    targetWorkspaceOwnerRef: "",
  }));

  const actionOptions = useMemo(
    () => (state ? repositoryLifecycleActionOptions(state) : []),
    [state],
  );
  const selectedActionAvailable = Boolean(
    actionOptions.find((option) => option.id === draft.action && !option.disabled),
  );
  const transferComplete =
    draft.action !== "transfer-workspace-custody" ||
    (draft.targetWorkspaceOwnerRef.trim().length > 0 &&
      draft.sourceOwnerAcceptanceNote.trim().length >= 12 &&
      draft.targetOwnerAcceptanceNote.trim().length >= 12);
  const actionComplete = selectedActionAvailable && transferComplete;
  const blockingFindings = snapshot?.status === "current"
    ? snapshot.audit?.impact_summary.blocking_finding_count ?? 0
    : 0;
  const impactComplete =
    blockingFindings === 0 ||
    (draft.blockerDecision !== "none" && draft.impactJustification.trim().length >= 12);
  const reviewComplete =
    draft.confirmed &&
    draft.approvalNote.trim().length >= 12 &&
    impactComplete;

  if (!repository || !repository.providerIdentity || !state) return null;

  const repositoryIdentity = repository.providerIdentity;
  const repositoryRecordId = repository.id;
  const liveActionAvailable = repositoryLifecycleExecutionAvailable(repository, snapshot, custodyResult, executionAvailable, Boolean(error));
  const reviewState = JSON.stringify({ state, impact: snapshot?.audit?.impact_summary ?? null, custodyRequest: custodyResult?.request.request_id ?? null });
  const confirmationCurrent = draft.confirmed && confirmedState === reviewState;
  const canApply = actionComplete && reviewComplete && confirmationCurrent && liveActionAvailable && !pending;
  const steps = repositoryLifecycleSteps(activeStep, actionComplete, result);
  const statusTone = error ? "danger" : result
    ? repositoryLifecycleResultTone(result)
    : snapshot?.mode === "live"
      ? "info"
      : "muted";
  const statusLabel = error ? "Unavailable" : result
    ? result.status
    : snapshot?.mode === "live"
      ? liveActionAvailable ? "Ready for review" : "Read-only"
      : snapshot?.mode === "disconnected-preview" ? "Preview only" : "Loading source state";

  function updateDraft(patch: Partial<LifecycleDraft>) {
    if (pending || executing.current) return;
    if (result) {
      setRequestId(createLifecycleRequestId());
      setRequestedAt(new Date().toISOString());
    }
    setDraft((current) => ({ ...current, ...patch, confirmed: false }));
    setConfirmedState(null);
    setEdited(true);
  }

  function leave(target: "close" | "history") {
    if (target === "history" && repository) onOpenHistory(repository);
    else onClose();
  }

  function requestLeave(target: "close" | "history") {
    if (pending || executing.current) return;
    if (edited) setLeaveTarget(target);
    else leave(target);
  }

  async function applyLifecycleAction() {
    if (!canApply || executing.current) return;
    executing.current = true;
    try {
      await onExecute({
        action: draft.action,
        approvalNote: draft.approvalNote,
        impact: {
          blockerDecision:
            draft.blockerDecision === "none" ? null : draft.blockerDecision,
          justification: draft.impactJustification,
        },
        provider: repositoryIdentity.provider,
        providerRepositoryId: repositoryIdentity.repositoryId,
        repositoryOwner: repositoryIdentity.owner,
        repositoryId: repositoryRecordId,
        requestedAt,
        requestId,
        sourceCustodyRequestId: custodyResult?.request.request_id ?? null,
        sourceOwnerAcceptanceNote: draft.sourceOwnerAcceptanceNote,
        targetOwnerAcceptanceNote: draft.targetOwnerAcceptanceNote,
        targetWorkspaceOwnerRef: draft.targetWorkspaceOwnerRef,
      });
      setEdited(false);
      setActiveStep("result");
    } catch {
      // Keep the reviewed draft and retry identity when acknowledgement fails.
      setActiveStep("result");
    } finally {
      executing.current = false;
    }
  }

  return (
    <><TerasWizardModal busy={pending} busyLabel="Reading or applying repository change…"
      activeStepId={activeStep}
      description="Change workspace responsibility, archive on GitHub, or retire the workspace record. Files are never deleted here."
      footer={
        <TerasWizardFooter
          apply={
            activeStep === "review"
              ? {
                  disabled: !canApply,
                  label: pending ? "Applying..." : repositoryLifecycleActionLabels[draft.action],
                  onClick: () => void applyLifecycleAction(),
                  tone:
                    ["archive-provider", "retire-workspace-record"].includes(
                      draft.action,
                    )
                      ? "danger"
                      : "accent",
                }
              : undefined
          }
          back={
            activeStep === "review"
              ? {
                  emphasis: "secondary",
                  disabled: pending,
                  label: "Back",
                  onClick: () => setActiveStep("action"),
                }
              : {
                  emphasis: "secondary",
                  disabled: pending,
                  label: "Back to Register",
                  onClick: () => requestLeave("close"),
                }
          }
          finish={
            activeStep === "result"
              ? {
                  label: "View History",
                  disabled: pending,
                  onClick: () => requestLeave("history"),
                }
              : undefined
          }
          next={
            activeStep === "action"
              ? {
                  disabled: !actionComplete || pending,
                  label: "Review Action",
                  onClick: () => setActiveStep("review"),
                }
              : undefined
          }
        />
      }
      kicker="Repository Lifecycle"
      onClose={() => requestLeave("close")}
      onStepSelect={(stepId) => {
        if (pending || executing.current) return;
        if (
          stepId === "action" ||
          (stepId === "review" && actionComplete) ||
          (stepId === "result" && result)
        ) {
          setActiveStep(stepId as RepositoryLifecycleStep);
        }
      }}
      statusLabel={statusLabel}
      statusTone={statusTone}
      steps={steps}
      subject={{
        detail: `${repository.providerIdentity.owner}/${repository.providerIdentity.name}`,
        eyebrow: "Selected Repository",
        title: repository.name,
      }}
      support={
        <TerasWizardPanel
          description="Recorded state and whether this installation can apply changes."
          fit="fill"
          kicker="Lifecycle State"
          title="Repository state"
        >
          <TerasTrayStack spacing="loose">
            <TerasMetadataList items={repositoryLifecycleStateFacts(state, snapshot?.status === "current" && snapshot.mode === "live" && !error)} />
            <TerasContentTray
              description={
                error?.message ??
                (snapshot?.mode === "live"
                  ? liveActionAvailable
                    ? "Current state will be checked again before applying your change."
                    : "Inspection is available. Applying changes is not enabled or current source state could not be verified."
                  : "Inspection is available. Repository lifecycle changes are not enabled on this installation.")
              }
              kicker={error ? "Runtime Error" : "Authority"}
            />
          </TerasTrayStack>
        </TerasWizardPanel>
      }
      surfaceId="repository-lifecycle"
      title="Repository Lifecycle"
    >
      {activeStep === "action" ? (
        <TerasWizardPanel
          description="Choose what to change. Archiving on GitHub and retiring a workspace record are separate actions."
          kicker="Lifecycle Action"
          title="Select action"
        >
          <TerasTrayStack spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Repository lifecycle action"
              disabled={pending}
              frame="tray"
              label="Available actions"
              onSelect={(action) => updateDraft({ action })}
              options={actionOptions}
              selectedId={draft.action}
            />
            <TerasContentTray kicker="What changes" description={repositoryLifecycleActionDescriptions[draft.action]} />
            {draft.action === "transfer-workspace-custody" ? (
              <TerasFieldStack spacing="loose">
                <TerasTextField
                  label="New workspace repository"
                  disabled={pending}
                  onValueChange={(value) =>
                    updateDraft({ targetWorkspaceOwnerRef: value })
                  }
                  placeholder="workspace-owner:product"
                  value={draft.targetWorkspaceOwnerRef}
                />
                <TerasNoteField
                  density="compact"
                  label="Approval to release responsibility"
                  disabled={pending}
                  placeholder="Record who approved releasing responsibility and why (at least 12 characters)."
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDraft({ sourceOwnerAcceptanceNote: value })
                  }
                  value={draft.sourceOwnerAcceptanceNote}
                />
                <TerasNoteField
                  density="compact"
                  label="Approval to accept responsibility"
                  disabled={pending}
                  placeholder="Record who accepted responsibility and why (at least 12 characters)."
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDraft({ targetOwnerAcceptanceNote: value })
                  }
                  value={draft.targetOwnerAcceptanceNote}
                />
              </TerasFieldStack>
            ) : null}
          </TerasTrayStack>
        </TerasWizardPanel>
      ) : activeStep === "review" ? (
        <TerasWizardPanel
          description={repositoryLifecycleActionDescriptions[draft.action]}
          kicker="Review"
          title={repositoryLifecycleActionLabels[draft.action]}
        >
          <TerasTrayStack spacing="loose">
            <TerasTechnicalDetails
              summary="Workspace association and execution details"
              items={repositoryLifecycleReviewFacts(
                draft.action,
                state,
                draft.targetWorkspaceOwnerRef,
              )}
            />
            <TerasFieldStack spacing="loose">
              {blockingFindings > 0 ? <TerasChoiceGroup
                ariaLabel="Impact disposition"
                disabled={pending}
                frame="tray"
                label="How are blocking findings handled?"
                onSelect={(blockerDecision) => updateDraft({ blockerDecision })}
                options={[
                  { id: "none", label: "Choose a response", tone: "muted" },
                  { id: "remove", label: "Remove blocker", tone: "warn" },
                  { id: "workaround", label: "Use workaround", tone: "warn" },
                  { id: "accept-risk", label: "Accept risk", tone: "danger" },
                  { id: "defer", label: "Defer action", tone: "muted" },
                ]}
                selectedId={draft.blockerDecision}
              /> : <TerasContentTray kicker="Impact check" description={snapshot?.status === "current"
                ? "No blocking findings in the recorded assessment. Current impact will be checked again before applying."
                : "Current impact will be checked before applying. A blocking finding requires a reviewed response before the change can proceed."} />}
              {blockingFindings > 0 && draft.blockerDecision !== "none" ? (
                <TerasNoteField
                  density="compact"
                  label="Impact justification"
                  disabled={pending}
                  placeholder="Explain the finding and your selected response (at least 12 characters)."
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDraft({ impactJustification: value })
                  }
                  value={draft.impactJustification}
                />
              ) : null}
              <TerasNoteField
                density="compact"
                label="Approval note"
                disabled={pending}
                placeholder="Explain why this repository change is appropriate (at least 12 characters)."
                minimumHeight="short"
                onValueChange={(value) => updateDraft({ approvalNote: value })}
                value={draft.approvalNote}
              />
              <TerasSelectableRow
                ariaLabel="Confirm repository lifecycle action"
                disabled={pending || !actionComplete}
                detail="Changing the draft or its recorded state requires confirmation again."
                label={`I confirm: ${repositoryLifecycleActionLabels[draft.action]}`}
                onSelect={() => {
                  setConfirmedState(reviewState);
                  setEdited(true);
                  setDraft((current) => ({
                    ...current,
                    confirmed: !confirmationCurrent,
                  }));
                }}
                selected={confirmationCurrent}
                status={confirmationCurrent ? "confirmed" : "required"}
                tone={confirmationCurrent ? "ok" : "warn"}
              />
            </TerasFieldStack>
          </TerasTrayStack>
        </TerasWizardPanel>
      ) : (
        <TerasWizardPanel
          description="OOS decision, execution, and durable receipt for this lifecycle request."
          kicker="Result"
          title={result ? repositoryLifecycleActionLabels[result.request.action] : "Lifecycle result"}
          tone={result ? repositoryLifecycleResultTone(result) : "danger"}
          treatment="state"
        >
          {result ? (
            <TerasTrayStack spacing="loose">
              <TerasMetadataList items={repositoryLifecycleResultFacts(result)} />
              <TerasList>
                <TerasStatusItem
                  detail={
                    result.failure?.message ??
                    result.receipt?.findings.join("; ") ??
                    "Lifecycle action completed with an authoritative receipt."
                  }
                  label="Execution"
                  status={result.status}
                  tone={repositoryLifecycleResultTone(result)}
                />
              </TerasList>
            </TerasTrayStack>
          ) : (
            <TerasContentTray
              description={error?.message ?? "No lifecycle result is available."}
              kicker="Execution Error"
            />
          )}
        </TerasWizardPanel>
      )}
    </TerasWizardModal>
    <TerasDraftCloseGuardDialog
      open={leaveTarget !== null}
      title="Discard lifecycle draft?"
      kicker="Unsent changes"
      description="This draft has not been acknowledged. Keep editing, or discard the local draft. Any request already received by the workflow service remains in its history."
      leaveLabel="Discard Draft"
      onKeepEditing={() => setLeaveTarget(null)}
      onLeave={() => { if (leaveTarget) leave(leaveTarget); }}
    /></>
  );
}

function createLifecycleRequestId() {
  return `repository-lifecycle-request:console-${crypto.randomUUID()}`;
}
