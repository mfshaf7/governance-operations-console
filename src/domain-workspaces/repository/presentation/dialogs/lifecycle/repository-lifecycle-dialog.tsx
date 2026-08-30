"use client";

import { useMemo, useState } from "react";

import {
  TerasChoiceGroup,
  TerasContentTray,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
  TerasSelectableRow,
  TerasStatusItem,
  TerasTextField,
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
  const impactComplete =
    draft.blockerDecision === "none" ||
    draft.impactJustification.trim().length >= 12;
  const reviewComplete =
    draft.confirmed &&
    draft.approvalNote.trim().length >= 12 &&
    impactComplete;

  if (!repository || !repository.providerIdentity || !state) return null;

  const repositoryIdentity = repository.providerIdentity;
  const repositoryRecordId = repository.id;
  const liveActionAvailable = snapshot?.mode === "live";
  const steps = repositoryLifecycleSteps(activeStep, actionComplete, result);
  const statusTone = result
    ? repositoryLifecycleResultTone(result)
    : snapshot?.mode === "live"
      ? "info"
      : "muted";
  const statusLabel = result
    ? result.status
    : snapshot?.mode === "live"
      ? snapshot.status
      : "preview only";

  function updateDraft(patch: Partial<LifecycleDraft>) {
    if (result) {
      setRequestId(createLifecycleRequestId());
      setRequestedAt(new Date().toISOString());
    }
    setDraft((current) => ({ ...current, ...patch, confirmed: false }));
  }

  async function applyLifecycleAction() {
    if (!reviewComplete || !liveActionAvailable || pending) return;
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
      repositoryId: repositoryRecordId,
      requestedAt,
      requestId,
      sourceCustodyRequestId: custodyResult?.request.request_id ?? null,
      sourceOwnerAcceptanceNote: draft.sourceOwnerAcceptanceNote,
      targetOwnerAcceptanceNote: draft.targetOwnerAcceptanceNote,
      targetWorkspaceOwnerRef: draft.targetWorkspaceOwnerRef,
    }).catch(() => undefined);
    setActiveStep("result");
  }

  return (
    <TerasWizardModal
      activeStepId={activeStep}
      description="Review impact and apply one governed Repository lifecycle action through OOS."
      footer={
        <TerasWizardFooter
          apply={
            activeStep === "review"
              ? {
                  disabled: !reviewComplete || !liveActionAvailable || pending,
                  label: pending ? "Applying..." : "Apply Lifecycle Action",
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
                  label: "Back",
                  onClick: () => setActiveStep("action"),
                }
              : {
                  emphasis: "secondary",
                  label: "Back to Register",
                  onClick: onClose,
                }
          }
          finish={
            activeStep === "result"
              ? {
                  label: "View History",
                  onClick: () => onOpenHistory(repository),
                }
              : undefined
          }
          next={
            activeStep === "action"
              ? {
                  disabled: !actionComplete,
                  label: "Review Action",
                  onClick: () => setActiveStep("review"),
                }
              : undefined
          }
        />
      }
      kicker="Repository Lifecycle"
      onClose={onClose}
      onStepSelect={(stepId) => {
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
          description="Current lifecycle truth and execution availability."
          fit="fill"
          kicker="Lifecycle State"
          title="Authoritative projection"
        >
          <TerasTrayStack spacing="loose">
            <TerasMetadataList items={repositoryLifecycleStateFacts(state)} />
            <TerasContentTray
              description={
                error?.message ??
                (snapshot?.mode === "live"
                  ? "OOS will re-read current state before applying the selected action."
                  : "Configure the approved OOS lifecycle boundary to enable actions.")
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
          description="Choose one lifecycle boundary. Unavailable actions remain visible with their reason."
          kicker="Lifecycle Action"
          title="Select action"
        >
          <TerasTrayStack spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Repository lifecycle action"
              frame="tray"
              label="Available actions"
              onSelect={(action) => updateDraft({ action })}
              options={actionOptions}
              selectedId={draft.action}
            />
            {draft.action === "transfer-workspace-custody" ? (
              <TerasFieldStack spacing="loose">
                <TerasTextField
                  label="Target workspace owner"
                  onValueChange={(value) =>
                    updateDraft({ targetWorkspaceOwnerRef: value })
                  }
                  placeholder="workspace-owner:product"
                  value={draft.targetWorkspaceOwnerRef}
                />
                <TerasNoteField
                  density="compact"
                  label="Source owner acceptance"
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDraft({ sourceOwnerAcceptanceNote: value })
                  }
                  value={draft.sourceOwnerAcceptanceNote}
                />
                <TerasNoteField
                  density="compact"
                  label="Target owner acceptance"
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
          description="Confirm the target, record impact disposition when needed, and authorize this exact action."
          kicker="Review"
          title={repositoryLifecycleActionLabels[draft.action]}
        >
          <TerasTrayStack spacing="loose">
            <TerasMetadataList
              items={repositoryLifecycleReviewFacts(
                draft.action,
                state,
                draft.targetWorkspaceOwnerRef,
              )}
            />
            <TerasFieldStack spacing="loose">
              <TerasChoiceGroup
                ariaLabel="Impact disposition"
                frame="tray"
                label="Blocking impact"
                onSelect={(blockerDecision) => updateDraft({ blockerDecision })}
                options={[
                  { id: "none", label: "No blocking finding", tone: "ok" },
                  { id: "remove", label: "Remove blocker", tone: "warn" },
                  { id: "workaround", label: "Use workaround", tone: "warn" },
                  { id: "accept-risk", label: "Accept risk", tone: "danger" },
                  { id: "defer", label: "Defer action", tone: "muted" },
                ]}
                selectedId={draft.blockerDecision}
              />
              {draft.blockerDecision !== "none" ? (
                <TerasNoteField
                  density="compact"
                  label="Impact justification"
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
                minimumHeight="short"
                onValueChange={(value) => updateDraft({ approvalNote: value })}
                value={draft.approvalNote}
              />
              <TerasSelectableRow
                ariaLabel="Confirm repository lifecycle action"
                detail="OOS will re-read authority and current state before mutation."
                label="I confirm this exact lifecycle action"
                onSelect={() =>
                  setDraft((current) => ({
                    ...current,
                    confirmed: !current.confirmed,
                  }))
                }
                selected={draft.confirmed}
                status={draft.confirmed ? "confirmed" : "required"}
                tone={draft.confirmed ? "ok" : "warn"}
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
  );
}

function createLifecycleRequestId() {
  return `repository-lifecycle-request:console-${crypto.randomUUID()}`;
}
