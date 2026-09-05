"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasChoiceGroup,
  TerasContentTray,
  TerasEmptyState,
  TerasList,
  TerasMetadataList,
  TerasSignalItem,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
} from "@/teras";

import { useWorkspaceIntakeLiveRuntime } from "../live-runtime/use-workspace-intake-live-runtime.ts";
import type {
  WorkspaceIntakeCandidate,
  WorkspaceIntakeDecision,
  WorkspaceIntakeResult,
} from "../workspace-intake-live-types.ts";

type IntakeStep = "decision" | "review" | "result";
type IntakeDecisionSelection = WorkspaceIntakeDecision | "unselected";

export function WorkspaceIntakeDialog({
  candidate,
  onClose,
}: {
  candidate: WorkspaceIntakeCandidate;
  onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [activeStep, setActiveStep] = useState<IntakeStep>("decision");
  const [decision, setDecision] =
    useState<IntakeDecisionSelection>("unselected");
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(createRequestId);

  useEffect(() => {
    void runtime.prepare(candidate).catch(() => undefined);
  }, [candidate.target.kind, candidate.target.name, runtime.prepare]);

  const decisionComplete = decision !== "unselected";
  const reviewComplete = decisionComplete && confirmed && Boolean(runtime.preparation);
  const result = runtime.result;
  const steps = useMemo(
    () => [
      {
        id: "decision",
        label: "Decision",
        stateLabel: decisionComplete ? "Ready" : "Current",
        tone: decisionComplete ? ("ok" as const) : ("warn" as const),
      },
      {
        available: decisionComplete,
        id: "review",
        label: "Review",
        stateLabel: reviewComplete ? "Ready" : "Pending",
        tone: reviewComplete ? ("ok" as const) : ("muted" as const),
      },
      {
        available: Boolean(result),
        connectsToNext: false,
        id: "result",
        label: "Result",
        stateLabel: result?.status ?? "Pending",
        tone: resultTone(result),
      },
    ],
    [decisionComplete, result, reviewComplete],
  );

  async function submit() {
    if (!reviewComplete || runtime.pending) return;
    await runtime
      .submit({ candidate, decision, requestId })
      .then(() => setActiveStep("result"))
      .catch(() => undefined);
  }

  function startCorrection() {
    runtime.reset();
    setRequestId(createRequestId());
    setConfirmed(false);
    setActiveStep("decision");
    void runtime.prepare(candidate).catch(() => undefined);
  }

  return (
    <TerasWizardModal
      activeStepId={activeStep}
      description="Classify the candidate against current Workspace Governance authority and follow the resulting review."
      footer={
        <TerasWizardFooter
          apply={
            activeStep === "review"
              ? {
                  disabled: !reviewComplete || runtime.pending,
                  label: runtime.pending ? "Submitting..." : "Submit Classification",
                  onClick: () => void submit(),
                }
              : undefined
          }
          back={
            activeStep === "review"
              ? { label: "Back", onClick: () => setActiveStep("decision") }
              : activeStep === "decision"
                ? { label: "Back to Delivery", onClick: onClose }
                : undefined
          }
          finish={
            activeStep === "result"
              ? { label: "Back to Delivery", onClick: onClose }
              : undefined
          }
          next={
            activeStep === "decision"
              ? {
                  disabled: !decisionComplete || !runtime.preparation,
                  label: "Review Classification",
                  onClick: () => setActiveStep("review"),
                }
              : undefined
          }
        />
      }
      kicker="Workspace Intake"
      onClose={onClose}
      onStepSelect={(stepId) => {
        if (
          stepId === "decision" ||
          (stepId === "review" && decisionComplete) ||
          (stepId === "result" && result)
        ) {
          setActiveStep(stepId as IntakeStep);
        }
      }}
      statusLabel={result?.status ?? (runtime.preparation ? "Prepared" : "Unavailable")}
      statusTone={result ? resultTone(result) : runtime.preparation ? "info" : "warn"}
      steps={steps}
      subject={{
        detail: `${candidate.target.kind} / ${candidate.target.name}`,
        eyebrow: "Workspace Candidate",
        title: candidate.label,
      }}
      support={
        <WorkspaceIntakeSupport
          candidate={candidate}
          error={runtime.error?.message}
          onCancel={() => void runtime.cancel(requestId).catch(() => undefined)}
          onContinue={() => void runtime.continueRequest(requestId).catch(() => undefined)}
          onStartCorrection={startCorrection}
          pending={runtime.pending}
          preparation={runtime.preparation}
          result={result}
        />
      }
      surfaceId="workspace-intake-classification"
      title="Workspace Intake Classification"
    >
      {activeStep === "decision" ? (
        <TerasWizardPanel
          description="Choose the workspace classification for this exact source candidate."
          kicker="Classification"
          title="Intake Decision"
        >
          <TerasChoiceGroup<IntakeDecisionSelection>
            ariaLabel="Workspace classification"
            frame="tray"
            label="Classification"
            onSelect={(value) => {
              setDecision(value);
              setConfirmed(false);
            }}
            options={[
              {
                disabled: true,
                id: "unselected",
                label: "Select classification",
                tone: "muted",
              },
              { id: "admitted", label: "Admitted", tone: "ok" },
              { id: "proposed", label: "Proposed", tone: "warn" },
              { id: "out-of-scope", label: "Out of scope", tone: "muted" },
            ]}
            selectedId={decision}
          />
          <TerasContentTray
            description={candidate.requested_record.notes}
            kicker="Source Context"
          />
        </TerasWizardPanel>
      ) : null}
      {activeStep === "review" ? (
        <TerasWizardPanel
          description="Confirm the reviewed candidate and exact canonical state before OOS accepts the command."
          kicker="Authority Review"
          title="Review Classification"
        >
          <TerasMetadataList
            items={[
              { label: "Decision", value: decision },
              { label: "Target", value: `${candidate.target.kind}:${candidate.target.name}` },
              { label: "Source", value: candidate.source.class },
              {
                label: "Current Record",
                value: runtime.preparation?.expected_state.record_version
                  ? `Version ${runtime.preparation.expected_state.record_version}`
                  : "New record",
              },
            ]}
          />
          <TerasList frame="contained">
            <TerasSignalItem
              label="Review Check"
              statusLabel={runtime.preparation ? "Current" : "Unavailable"}
              title="Canonical authority binding"
              tone={runtime.preparation ? "ok" : "warn"}
            />
            <TerasSignalItem
              actionLabel={confirmed ? "Confirmed" : "Confirm exact review"}
              ariaLabel="Confirm the Workspace Intake review"
              label="Operator Acceptance"
              onSelect={() => setConfirmed((current) => !current)}
              title={confirmed ? "Exact candidate confirmed" : "Confirmation required"}
              tone={confirmed ? "ok" : "warn"}
            />
          </TerasList>
        </TerasWizardPanel>
      ) : null}
      {activeStep === "result" ? (
        <WorkspaceIntakeResultPanel result={result} error={runtime.error?.message} />
      ) : null}
    </TerasWizardModal>
  );
}

function WorkspaceIntakeSupport({
  candidate,
  error,
  onCancel,
  onContinue,
  onStartCorrection,
  pending,
  preparation,
  result,
}: {
  candidate: WorkspaceIntakeCandidate;
  error?: string;
  onCancel: () => void;
  onContinue: () => void;
  onStartCorrection: () => void;
  pending: boolean;
  preparation: ReturnType<typeof useWorkspaceIntakeLiveRuntime>["preparation"];
  result: WorkspaceIntakeResult | null;
}) {
  return (
    <>
      <TerasWizardPanel
        description="Source evidence and current canonical binding used for this classification."
        fit="content"
        kicker="Candidate Evidence"
        title={preparation ? "Authority Current" : "Authority Unavailable"}
        tone={preparation ? "info" : "warn"}
        treatment="rail"
      >
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Source ref", value: candidate.source.ref },
            { label: "Evidence", value: String(candidate.evidence_refs.length) },
            { label: "Authority", value: preparation?.authority_revision.slice(0, 12) ?? "Unavailable" },
          ]}
        />
      </TerasWizardPanel>
      {result ? (
        <TerasWizardPanel
          actions={
            result.next_action === "continue" ||
            result.next_action === "restore-dependency-and-retry"
              ? (
                  <TerasActionButton disabled={pending} onClick={onContinue}>
                    Continue
                  </TerasActionButton>
                )
              : result.next_action === "review-and-merge" && result.review ? (
                  <TerasActionButton
                    onClick={() => window.open(result.review?.url, "_blank", "noopener,noreferrer")}
                  >
                    Open Review
                  </TerasActionButton>
                ) : result.next_action === "submit-corrected-request" ? (
                  <TerasActionButton onClick={onStartCorrection}>
                    Correct Request
                  </TerasActionButton>
                ) : undefined
          }
          description="OOS owns durable progress. Canonical mutation is true only after reviewed merge and readback."
          fit="content"
          kicker="Current Move"
          title={result.next_action.replaceAll("-", " ")}
          tone={resultTone(result)}
          treatment="rail"
        >
          {result.status === "review-required" ? (
            <TerasContentTray
              actions={
                <TerasActionRow spacing="tight">
                  <TerasActionButton disabled={pending} onClick={onContinue}>
                    Check Review
                  </TerasActionButton>
                  <TerasActionButton emphasis="secondary" disabled={pending} onClick={onCancel}>
                    Cancel Request
                  </TerasActionButton>
                </TerasActionRow>
              }
              description="Merge remains a human provider action. Cancel only the unmerged request."
              kicker="Review Boundary"
            />
          ) : null}
        </TerasWizardPanel>
      ) : null}
      {error ? (
        <TerasWizardPanel
          description="The current request state is preserved for inspection or retry."
          fit="content"
          kicker="Workflow Stopped"
          title="Workspace Intake Unavailable"
          tone="danger"
          treatment="rail"
        >
          <TerasEmptyState>{error}</TerasEmptyState>
        </TerasWizardPanel>
      ) : null}
    </>
  );
}

function WorkspaceIntakeResultPanel({
  error,
  result,
}: {
  error?: string;
  result: WorkspaceIntakeResult | null;
}) {
  return (
    <TerasWizardPanel
      description="Inspect durable progress, review evidence, and the canonical completion receipt when available."
      kicker="Workflow Result"
      title={
        result?.status === "succeeded"
          ? "Classification Complete"
          : result
            ? "Workflow Progress"
            : "Result Unavailable"
      }
    >
      {result ? (
        <>
          <TerasMetadataList
            items={[
              { label: "Status", value: result.status },
              { label: "Revision", value: String(result.revision) },
              { label: "Canonical Mutation", value: result.canonical_mutation ? "Proven" : "Not claimed" },
              { label: "Receipt", value: result.receipt?.receipt_id ?? "Pending" },
            ]}
          />
          <TerasList frame="contained" scrollHeight="short">
            {result.history.map((event) => (
              <TerasSignalItem
                detail={event.at}
                key={event.sequence}
                label={`Event ${event.sequence}`}
                title={event.status.replaceAll("-", " ")}
                tone={event.status === "succeeded" ? "ok" : "info"}
              />
            ))}
          </TerasList>
        </>
      ) : (
        <TerasEmptyState>{error ?? "No Workspace Intake result is available."}</TerasEmptyState>
      )}
    </TerasWizardPanel>
  );
}

function createRequestId() {
  return `workspace-intake-request:console-${crypto.randomUUID()}`;
}

function resultTone(result: WorkspaceIntakeResult | null) {
  if (!result) return "muted" as const;
  if (result.status === "succeeded") return "ok" as const;
  if (result.status === "rejected") return "danger" as const;
  if (result.status === "requires-action") return "warn" as const;
  return "info" as const;
}
