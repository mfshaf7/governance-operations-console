"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasChoiceGroup,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
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
  executionCloseoutImpactComplete,
  executionCloseoutOperation,
  executionCloseoutReadinessRows,
  executionCloseoutReadyToApply,
  initialExecutionCloseoutDraft,
  type ExecutionCloseoutDraft,
  type ExecutionCloseoutImpactKind,
} from "./execution-closeout-model.ts";

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
  const projection = runtime.projection;
  const result = runtime.lastResult;
  const evidenceComplete = executionCloseoutEvidenceComplete(draft);
  const impactComplete = executionCloseoutImpactComplete(draft);
  const readyToApply = executionCloseoutReadyToApply({ draft, projection });
  const existingHistory = projection?.outcome_history ?? [];

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
        stateLabel: result?.status ?? projection?.projection_state ?? "Pending",
        tone: closeoutResultTone(result?.status, projection?.projection_state),
      },
    ],
    [evidenceComplete, existingHistory.length, projection?.projection_state, readyToApply, result],
  );

  function requestClose() {
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
        throw new Error("Canonical Delivery closeout authority is unavailable.");
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

  return (
    <>
      <TerasWizardModal
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
        steps={steps}
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
            onOpenImpact={() => setImpactDialogOpen(true)}
            projection={projection}
            result={result}
            runtime={runtime}
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
              <TerasNoteField
                label="Test result evidence"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    testResultEvidence: value,
                  }))
                }
                placeholder="Record the passing test evidence."
                value={draft.testResultEvidence}
              />
              <TerasNoteField
                label="Validation evidence"
                minimumHeight="short"
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    validationEvidence: value,
                  }))
                }
                placeholder="Record the passing validation evidence."
                value={draft.validationEvidence}
              />
            </TerasFieldGrid>
          </TerasWizardPanel>
        ) : null}
        {activeStep === "review" ? (
          <TerasWizardPanel
            description="Confirm canonical readiness, evidence completeness, impact, and accountable acceptance before mutation."
            kicker="Apply Review"
            title="Closeout Decision"
          >
            <TerasMetadataList
              items={[
                { label: "Delivery", value: projection?.delivery_id ?? "Unavailable" },
                { label: "Source Revision", value: projection?.source_revision ?? "Unavailable" },
                { label: "Readiness", value: projection?.projection_state.replaceAll("_", " ") ?? "Unavailable" },
                { label: "Impact", value: draft.impactKind.replaceAll("-", " ") },
                { label: "Evidence Refs", value: String(projection?.readiness.evidence_refs.length ?? 0) },
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
                  projection?.readiness.ready_for_closeout ? "Ready" : "Blocked"
                }
                title="Canonical readiness"
                tone={projection?.readiness.ready_for_closeout ? "ok" : "warn"}
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
  projection: DeliveryCloseoutRuntime["projection"];
  result: DeliveryCloseoutRuntime["lastResult"];
  runtime: DeliveryCloseoutRuntime;
}) {
  if (runtime.loading) {
    return (
      <TerasPanel
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
        <TerasEmptyState fill>Waiting for the closeout projection.</TerasEmptyState>
      </TerasPanel>
    );
  }

  if (!projection) {
    return (
      <TerasPanel
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
          description="Classify the closeout outcome without claiming downstream acceptance."
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
              { id: "none", label: "No downstream impact", tone: "muted" },
              { id: "workspace-entrant", label: "Workspace entrant", tone: "warn" },
              { id: "existing-product-change", label: "Existing product change", tone: "info" },
            ]}
            selectedId={draft.impactKind}
          />
        </TerasWizardPanel>
      ) : null}
      {activeStep === "result" ? (
        <TerasWizardPanel
          description="Use the exact authority and action returned with the durable outcome."
          fit="content"
          kicker="Next Action"
          title={result?.next_action.label ?? projection.next_action.label}
          tone={closeoutResultTone(result?.status, projection.projection_state)}
          treatment="rail"
        >
          <TerasMetadataList
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
          description="The reviewed draft is preserved for correction or retry."
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
      <TerasEmptyState>No durable closeout outcome has been recorded yet.</TerasEmptyState>
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
