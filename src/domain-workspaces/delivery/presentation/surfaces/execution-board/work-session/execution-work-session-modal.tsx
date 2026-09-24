import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasContentTray,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasSignalItem,
  TerasTextField,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";
import type {
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionProjection,
} from "../../../../live-runtime/delivery-work-session-live-types.ts";
import type { ExecutionWorkSessionTarget } from "./execution-work-session-target.ts";

type WorkSessionRuntime = {
  closeWork: () => Promise<unknown>;
  continueWork: () => Promise<unknown>;
  mergeWork: () => Promise<unknown>;
  mode: "disconnected-preview" | "live" | null;
  prepare: () => Promise<unknown>;
  projection: DeliveryWorkSessionProjection | null;
  projectionError: string | null;
  projectionStatus: "current" | "loading" | "offline";
  refresh: () => Promise<unknown>;
  start: (decision: DeliveryWorkSessionDecisionInput) => Promise<unknown>;
};

export function ExecutionWorkSessionModal({
  onClose,
  runtime,
  target,
}: {
  onClose: () => void;
  runtime: WorkSessionRuntime;
  target: ExecutionWorkSessionTarget;
}) {
  const draft = runtime.projection?.decision_draft ?? null;
  const [decision, setDecision] = useState<DeliveryWorkSessionDecisionInput | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft) {
      setDecision(null);
      return;
    }
    setDecision(decisionInputFromDraft(draft));
  }, [draft]);

  const decisionReady = useMemo(
    () => (decision ? workSessionDecisionReady(decision) : false),
    [decision],
  );
  const projection = runtime.projection;
  const nextAction = projection?.next_action ?? null;
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
    Boolean(draft && decisionReady);
  const canRunProjectedCommand =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    Boolean(
      projection?.session_id &&
        projection.session_revision &&
        projectedCommand,
    );

  async function run(command: () => Promise<unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      await command();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Work-session request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function runProjectedCommand() {
    if (projectedCommand === "merge") return runtime.mergeWork();
    if (projectedCommand === "close") return runtime.closeWork();
    return runtime.continueWork();
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Run the governed source lifecycle from authoritative OOS state, gates, and receipts."
      footer={
        <TerasActionButton emphasis="secondary" onClick={onClose}>
          Back to Board
        </TerasActionButton>
      }
      height="content"
      kicker="Delivery Execution"
      onClose={onClose}
      surfaceId="delivery-execution-work-session"
      title="Governed Work Session"
      width="large"
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            layout="header-body"
            tone="info"
            treatment="state"
          >
            <TerasPanelHeader
              description={target.description}
              kicker="Selected Target"
              title={target.title}
            />
            <TerasMetadataList
              items={[
                {
                  label: target.sourceLabel,
                  value: target.sourceValue,
                },
                {
                  label: "Execution target",
                  value: target.workItemId
                    ? `OpenProject work item #${target.workItemId}`
                    : "Unavailable",
                },
                {
                  label: "Session",
                  value: projection?.session_id ?? "Not started",
                },
              ]}
            />
          </TerasPanel>

          {decision ? (
            <TerasPanel
              frame="padded"
              layout="header-body"
              tone="warn"
              treatment="state"
            >
              <TerasPanelHeader
                description="Confirm the source landing and rollback boundary before OOS starts work."
                kicker="Landing Unit"
                title="Work Session Decision"
              />
              <TerasFieldStack spacing="normal">
                <TerasSelectField
                  label="Landing unit model"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "landingUnitDecision", value)
                  }
                  options={[
                    {
                      label: "Child isolated landing unit",
                      value: "child_isolated_landing_unit",
                    },
                    {
                      label: "Feature single landing unit",
                      value: "feature_single_landing_unit",
                    },
                  ]}
                  value={decision.landingUnitDecision}
                />
                <TerasTextField
                  label="Landing unit id"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "landingUnitId", value)
                  }
                  value={decision.landingUnitId}
                />
                <TerasTextField
                  label="Branch"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "branch", value)
                  }
                  value={decision.branch}
                />
                <TerasNoteField
                  label="Split reason"
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "splitReason", value)
                  }
                  value={decision.splitReason}
                />
                <TerasNoteField
                  label="Rollback boundary"
                  minimumHeight="short"
                  onValueChange={(value) =>
                    updateDecision(setDecision, "rollbackBoundary", value)
                  }
                  value={decision.rollbackBoundary}
                />
                <TerasSelectField
                  label="Architecture packet"
                  onValueChange={(value) =>
                    setDecision((current) =>
                      current
                        ? {
                            ...current,
                            architecture: {
                              ...current.architecture,
                              required: value === "required",
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
                />
                {decision.architecture.required ? (
                  <TerasContentTray kicker="Architecture Location">
                    <TerasFieldStack spacing="normal">
                      <TerasTextField
                        label="Owner repo"
                        onValueChange={(value) =>
                          updateArchitectureLocation(setDecision, "repo", value)
                        }
                        value={decision.architecture.artifactLocation?.repo ?? ""}
                      />
                      <TerasTextField
                        label="Relative path"
                        onValueChange={(value) =>
                          updateArchitectureLocation(
                            setDecision,
                            "relative_path",
                            value,
                          )
                        }
                        value={
                          decision.architecture.artifactLocation?.relative_path ?? ""
                        }
                      />
                    </TerasFieldStack>
                  </TerasContentTray>
                ) : null}
              </TerasFieldStack>
            </TerasPanel>
          ) : null}

          {projection?.session_id ? (
            <TerasPanel
              frame="padded"
              layout="header-body"
              tone="info"
              treatment="state"
            >
              <TerasPanelHeader
                description="Authoritative source, evidence, review, and cleanup posture for this work session."
                kicker="Lifecycle Evidence"
                title="Governed State"
              />
              <TerasMetadataList items={workSessionEvidence(projection)} />
            </TerasPanel>
          ) : null}
        </TerasZone>

        <TerasZone fit="content">
          <TerasPanel
            frame="padded"
            layout="header-body"
            tone={runtime.projectionStatus === "offline" ? "danger" : "info"}
            treatment="rail"
          >
            <TerasPanelHeader
              description={
                error ??
                runtime.projectionError ??
                nextAction?.reason ??
                "OOS is resolving the current work-session move."
              }
              kicker="Current Move"
              statusLabel={projection?.state ?? (runtime.mode ? "Loading" : "Connecting")}
              statusTone={runtime.projectionStatus === "offline" ? "danger" : "info"}
              title={nextAction ? nextActionLabel(nextAction.code) : "Work Session Status"}
            />
            {runtime.projectionStatus === "offline" ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  actions={
                    <TerasActionButton
                      emphasis="secondary"
                      onClick={() => run(runtime.refresh)}
                    >
                      Retry
                    </TerasActionButton>
                  }
                  detail="Live mode remains read-only until authoritative session state is available."
                  label="Unavailable"
                  title="OOS projection could not be loaded"
                  tone="danger"
                />
              </TerasList>
            ) : canPrepare ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  actions={
                    <TerasActionButton
                      disabled={submitting}
                      onClick={() => run(runtime.prepare)}
                    >
                      Prepare Session
                    </TerasActionButton>
                  }
                  detail="Ask OOS for the caller-bound Landing Unit decision draft."
                  label="Required"
                  title="Prepare work-session decision"
                  tone="info"
                />
              </TerasList>
            ) : canStart && decision ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  actions={
                    <TerasActionButton
                      disabled={submitting}
                      onClick={() => run(() => runtime.start(decision))}
                    >
                      Start Work Session
                    </TerasActionButton>
                  }
                  detail="Submit the reviewed Landing Unit decision to OOS."
                  label="Operator action"
                  title="Start governed work"
                  tone="info"
                />
              </TerasList>
            ) : canRunProjectedCommand && nextAction ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  actions={
                    <TerasActionButton
                      disabled={submitting}
                      onClick={() => run(runProjectedCommand)}
                    >
                      {workSessionCommandLabel(nextAction.code)}
                    </TerasActionButton>
                  }
                  detail={nextAction.reason}
                  label="Operator action"
                  title={nextActionLabel(nextAction.code)}
                  tone="info"
                />
              </TerasList>
            ) : nextAction ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  detail={nextAction.reason}
                  label={nextAction.authority}
                  statusLabel="Waiting"
                  title={nextActionLabel(nextAction.code)}
                  tone="warn"
                />
              </TerasList>
            ) : runtime.mode === null ? (
              <TerasEmptyState>Loading authoritative session state.</TerasEmptyState>
            ) : (
              <TerasEmptyState>
                No work-session mutation is currently available from this surface.
              </TerasEmptyState>
            )}
          </TerasPanel>

          {projection?.command_receipt ? (
            <TerasPanel
              frame="padded"
              layout="header-body"
              tone="info"
              treatment="state"
            >
              <TerasPanelHeader
                description="Immutable OOS evidence for the latest accepted command."
                kicker="Command Receipt"
                title="Recorded Result"
              />
              <TerasMetadataList
                items={[
                  { label: "Result", value: projection.command_receipt.result_state },
                  { label: "Executor", value: projection.command_receipt.executor_id },
                  { label: "Receipt", value: projection.command_receipt.ref },
                ]}
              />
            </TerasPanel>
          ) : null}

          {projection?.cleanup_receipt ? (
            <TerasPanel
              frame="padded"
              layout="header-body"
              tone="ok"
              treatment="state"
            >
              <TerasPanelHeader
                description="Durable OOS evidence for terminal work-session resource retirement."
                kicker="Cleanup Receipt"
                title="Terminal Result"
              />
              <TerasMetadataList
                items={[
                  {
                    label: "Outcome",
                    value: projection.cleanup_receipt.outcome,
                  },
                  {
                    label: "State",
                    value: projection.state,
                  },
                ]}
              />
            </TerasPanel>
          ) : null}
        </TerasZone>
      </TerasZoneLayout>
    </TerasModalShell>
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
    landingUnitDecision: draft.landing_unit.decision,
    landingUnitId: draft.landing_unit.id,
    rollbackBoundary: cleanRequiredMarker(draft.landing_unit.rollback_boundary),
    splitReason: cleanRequiredMarker(draft.landing_unit.split_reason),
  };
}

function cleanRequiredMarker(value: string) {
  return value.startsWith("REQUIRED:") ? "" : value;
}

function nextActionLabel(code: string) {
  return code
    .replace(/-required$/, "")
    .split("-")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

const continueCommandLabels: Record<string, string> = {
  "agent-source-publish-required": "Publish Source",
  "draft-finalization": "Prepare Final Evidence",
  "draft-review-packet": "Draft Review Packet",
  "draft-work-start": "Draft Work Start",
  "evaluate-work-start": "Evaluate Work Start",
  "finalize-review-packet": "Finalize Review Packet",
  "issue-operating-readiness": "Evaluate Operating Readiness",
  "mark-merge-ready": "Evaluate Merge Readiness",
  "owner-evidence-acquisition-required": "Run Evidence Checks",
  "persist-architecture": "Persist Architecture",
  "project-review-evidence": "Project Evidence",
  "source-worktree-required": "Prepare Source Workspace",
};

function workSessionCommand(code: string | null | undefined) {
  if (!code) return null;
  if (code === "source-merge-approval-required") return "merge" as const;
  if (
    ["art-closeout-required", "cleanup-required", "cleanup-retry-required"].includes(
      code,
    )
  ) {
    return "close" as const;
  }
  return continueCommandLabels[code] ? ("continue" as const) : null;
}

function workSessionCommandLabel(code: string) {
  if (code === "source-merge-approval-required") return "Merge Source";
  if (code === "art-closeout-required") return "Close Work";
  if (code === "cleanup-required") return "Finish Cleanup";
  if (code === "cleanup-retry-required") return "Retry Cleanup";
  return continueCommandLabels[code] ?? "Continue";
}

function workSessionEvidence(projection: DeliveryWorkSessionProjection) {
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
  setDecision((current) =>
    current
      ? {
          ...current,
          architecture: {
            ...current.architecture,
            artifactLocation: {
              relative_path:
                field === "relative_path"
                  ? value
                  : (current.architecture.artifactLocation?.relative_path ?? ""),
              repo:
                field === "repo"
                  ? value
                  : (current.architecture.artifactLocation?.repo ?? ""),
            },
          },
        }
      : current,
  );
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
  return Boolean(
    decision.branch.trim() &&
      decision.landingUnitId.trim() &&
      decision.rollbackBoundary.trim() &&
      decision.splitReason.trim() &&
      (!decision.architecture.required ||
        (decision.architecture.artifactLocation?.repo.trim() &&
          decision.architecture.artifactLocation.relative_path.trim())),
  );
}
