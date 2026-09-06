"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasChoiceGroup,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasNoteField,
  TerasSelectableRow,
  TerasStatusItem,
  TerasTextField,
  TerasTimeline,
  TerasTimelineItem,
  TerasTrayStack,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
  type TerasWizardStep,
} from "@/teras";

import { workspaceInventoryLifecyclePreparationFixture } from "../fixtures/workspace-registry.fixture";
import type { WorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type {
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryLifecycleResult,
  WorkspaceRegistryRecord,
} from "../model/workspace-registry-types";
import {
  defaultWorkspaceInventoryLifecycleAction,
  workspaceInventoryLifecycleActionLabels,
  workspaceInventoryLifecycleActionOptions,
  workspaceInventoryLifecycleNextPosture,
  workspaceInventoryLifecycleResultTone,
} from "./workspace-registry-lifecycle-view-model";

type LifecycleStep = "configure" | "result" | "review";

const impactAcknowledgement =
  "I reviewed downstream references and understand that this action preserves identity and append-only history.";

export function WorkspaceRegistryLifecycleWorkflow({
  fixtureMode,
  onClose,
  record,
  runtime,
}: {
  fixtureMode: boolean;
  onClose: () => void;
  record: WorkspaceRegistryRecord;
  runtime: WorkspaceRegistryLiveRuntime;
}) {
  const [step, setStep] = useState<LifecycleStep>("configure");
  const [action, setAction] = useState<WorkspaceInventoryLifecycleAction>(() =>
    defaultWorkspaceInventoryLifecycleAction(record.posture),
  );
  const [reason, setReason] = useState("");
  const [approvalRef, setApprovalRef] = useState("");
  const [metadataValue, setMetadataValue] = useState("");
  const [impactConfirmed, setImpactConfirmed] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fixturePreparation = useMemo(
    () => workspaceInventoryLifecyclePreparationFixture(record),
    [record],
  );
  const preparation = fixtureMode
    ? fixturePreparation
    : runtime.lifecyclePreparation;
  const result = runtime.lifecycleResult;
  const metadata = parseRequestedValue(
    metadataValue,
    preparation,
    action,
  );
  const configured = Boolean(
    preparation &&
      reason.trim().length >= 12 &&
      approvalRef.trim().length > 0 &&
      impactConfirmed &&
      (action !== "update" || metadata.value),
  );
  const steps = useMemo<TerasWizardStep[]>(
    () => [
      {
        available: true,
        connectsToNext: true,
        id: "configure",
        label: "Configure",
        stateLabel: step === "configure" ? "Current" : "Done",
        tone: step === "configure" ? "warn" : "ok",
      },
      {
        available: configured && step !== "configure",
        connectsToNext: true,
        id: "review",
        label: "Review",
        stateLabel:
          step === "configure" ? "Next" : step === "review" ? "Current" : "Done",
        tone: step === "configure" ? "muted" : step === "review" ? "warn" : "ok",
      },
      {
        available: step === "result",
        connectsToNext: false,
        id: "result",
        label: "Result",
        stateLabel: result ? lifecycleStatusLabel(result) : "Pending",
        tone: result ? workspaceInventoryLifecycleResultTone(result) : "muted",
      },
    ],
    [configured, result, step],
  );

  useEffect(() => {
    if (fixtureMode) return;
    void runtime.prepareLifecycle(record).catch((error) => {
      setLocalError(message(error));
    });
  }, [fixtureMode, record, runtime.prepareLifecycle]);

  useEffect(() => {
    if (!preparation) return;
    const { record: _envelope, ...currentValue } = preparation.current_record;
    setMetadataValue(JSON.stringify(currentValue, null, 2));
  }, [preparation]);

  function updateAction(nextAction: WorkspaceInventoryLifecycleAction) {
    setAction(nextAction);
    setReviewConfirmed(false);
    setLocalError(null);
  }

  async function submit() {
    if (!configured || !preparation || !reviewConfirmed || !metadata.valid) return;
    setLocalError(null);
    try {
      await runtime.submitLifecycle({
        action,
        approvalRefs: [approvalRef.trim()],
        impactAcknowledgements: [impactAcknowledgement],
        reason: reason.trim(),
        requestId: `workspace-inventory-lifecycle-request:console-${crypto.randomUUID()}`,
        requestedValue: action === "update" ? metadata.value : null,
      });
      setStep("result");
    } catch (error) {
      setLocalError(message(error));
    }
  }

  async function continueLifecycle() {
    if (!result) return;
    setLocalError(null);
    try {
      await runtime.continueLifecycle(result.request_id);
    } catch (error) {
      setLocalError(message(error));
    }
  }

  async function cancelLifecycle() {
    if (!result) return;
    setLocalError(null);
    try {
      await runtime.cancelLifecycle(result.request_id);
    } catch (error) {
      setLocalError(message(error));
    }
  }

  const support = (
    <TerasWizardPanel
      description="Current authority, impact, and readiness for this exact record."
      fit="fill"
      kicker="Lifecycle Check"
      title="Canonical boundary"
      tone={localError ? "danger" : result ? workspaceInventoryLifecycleResultTone(result) : "info"}
      treatment="rail"
    >
      <TerasList fit="fill">
        <TerasStatusItem
          detail={`${record.kind} · version ${record.version}`}
          label="Record identity"
          status="Bound"
          tone="ok"
        />
        <TerasStatusItem
          detail={preparation ? shortDigest(preparation.expected_state.record_digest) : "Reading current authority"}
          label="Lifecycle preparation"
          status={preparation ? "Current" : "Pending"}
          tone={preparation ? "ok" : "warn"}
        />
        <TerasStatusItem
          detail={impactConfirmed ? "Downstream references reviewed" : "Explicit acknowledgement required"}
          label="Impact"
          status={impactConfirmed ? "Acknowledged" : "Required"}
          tone={impactConfirmed ? "ok" : "warn"}
        />
        {result?.readiness ? (
          <TerasStatusItem
            detail={`${result.readiness.readiness.findings.length} finding${result.readiness.readiness.findings.length === 1 ? "" : "s"}`}
            label="WGCF readiness"
            status={result.readiness.readiness.outcome}
            tone={result.readiness.readiness.outcome === "ready" ? "ok" : "danger"}
          />
        ) : null}
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
      description="Change one active inventory record through reviewed canonical source and retain its lifecycle evidence."
      footer={
        <TerasWizardFooter
          apply={
            step === "review"
              ? {
                  disabled: fixtureMode || runtime.pending || !reviewConfirmed,
                  label: runtime.pending ? "Applying" : "Apply Lifecycle Action",
                  onClick: () => void submit(),
                  tone: action === "retire" ? "danger" : "accent",
                }
              : undefined
          }
          back={{
            emphasis: "secondary",
            label: step === "review" ? "Back" : "Back to Registry",
            onClick: step === "review" ? () => setStep("configure") : onClose,
          }}
          finish={
            step === "result" && result && canContinue(result)
              ? {
                  disabled: runtime.pending,
                  label: result.next_action === "review-and-merge" ? "Check Review" : "Continue Lifecycle",
                  onClick: () => void continueLifecycle(),
                }
              : undefined
          }
          next={
            step === "configure"
              ? {
                  disabled: !configured || !metadata.valid,
                  label: "Review Action",
                  onClick: () => setStep("review"),
                }
              : undefined
          }
        />
      }
      kicker="Workspace Registry"
      onClose={onClose}
      onStepSelect={(stepId) => {
        if (
          stepId === "configure" ||
          (stepId === "review" && configured) ||
          (stepId === "result" && result)
        ) {
          setStep(stepId as LifecycleStep);
        }
      }}
      statusLabel={fixtureMode ? "Fixture" : result ? lifecycleStatusLabel(result) : record.posture}
      statusTone={fixtureMode ? "info" : result ? workspaceInventoryLifecycleResultTone(result) : postureTone(record.posture)}
      steps={steps}
      subject={{
        detail: `${record.kind} · version ${record.version}`,
        eyebrow: "Selected Record",
        title: record.name,
      }}
      support={support}
      surfaceId="workspace-registry-lifecycle"
      title="Workspace Inventory Lifecycle"
    >
      {step === "configure" ? (
        <TerasWizardPanel
          description="Choose one legal action and bind the operator reason, approval, impact, and requested value."
          kicker="Lifecycle Action"
          title="Configure change"
        >
          <TerasTrayStack spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Workspace Inventory lifecycle action"
              frame="tray"
              label="Available actions"
              onSelect={updateAction}
              options={workspaceInventoryLifecycleActionOptions(record.posture)}
              selectedId={action}
            />
            <TerasFieldStack spacing="compact">
              <TerasNoteField
                density="compact"
                label="Reason"
                minimumHeight="short"
                onValueChange={(value) => {
                  setReason(value);
                  setReviewConfirmed(false);
                }}
                placeholder="Explain why this lifecycle change is required."
                value={reason}
              />
              <TerasTextField
                label="Approval reference"
                onValueChange={(value) => {
                  setApprovalRef(value);
                  setReviewConfirmed(false);
                }}
                placeholder="openproject://work_packages/1080"
                value={approvalRef}
              />
              {action === "update" ? (
                <TerasNoteField
                  density="compact"
                  label="Complete record value (JSON)"
                  minimumHeight="medium"
                  onValueChange={(value) => {
                    setMetadataValue(value);
                    setReviewConfirmed(false);
                  }}
                  spellCheck={false}
                  value={metadataValue}
                />
              ) : null}
              {action === "update" && metadata.error ? (
                <TerasStatusItem
                  detail={metadata.error}
                  label="Record value"
                  status="Correct input"
                  tone="danger"
                />
              ) : null}
              <TerasSelectableRow
                ariaLabel="Acknowledge Workspace Inventory lifecycle impact"
                detail="Identity and append-only history remain preserved; downstream references were reviewed."
                label="Acknowledge impact"
                onSelect={() => {
                  setImpactConfirmed((current) => !current);
                  setReviewConfirmed(false);
                }}
                selected={impactConfirmed}
                status={impactConfirmed ? "acknowledged" : "required"}
                tone={impactConfirmed ? "ok" : "warn"}
              />
            </TerasFieldStack>
          </TerasTrayStack>
        </TerasWizardPanel>
      ) : step === "review" ? (
        <TerasWizardPanel
          description="Confirm the exact transition and current canonical bindings before OOS accepts the request."
          kicker="Lifecycle Review"
          title={workspaceInventoryLifecycleActionLabels[action]}
        >
          <TerasTrayStack spacing="loose">
            <TerasMetadataList
              columns={2}
              items={[
                { label: "Record", value: record.id },
                { label: "Version", value: String(preparation?.expected_state.record_version ?? record.version) },
                { label: "Current posture", value: record.posture },
                { label: "Expected posture", value: workspaceInventoryLifecycleNextPosture(action, record.posture) },
                { label: "Approval", value: approvalRef.trim() },
                { label: "Authority", value: preparation ? shortDigest(preparation.authority_revision) : "Pending" },
              ]}
            />
            <TerasStatusItem
              detail={reason.trim()}
              label="Operator reason"
              status="Recorded"
              tone="info"
            />
            <TerasSelectableRow
              ariaLabel="Confirm Workspace Inventory lifecycle action"
              detail="OOS will re-read the Registry and lifecycle preparation before it accepts this request."
              label="Confirm this exact lifecycle action"
              onSelect={() => setReviewConfirmed((current) => !current)}
              selected={reviewConfirmed}
              status={reviewConfirmed ? "confirmed" : "required"}
              tone={reviewConfirmed ? "ok" : "warn"}
            />
          </TerasTrayStack>
        </TerasWizardPanel>
      ) : (
        <LifecycleResultPanel
          onCancel={() => void cancelLifecycle()}
          result={result}
        />
      )}
    </TerasWizardModal>
  );
}

function LifecycleResultPanel({
  onCancel,
  result,
}: {
  onCancel: () => void;
  result: WorkspaceInventoryLifecycleResult | null;
}) {
  return (
    <TerasWizardPanel
      description="OOS readiness, review, canonical readback, receipt, and ordered request history."
      kicker="Lifecycle Result"
      title={result ? lifecycleStatusLabel(result) : "No result returned"}
      tone={result ? workspaceInventoryLifecycleResultTone(result) : "danger"}
      treatment="state"
    >
      {result ? (
        <TerasTrayStack spacing="loose">
          <TerasMetadataList
            columns={2}
            items={[
              { label: "Action", value: workspaceInventoryLifecycleActionLabels[result.request.action] },
              { label: "Next action", value: result.next_action.replaceAll("-", " ") },
              { label: "Review", value: result.review ? `#${result.review.number}` : "Not opened" },
              { label: "Receipt", value: result.receipt?.receipt_id ?? "Pending" },
              { label: "Canonical event", value: result.merged_state?.history_event_ref.id ?? "Pending" },
              { label: "Revision", value: String(result.revision) },
            ]}
          />
          {result.readiness?.readiness.findings.length ? (
            <TerasList>
              {result.readiness.readiness.findings.map((finding) => (
                <TerasStatusItem
                  detail={finding}
                  key={finding}
                  label="Readiness finding"
                  status="Blocked"
                  tone="danger"
                />
              ))}
            </TerasList>
          ) : null}
          <TerasTimeline ariaLabel="Workspace Inventory lifecycle history">
            {result.history.map((event) => (
              <TerasTimelineItem
                detail={event.status.replaceAll("-", " ")}
                displayTimestamp={new Date(event.at).toLocaleString()}
                key={`${event.sequence}-${event.status}`}
                label={`Revision ${event.sequence}`}
                status={event.status}
                timestamp={event.at}
                tone={historyTone(event.status)}
              />
            ))}
          </TerasTimeline>
          {result.review || !terminal(result.status) ? (
            <TerasActionRow spacing="compact">
              {result.review ? (
                <TerasActionButton
                  emphasis="secondary"
                  onClick={() => window.open(result.review?.url, "_blank", "noopener,noreferrer")}
                >
                  Open Review
                </TerasActionButton>
              ) : null}
              {!terminal(result.status) ? (
                <TerasActionButton emphasis="secondary" onClick={onCancel}>
                  Cancel Request
                </TerasActionButton>
              ) : null}
            </TerasActionRow>
          ) : null}
        </TerasTrayStack>
      ) : null}
    </TerasWizardPanel>
  );
}

function parseRequestedValue(
  source: string,
  preparation: WorkspaceInventoryLifecyclePreparation | null,
  action: WorkspaceInventoryLifecycleAction,
) {
  if (action !== "update") return { error: null, valid: true, value: null };
  if (!preparation) return { error: null, valid: false, value: null };
  try {
    const value: unknown = JSON.parse(source);
    if (!isRecord(value) || "record" in value) {
      return { error: "Provide one record value without the managed record envelope.", valid: false, value: null };
    }
    if (value.posture !== preparation.expected_state.posture) {
      return { error: "Metadata updates must preserve the current posture.", valid: false, value: null };
    }
    return { error: null, valid: true, value };
  } catch {
    return { error: "Record value must be valid JSON.", valid: false, value: null };
  }
}

function canContinue(result: WorkspaceInventoryLifecycleResult) {
  return new Set([
    "continue",
    "inspect-review-or-cancel",
    "restore-dependency-and-retry",
    "review-and-merge",
  ]).has(result.next_action);
}

function terminal(status: WorkspaceInventoryLifecycleResult["status"]) {
  return new Set(["blocked", "cancelled", "rejected", "stale", "succeeded"]).has(status);
}

function lifecycleStatusLabel(result: WorkspaceInventoryLifecycleResult) {
  return result.status.replaceAll("-", " ");
}

function historyTone(status: WorkspaceInventoryLifecycleResult["status"]) {
  if (status === "succeeded") return "ok" as const;
  if (status === "blocked" || status === "rejected") return "danger" as const;
  if (status === "stale" || status === "review-required") return "warn" as const;
  return "info" as const;
}

function postureTone(posture: WorkspaceRegistryRecord["posture"]) {
  if (posture === "active") return "ok" as const;
  if (posture === "retired") return "muted" as const;
  return "warn" as const;
}

function shortDigest(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Workspace Inventory lifecycle failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
