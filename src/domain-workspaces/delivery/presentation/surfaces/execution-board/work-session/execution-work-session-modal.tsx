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
import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type {
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionProjection,
} from "../../../../live-runtime/delivery-work-session-live-types.ts";

type WorkSessionRuntime = {
  continueWork: () => Promise<unknown>;
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
  packageSummary,
  runtime,
  workItemId,
}: {
  onClose: () => void;
  packageSummary: DeliveryPackageSummary;
  runtime: WorkSessionRuntime;
  workItemId: number | null;
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
  const canPrepare =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    !projection?.session_id &&
    !draft;
  const canStart =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    Boolean(draft && decisionReady);
  const canContinue =
    runtime.mode === "live" &&
    runtime.projectionStatus === "current" &&
    Boolean(projection?.session_id && projection.session_revision && nextAction);

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

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Start or continue governed source work from authoritative OOS session state."
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
              description={packageSummary.summary}
              kicker="Selected Target"
              title={packageSummary.display_name}
            />
            <TerasMetadataList
              items={[
                {
                  label: "Package",
                  value: packageSummary.source_ref,
                },
                {
                  label: "Execution target",
                  value: workItemId ? `OpenProject work item #${workItemId}` : "Unavailable",
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
            ) : canContinue ? (
              <TerasList frame="contained">
                <TerasSignalItem
                  actions={
                    <TerasActionButton
                      disabled={submitting}
                      onClick={() => run(runtime.continueWork)}
                    >
                      Continue Work Session
                    </TerasActionButton>
                  }
                  detail={nextAction?.reason ?? "Continue the exact OOS-projected move."}
                  label="Operator action"
                  title={nextAction ? nextActionLabel(nextAction.code) : "Continue"}
                  tone="info"
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
