"use client";

import { useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasList,
  TerasMetadataList,
  TerasStatusItem,
  TerasTimeline,
  TerasTimelineItem,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
  type TerasWizardStep,
} from "@/teras";

import type { WorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type {
  WorkspaceInventoryResult,
  WorkspaceRegistryCandidate,
} from "../model/workspace-registry-types";

type PromotionStep = "apply" | "result" | "review";

export function WorkspaceRegistryPromotionWorkflow({
  candidate,
  fixtureMode,
  onClose,
  runtime,
}: {
  candidate: WorkspaceRegistryCandidate;
  fixtureMode: boolean;
  onClose: () => void;
  runtime: WorkspaceRegistryLiveRuntime;
}) {
  const [step, setStep] = useState<PromotionStep>("review");
  const [localError, setLocalError] = useState<string | null>(null);
  const result = runtime.result;
  const steps = useMemo<TerasWizardStep[]>(
    () => [
      {
        available: true,
        connectsToNext: true,
        id: "review",
        label: "Review",
        stateLabel: step === "review" ? "Current" : "Done",
        tone: step === "review" ? "warn" : "ok",
      },
      {
        available: step !== "review",
        connectsToNext: true,
        id: "apply",
        label: "Apply",
        stateLabel:
          step === "review" ? "Next" : step === "apply" ? "Current" : "Done",
        tone: step === "review" ? "muted" : step === "apply" ? "warn" : "ok",
      },
      {
        available: step === "result",
        connectsToNext: false,
        id: "result",
        label: "Result",
        stateLabel: result ? resultStatusLabel(result) : "Pending",
        tone: result ? resultTone(result) : "muted",
      },
    ],
    [result, step],
  );

  async function prepare() {
    setLocalError(null);
    if (fixtureMode) {
      setStep("apply");
      return;
    }
    try {
      await runtime.prepare(candidate);
      setStep("apply");
    } catch (error) {
      setLocalError(message(error));
    }
  }

  async function submit() {
    setLocalError(null);
    try {
      await runtime.submit(
        candidate,
        `workspace-inventory-request:console-${crypto.randomUUID()}`,
      );
      setStep("result");
    } catch (error) {
      setLocalError(message(error));
    }
  }

  async function continuePromotion() {
    if (!result) return;
    setLocalError(null);
    try {
      await runtime.continuePromotion(result.request_id);
    } catch (error) {
      setLocalError(message(error));
    }
  }

  const support = (
    <TerasWizardPanel
      description="Promotion stays bound to the reviewed authority revision."
      fit="fill"
      kicker="Promotion Check"
      title="Canonical boundary"
      tone={fixtureMode ? "info" : localError ? "danger" : "warn"}
      treatment="rail"
    >
      <TerasList fit="fill">
        <TerasStatusItem
          detail={candidate.target.record_id}
          label="Candidate identity"
          status="Bound"
          tone="ok"
        />
        <TerasStatusItem
          detail={`${candidate.owner_refs.length} owner reference${candidate.owner_refs.length === 1 ? "" : "s"}`}
          label="Ownership"
          status="Present"
          tone="ok"
        />
        <TerasStatusItem
          detail={
            fixtureMode
              ? "Fixture projections cannot submit canonical changes."
              : runtime.preparation
                ? shortDigest(runtime.preparation.expected_state.intake_entry_digest)
                : "Preparation is read when review completes."
          }
          label="Authority preparation"
          status={fixtureMode ? "Read only" : runtime.preparation ? "Current" : "Pending"}
          tone={fixtureMode ? "info" : runtime.preparation ? "ok" : "warn"}
        />
        {localError ? (
          <TerasStatusItem
            detail={localError}
            label="Live operation"
            status="Blocked"
            tone="danger"
          />
        ) : null}
      </TerasList>
    </TerasWizardPanel>
  );

  return (
    <TerasWizardModal
      activeStepId={step}
      description="Review the canonical entrant, apply its promotion through OOS, and retain the returned evidence."
      footer={
        <TerasWizardFooter
          apply={
            step === "apply"
              ? {
                  disabled: fixtureMode || runtime.pending,
                  label: runtime.pending ? "Submitting" : "Apply Promotion",
                  onClick: () => void submit(),
                }
              : undefined
          }
          back={{
            emphasis: "secondary",
            label: step === "review" || step === "result" ? "Back to Registry" : "Back",
            onClick: step === "review" || step === "result" ? onClose : () => setStep("review"),
          }}
          finish={
            step === "result" && result?.next_action === "continue"
              ? {
                  disabled: runtime.pending,
                  label: runtime.pending ? "Continuing" : "Continue Promotion",
                  onClick: () => void continuePromotion(),
                }
              : undefined
          }
          next={
            step === "review"
              ? {
                  disabled: runtime.pending,
                  label: runtime.pending ? "Preparing" : "Review Promotion",
                  onClick: () => void prepare(),
                }
              : undefined
          }
        />
      }
      kicker="Workspace Registry"
      onClose={onClose}
      onStepSelect={(nextStep) => {
        if (nextStep === "review" || (nextStep === "apply" && step !== "review")) {
          setStep(nextStep);
        }
      }}
      statusLabel={fixtureMode ? "Fixture" : result ? resultStatusLabel(result) : "Review"}
      statusTone={fixtureMode ? "info" : result ? resultTone(result) : "warn"}
      steps={steps}
      subject={{
        detail: `${candidate.target.kind} entrant`,
        eyebrow: "Promotion Candidate",
        title: candidate.target.name,
      }}
      support={support}
      surfaceId="workspace-registry-promotion"
      title="Workspace Inventory Promotion"
    >
      {step === "review" ? (
        <TerasWizardPanel
          description="Confirm the entrant identity, ownership, and approved source before preparation."
          kicker="Candidate Review"
          title="Promotion record"
        >
          <TerasMetadataList
            columns={2}
            items={[
              { label: "Record", value: candidate.target.record_id },
              { label: "Type", value: candidate.target.kind },
              { label: "Version", value: String(candidate.intake_entry_ref.version) },
              { label: "Candidate", value: shortDigest(candidate.candidate_digest) },
              { label: "Owners", value: candidate.owner_refs.join(", ") },
              { label: "Approvals", value: String(candidate.approval_refs.length) },
            ]}
          />
        </TerasWizardPanel>
      ) : step === "apply" ? (
        <TerasWizardPanel
          description={
            fixtureMode
              ? "This fixture demonstrates the review boundary without submitting a canonical mutation."
              : "The final command will use the preparation returned for this authority revision."
          }
          kicker="Apply Review"
          title="Expected canonical state"
        >
          <TerasList>
            <TerasStatusItem
              detail={candidate.intake_entry_ref.id}
              label="Intake entrant"
              status="Current"
              tone="ok"
            />
            <TerasStatusItem
              detail={runtime.preparation ? shortDigest(runtime.preparation.authority_revision) : "Fixture projection"}
              label="Authority revision"
              status={runtime.preparation ? "Bound" : "Read only"}
              tone={runtime.preparation ? "ok" : "info"}
            />
            <TerasStatusItem
              detail="OOS owns the command, review, merge, readback, and receipt lifecycle."
              label="Mutation owner"
              status="OOS"
              tone="info"
            />
          </TerasList>
        </TerasWizardPanel>
      ) : (
        <PromotionResultPanel result={result} />
      )}
    </TerasWizardModal>
  );
}

function PromotionResultPanel({ result }: { result: WorkspaceInventoryResult | null }) {
  return (
    <TerasWizardPanel
      description="OOS status, review, readback, and receipt evidence remain attached to one request."
      kicker="Promotion Result"
      title={result ? resultStatusLabel(result) : "No result returned"}
    >
      {result ? (
        <>
          <TerasMetadataList
            columns={2}
            items={[
              { label: "Request", value: result.request_id },
              { label: "Next action", value: result.next_action.replaceAll("-", " ") },
              { label: "Review", value: result.review ? `#${result.review.number}` : "Not opened" },
              { label: "Receipt", value: result.receipt?.receipt_id ?? "Pending" },
            ]}
          />
          <TerasTimeline ariaLabel="Workspace Inventory promotion history">
            {result.history.map((event) => (
              <TerasTimelineItem
                detail={event.status}
                displayTimestamp={new Date(event.at).toLocaleString()}
                key={`${event.sequence}-${event.status}`}
                label={`Revision ${event.sequence}`}
                status={event.status}
                timestamp={event.at}
                tone={event.status === "succeeded" ? "ok" : event.status === "blocked" || event.status === "rejected" ? "danger" : "info"}
              />
            ))}
          </TerasTimeline>
        </>
      ) : null}
    </TerasWizardPanel>
  );
}

function resultStatusLabel(result: WorkspaceInventoryResult) {
  return result.status.replaceAll("-", " ");
}

function resultTone(result: WorkspaceInventoryResult) {
  if (result.status === "succeeded") return "ok" as const;
  if (result.status === "blocked" || result.status === "rejected" || result.failure) return "danger" as const;
  if (result.status === "stale" || result.status === "review-required") return "warn" as const;
  return "info" as const;
}

function shortDigest(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Workspace Inventory promotion failed.";
}
