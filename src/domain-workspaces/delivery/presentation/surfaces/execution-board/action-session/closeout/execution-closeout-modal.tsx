"use client";

import { useEffect, useMemo, useState } from "react";

import { WorkspaceIntakeDialog } from "@/console-integration/workspace-intake/presentation/workspace-intake-dialog.tsx";
import { TerasLoadingState,
  TerasActionButton,
  TerasChoiceGroup,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasFieldStack,
  TerasTechnicalDetails,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
  TerasSelectField,
  TerasPanel,
  TerasPanelHeader,
  TerasSignalItem,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
} from "@/teras";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import type { useDeliveryCloseoutLiveRuntime } from "../../../../../live-runtime/use-delivery-closeout-live-runtime.ts";
import {
  ExecutionCloseoutEvidenceDialog,
  ExecutionCloseoutImpactDialog,
} from "./execution-closeout-dialogs.tsx";
import {
  executionCloseoutDraftDirty,
  executionCloseoutEvidenceComplete,
  executionCloseoutEvidenceIssue,
  executionCloseoutImpactComplete,
  executionCloseoutOperation,
  executionCloseoutReadinessRows,
  executionCloseoutReadyToApply,
  initialExecutionCloseoutDraft,
  type ExecutionCloseoutDraft,
  type ExecutionCloseoutImpactKind,
} from "./execution-closeout-model.ts";
import { deliveryWorkspaceIntakeCandidate } from "./delivery-workspace-intake-candidate.ts";

type ExecutionCloseoutStep = "evidence" | "result" | "review";
type DeliveryCloseoutRuntime = ReturnType<
  typeof useDeliveryCloseoutLiveRuntime
>;

export function ExecutionCloseoutModal({
  onClose,
  packageSummary,
  runtime,
}: {
  onClose: () => void;
  packageSummary: DeliveryPackageSummary;
  runtime: DeliveryCloseoutRuntime;
}) {
  const [activeStep, setActiveStep] =
    useState<ExecutionCloseoutStep>("evidence");
  const [draft, setDraft] = useState<ExecutionCloseoutDraft>(
    initialExecutionCloseoutDraft,
  );
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [impactDialogOpen, setImpactDialogOpen] = useState(false);
  const [intakeDialogOpen, setIntakeDialogOpen] = useState(false);
  const projection = runtime.projection;
  const result = runtime.lastResult;
  const evidenceComplete = executionCloseoutEvidenceComplete(draft);
  const impactComplete = executionCloseoutImpactComplete(draft);
  const readyToApply = executionCloseoutReadyToApply({ draft, projection });
  const existingHistory = projection?.outcome_history ?? [];
  const intakeCandidate = deliveryWorkspaceIntakeCandidate(
    result?.event ?? existingHistory.at(-1) ?? null,
  );

  useEffect(() => {
    if (
      projection?.projection_state === "closed" &&
      projection.outcome_history.length > 0
    ) {
      setActiveStep("result");
    }
  }, [projection?.projection_state, projection?.outcome_history.length]);

  const steps = useMemo(
    () => [
      {
        connectsToNext: true,
        id: "evidence",
        label: "Evidence",
        stateLabel: evidenceComplete ? "Ready" : "Draft",
        tone: evidenceComplete ? ("ok" as const) : ("warn" as const),
      },
      {
        connectsToNext: true,
        id: "review",
        label: "Review",
        stateLabel: readyToApply ? "Ready" : "Pending",
        tone: readyToApply ? ("ok" as const) : ("warn" as const),
      },
      {
        available: Boolean(result || existingHistory.length > 0),
        connectsToNext: false,
        id: "result",
        label: "Result",
        stateLabel: result?.status ?? (existingHistory.length ? "Recorded" : "Pending"),
        tone: result || existingHistory.length ? closeoutResultTone(result?.status ?? existingHistory.at(-1)?.status) : ("muted" as const),
      },
    ],
    [evidenceComplete, existingHistory.length, projection?.projection_state, readyToApply, result],
  );

  function requestClose() {
    if (applying) return;
    if (!result && executionCloseoutDraftDirty(draft)) {
      setCloseGuardOpen(true);
      return;
    }
    onClose();
  }

  async function applyCloseout() {
    if (!projection || !readyToApply || applying) return;
    setApplying(true);
    setError(null);
    try {
      const nextResult = await runtime.apply(
        executionCloseoutOperation({ draft, projection }),
        draft.acceptanceNote.trim(),
      );
      if (!nextResult) {
        throw new Error("Delivery could not confirm the package closure.");
      }
      setActiveStep("result");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Delivery closeout could not be applied.",
      );
    } finally {
      setApplying(false);
    }
  }

  if (intakeDialogOpen && intakeCandidate) {
    return (
      <WorkspaceIntakeDialog
        candidate={intakeCandidate}
        onClose={() => setIntakeDialogOpen(false)}
      />
    );
  }

  return (
    <>
      <TerasWizardModal
        busy={applying}
        busyLabel="Applying the reviewed closeout and checking its result…"
        activeStepId={activeStep}
        description="Prepare bounded completion evidence, review downstream impact, and apply closeout through OOS."
        footer={
          <TerasWizardFooter
            apply={
              activeStep === "review"
                ? {
                    disabled: !readyToApply || applying,
                    label: applying ? "Applying..." : "Apply Closeout",
                    onClick: () => void applyCloseout(),
                  }
                : undefined
            }
            back={
              activeStep === "review"
                ? {
                    emphasis: "secondary",
                    disabled: applying,
                    label: "Back",
                    onClick: () => setActiveStep("evidence"),
                  }
                : {
                    emphasis: "secondary",
                    label: "Back to Board",
                    onClick: requestClose,
                  }
            }
            finish={
              activeStep === "result"
                ? {
                    emphasis: "primary",
                    label: "Back to Board",
                    onClick: onClose,
                  }
                : undefined
            }
            next={
              activeStep === "evidence"
                ? {
                    disabled: !evidenceComplete,
                    label: "Review Closeout",
                    onClick: () => setActiveStep("review"),
                  }
                : undefined
            }
          />
        }
        kicker="Execution Action"
        onClose={requestClose}
        onStepSelect={(stepId) => {
          if (applying) return;
          if (
            stepId === "evidence" ||
            (stepId === "review" && evidenceComplete) ||
            (stepId === "result" && (result || existingHistory.length > 0))
          ) {
            setActiveStep(stepId as ExecutionCloseoutStep);
          }
        }}
        statusLabel={closeoutStatusLabel(runtime)}
        statusTone={closeoutStatusTone(runtime)}
        steps={applying ? steps.map(step => ({ ...step, available: false })) : steps}
        subject={{
          detail: packageSummary.source_ref,
          eyebrow: "Selected Package",
          title: packageSummary.display_name,
        }}
        support={
          <ExecutionCloseoutSupport
            activeStep={activeStep}
            draft={draft}
            error={error}
            evidenceComplete={evidenceComplete}
            impactComplete={impactComplete}
            onDraftChange={setDraft}
            onOpenImpact={() => {
              setDraft(current => ({ ...current, workspaceEntrant: { ...current.workspaceEntrant,
                validationNotes: current.workspaceEntrant.validationNotes || current.validationEvidence } }));
              setImpactDialogOpen(true);
            }}
            projection={projection}
            result={result}
            runtime={runtime}
            onOpenIntake={() => setIntakeDialogOpen(true)}
          />
        }
        surfaceId="delivery-execution-closeout"
        title="Delivery Closeout"
      >
        {activeStep === "evidence" ? (
          <TerasWizardPanel
            actions={
              <TerasActionButton
                emphasis="secondary"
                onClick={() => setEvidenceDialogOpen(true)}
              >
                Supporting Evidence
              </TerasActionButton>
            }
            description="Record the completion, test, and validation evidence required for the terminal decision."
            kicker="Closeout Evidence"
            title="Completion Record"
          >
            <TerasFieldGrid columns={2} align="stretch">
              <TerasNoteField
                label="Completion summary"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    completionSummary: value,
                  }))
                }
                placeholder="Summarize the completed Delivery outcome."
                value={draft.completionSummary}
              />
              <TerasNoteField
                label="Changed surfaces"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, changedSurfaces: value }))
                }
                placeholder="List the source surfaces covered by this closeout."
                value={draft.changedSurfaces}
              />
              <TerasFieldStack spacing="compact">
              <TerasSelectField label="Test result" value={draft.testResult}
                options={[{ value: "", label: "Choose the observed result" }, { value: "PASS", label: "Passed" }, { value: "FAIL", label: "Failed" },
                  { value: "NOT APPLICABLE", label: "Not applicable — explain below" }, { value: "Attached artifact", label: "Result recorded in the linked artifact" }]}
                onValueChange={value => setDraft(current => ({ ...current, testResult: value as ExecutionCloseoutDraft["testResult"] }))} />
              <TerasNoteField
                label="Test result evidence"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    testResultEvidence: value,
                  }))
                }
                placeholder="Describe the observed test evidence or explain why tests do not apply."
                value={draft.testResultEvidence}
              />
              </TerasFieldStack>
              <TerasFieldStack spacing="compact">
              <TerasSelectField label="Validation result" value={draft.validationResult}
                options={[{ value: "", label: "Choose the observed result" }, { value: "PASS", label: "Passed" }, { value: "FAIL", label: "Failed" },
                  { value: "CHECK", label: "Needs checking" }, { value: "NOT APPLICABLE", label: "Not applicable — explain below" },
                  { value: "Attached artifact", label: "Result recorded in the linked artifact" }]}
                onValueChange={value => setDraft(current => ({ ...current, validationResult: value as ExecutionCloseoutDraft["validationResult"] }))} />
              <TerasNoteField
                label="Validation evidence"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    validationEvidence: value,
                  }))
                }
                placeholder="Describe the validation result and link its evidence."
                value={draft.validationEvidence}
              />
              </TerasFieldStack>
            </TerasFieldGrid>
            {executionCloseoutEvidenceIssue(draft) ? <TerasEmptyState>{executionCloseoutEvidenceIssue(draft)}</TerasEmptyState> : null}
          </TerasWizardPanel>
        ) : null}
        {activeStep === "review" ? (
          <TerasWizardPanel
            description="Check the results, review what the work changes, then confirm package closure."
            kicker="Apply Review"
            title="Closeout Decision"
          >
            <TerasFieldStack spacing="normal">
            <TerasMetadataList
              items={[
                { label: "Delivery", value: `Epic ${packageSummary.legacy_epic_id}` },
                { label: "Readiness", value: projection?.projection_state.replaceAll("_", " ") ?? "Unavailable" },
                { label: "Impact", value: draft.impactKind === "workspace-entrant" ? "New workspace registration" :
                  draft.impactKind === "existing-product-change" ? "Existing product change" : "No registry change" },
                { label: "Evidence records", value: projection ? String(projection.readiness.evidence_refs.length) : "Not loaded" },
                { label: "Next Action", value: projection?.next_action.label ?? "Unavailable" },
              ]}
            />
            <TerasList frame="contained">
              <TerasSignalItem
                label="Review Check"
                statusLabel={evidenceComplete ? "Ready" : "Incomplete"}
                title="Closeout evidence"
                tone={evidenceComplete ? "ok" : "warn"}
              />
              <TerasSignalItem
                label="Review Check"
                statusLabel={impactComplete ? "Ready" : "Incomplete"}
                title="Outcome impact"
                tone={impactComplete ? "ok" : "warn"}
              />
              <TerasSignalItem
                label="Review Check"
                statusLabel={
                  projection?.readiness.ready_for_closeout ? "Ready" : projection?.next_action.code === "prepare_delivery_closeout" ? "Ready with reviewed evidence" : "Blocked"
                }
                title="Canonical readiness"
                tone={projection?.next_action.code === "prepare_delivery_closeout" ? "ok" : "warn"}
              />
            </TerasList>
            <TerasNoteField
              label="Acceptance note"
              minimumHeight="short"
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, acceptanceNote: value }))
              }
              placeholder="Record why this exact closeout should be applied."
              value={draft.acceptanceNote}
            />
            <TerasTechnicalDetails items={[{ label: "Reviewed source revision", value: projection?.source_revision ?? "Not loaded" }]} />
            </TerasFieldStack>
          </TerasWizardPanel>
        ) : null}
        {activeStep === "result" ? (
          <TerasWizardPanel
            description="Inspect the durable closeout receipt and package-scoped outcome history returned by OOS."
            kicker="Closeout Result"
            title={result ? "Recorded Outcome" : "Outcome History"}
          >
            {result ? (
              <TerasMetadataList
                items={[
                  { label: "Status", value: result.status.replaceAll("_", " ") },
                  { label: "Receipt", value: result.receipt.ref },
                  { label: "Receipt Digest", value: result.receipt.digest },
                  { label: "Outcome", value: result.event.outcome_ref },
                  { label: "Impact", value: result.event.impact.kind.replaceAll("_", " ") },
                  { label: "Replay", value: result.replayed ? "Replayed" : "Applied once" },
                ]}
              />
            ) : null}
            <CloseoutHistory events={existingHistory} />
          </TerasWizardPanel>
        ) : null}
      </TerasWizardModal>
      <ExecutionCloseoutEvidenceDialog
        draft={draft}
        onClose={() => setEvidenceDialogOpen(false)}
        onDraftChange={setDraft}
        open={evidenceDialogOpen}
      />
      <ExecutionCloseoutImpactDialog
        live={runtime.mode === "live"}
        draft={draft}
        onClose={() => setImpactDialogOpen(false)}
        onDraftChange={setDraft}
        open={impactDialogOpen}
      />
      <TerasDraftCloseGuardDialog
        description="This closeout draft contains evidence or impact changes that have not been applied."
        kicker="Delivery Closeout"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={onClose}
        open={closeGuardOpen}
        title="Discard Closeout Draft?"
      />
    </>
  );
}

function ExecutionCloseoutSupport({
  activeStep,
  draft,
  error,
  evidenceComplete,
  impactComplete,
  onDraftChange,
  onOpenImpact,
  onOpenIntake,
  projection,
  result,
  runtime,
}: {
  activeStep: ExecutionCloseoutStep;
  draft: ExecutionCloseoutDraft;
  error: string | null;
  evidenceComplete: boolean;
  impactComplete: boolean;
  onDraftChange: (draft: ExecutionCloseoutDraft) => void;
  onOpenImpact: () => void;
  onOpenIntake: () => void;
  projection: DeliveryCloseoutRuntime["projection"];
  result: DeliveryCloseoutRuntime["lastResult"];
  runtime: DeliveryCloseoutRuntime;
}) {
  if (runtime.loading) {
    return (
      <TerasPanel spacing="normal"
        fit="fill"
        frame="padded"
        layout="header-body"
        overflow="hidden"
        treatment="neutral"
      >
        <TerasPanelHeader
          description="Reading canonical closeout readiness and history from OOS."
          kicker="Closeout Readiness"
          title="Loading Delivery Truth"
        />
        <TerasLoadingState fill label="Loading closeout readiness…" skeleton="details" />
      </TerasPanel>
    );
  }

  if (!projection) {
    return (
      <TerasPanel spacing="normal"
        fit="fill"
        frame="padded"
        layout="header-body"
        overflow="hidden"
        treatment="state"
        tone="danger"
      >
        <TerasPanelHeader
          description="Closeout cannot continue without current OOS truth."
          kicker="Closeout Readiness"
          title="Delivery Truth Unavailable"
        />
        <TerasEmptyState fill>
          {runtime.projectionError ?? "No closeout projection is available."}
        </TerasEmptyState>
      </TerasPanel>
    );
  }

  return (
    <>
      <TerasWizardPanel
        description="Canonical readiness and unresolved evidence counts from OOS."
        fit="content"
        kicker="Closeout Readiness"
        title={projection.next_action.label}
        tone={projection.readiness.ready_for_closeout ? "ok" : "warn"}
        treatment="rail"
      >
        <TerasList columns={2} fit="content" frame="contained">
          {executionCloseoutReadinessRows(projection).map(([label, value]) => (
            <TerasSignalItem
              textOverflow="wrap"
              key={label}
              label="Gate"
              statusLabel={String(value)}
              title={label}
              tone={value === 0 ? "ok" : "warn"}
            />
          ))}
        </TerasList>
        {projection.readiness.reasons.length > 0 ? (
          <TerasList frame="contained" scrollHeight="short">
            {projection.readiness.reasons.map((reason) => (
              <TerasSignalItem
                key={reason}
                label="Blocking Reason"
                title={reason.replaceAll("_", " ")}
                tone="warn"
              />
            ))}
          </TerasList>
        ) : null}
      </TerasWizardPanel>
      {activeStep === "evidence" ? (
        <TerasWizardPanel
          description="Required evidence stays incomplete until both primary and supporting sections are present."
          fit="content"
          kicker="Evidence Check"
          title={evidenceComplete ? "Evidence Ready" : "Evidence Incomplete"}
          tone={evidenceComplete ? "ok" : "warn"}
          treatment="rail"
        >
          <TerasList frame="contained">
            <TerasSignalItem
              label="Primary"
              statusLabel={
                [
                  draft.changedSurfaces,
                  draft.completionSummary,
                  draft.testResultEvidence,
                  draft.validationEvidence,
                ].every((value) => value.trim())
                  ? "Ready"
                  : "Incomplete"
              }
              title="Completion evidence"
              tone={
                [
                  draft.changedSurfaces,
                  draft.completionSummary,
                  draft.testResultEvidence,
                  draft.validationEvidence,
                ].every((value) => value.trim())
                  ? "ok"
                  : "warn"
              }
            />
            <TerasSignalItem
              label="Supporting"
              statusLabel={evidenceComplete ? "Ready" : "Incomplete"}
              title="Demo and inspection evidence"
              tone={evidenceComplete ? "ok" : "warn"}
            />
          </TerasList>
        </TerasWizardPanel>
      ) : null}
      {activeStep === "review" ? (
        <TerasWizardPanel
          actions={
            draft.impactKind === "none" ? undefined : (
              <TerasActionButton emphasis="secondary" onClick={onOpenImpact}>
                Configure
              </TerasActionButton>
            )
          }
          description="Choose what the completed work adds or changes in the workspace."
          fit="content"
          kicker="Outcome Impact"
          title={impactComplete ? "Impact Ready" : "Impact Incomplete"}
          tone={impactComplete ? "ok" : "warn"}
          treatment="rail"
        >
          <TerasChoiceGroup<ExecutionCloseoutImpactKind>
            ariaLabel="Delivery closeout impact"
            frame="none"
            onSelect={(impactKind) =>
              onDraftChange({ ...draft, impactKind })
            }
            options={[
              { id: "none", label: "No registry change", tone: "muted" },
              { id: "workspace-entrant", label: "New workspace registration", tone: "warn" },
              { id: "existing-product-change", label: "Existing product change", tone: "info" },
            ]}
            selectedId={draft.impactKind}
          />
        </TerasWizardPanel>
      ) : null}
      {activeStep === "result" ? (
        <TerasWizardPanel
          actions={
            deliveryWorkspaceIntakeCandidate(
              result?.event ?? projection.outcome_history.at(-1) ?? null,
            ) ? (
              <TerasActionButton onClick={onOpenIntake}>
                Review workspace registration
              </TerasActionButton>
            ) : undefined
          }
          description={deliveryWorkspaceIntakeCandidate(result?.event ?? projection.outcome_history.at(-1) ?? null)
            ? "Review the registration details and submit them through Workspace Registry."
            : undefined}
          fit="content"
          kicker="Next Action"
          title={result?.next_action.label ?? projection.next_action.label}
          tone={closeoutResultTone(result?.status, projection.projection_state)}
          treatment="rail"
        >
          <TerasTechnicalDetails
            items={[
              {
                label: "Authority",
                value: result?.next_action.authority ?? projection.next_action.authority,
              },
              {
                label: "Action Code",
                value: result?.next_action.code ?? projection.next_action.code,
              },
            ]}
          />
        </TerasWizardPanel>
      ) : null}
      {error ? (
        <TerasWizardPanel
          description="Your draft is still available. Check the current result before trying again."
          fit="content"
          kicker="Apply Stopped"
          title="Closeout Not Applied"
          tone="danger"
          treatment="rail"
        >
          <TerasEmptyState>{error}</TerasEmptyState>
        </TerasWizardPanel>
      ) : null}
    </>
  );
}

function CloseoutHistory({
  events,
}: {
  events: NonNullable<DeliveryCloseoutRuntime["projection"]>["outcome_history"];
}) {
  if (events.length === 0) {
    return (
      <TerasEmptyState>No package closure has been recorded yet.</TerasEmptyState>
    );
  }
  return (
    <TerasList frame="contained" scrollHeight="medium">
      {events.map((event) => (
        <TerasSignalItem
          detail={event.next_action.label}
          key={event.event_id}
          label={event.status.replaceAll("_", " ")}
          meta={`${event.occurred_at} / ${event.operator_id}`}
          title={event.outcome_ref}
          tone={closeoutResultTone(event.status)}
        />
      ))}
    </TerasList>
  );
}

function closeoutStatusLabel(runtime: DeliveryCloseoutRuntime) {
  if (runtime.loading) return "Loading";
  if (!runtime.projection) return "Unavailable";
  return runtime.projection.projection_state.replaceAll("_", " ");
}

function closeoutStatusTone(runtime: DeliveryCloseoutRuntime) {
  if (!runtime.projection) return runtime.loading ? ("info" as const) : ("danger" as const);
  return closeoutResultTone(undefined, runtime.projection.projection_state);
}

function closeoutResultTone(
  status?: string,
  projectionState?: string,
) {
  if (status === "applied" || projectionState === "closed" || projectionState === "ready") {
    return "ok" as const;
  }
  if (status === "rejected") return "danger" as const;
  if (status === "partial_failure" || projectionState === "reconciliation_required") {
    return "warn" as const;
  }
  return "warn" as const;
}
