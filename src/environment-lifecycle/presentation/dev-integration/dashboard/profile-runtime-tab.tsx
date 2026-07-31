"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasContentFrame,
  TerasDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type {
  DevIntegrationProfile,
  DevIntegrationProfileAction,
} from "../../../model/dev-integration-profile";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../../model/environment-lifecycle-command";
import { buildDevIntegrationProfileDashboard } from "../../../read-model/dev-integration-profile-dashboard";
import { environmentProfileSubjectRef } from "../../../work-model/commands/environment-lifecycle-command-factory";
import { EnvironmentOperationLogPanel } from "../../operations/environment-operation-log-panel";
import { formatDevIntegrationObservedAt } from "../dev-integration-formatters";
import {
  devIntegrationRuntimeLabels,
  devIntegrationRuntimeTones,
  devIntegrationStateModelLabels,
  devIntegrationWriteClassLabels,
} from "../dev-integration-labels";

const runtimeOperationActions = [
  "access",
  "down",
  "reset",
  "smoke",
  "status",
  "up",
] as const satisfies readonly EnvironmentLifecycleOperation["action"][];

export function ProfileRuntimeStage({
  profile,
}: {
  profile: DevIntegrationProfile;
}) {
  const dashboard = buildDevIntegrationProfileDashboard(profile, []);

  return (
    <TerasContentFrame fill variant="standard">
      <TerasPanel
        fit="content"
        frame="padded"
        tone={
          devIntegrationRuntimeTones[
            dashboard.runtime.observation.state
          ]
        }
        treatment="rail"
      >
        <TerasPanelHeader
          description="Latest observation supplied by the profile-owned status adapter."
          kicker="Runtime Observation"
          statusLabel={
            devIntegrationRuntimeLabels[
              dashboard.runtime.observation.state
            ]
          }
          statusTone={
            devIntegrationRuntimeTones[
              dashboard.runtime.observation.state
            ]
          }
          title="Current runtime state"
        />
        <TerasMetadataList
          items={[
            {
              label: "Observed",
              value: formatDevIntegrationObservedAt(
                dashboard.runtime.observation.observedAt,
              ),
            },
            {
              label: "Evidence",
              value:
                dashboard.runtime.observation.sourceRef ??
                "No source reference",
            },
          ]}
          topOffset="compact"
        />
      </TerasPanel>

      <TerasPanel fit="content" frame="padded" treatment="neutral">
        <TerasPanelHeader
          description="Stable execution and persistence contract for runtime commands."
          kicker="Runtime Boundary"
          title="Declared execution profile"
        />
        <TerasMetadataList
          items={[
            {
              label: "Platform",
              value: profile.runtime.platform,
            },
            {
              label: "State model",
              value:
                devIntegrationStateModelLabels[
                  dashboard.runtime.stateModel
                ],
            },
            {
              label: "Write class",
              value:
                devIntegrationWriteClassLabels[
                  profile.expectedWrites.classification
                ],
            },
            {
              label: "Persistence",
              value: profile.persistence
                ? "Retained runtime state"
                : "Disposable runtime state",
            },
          ]}
        />
      </TerasPanel>
    </TerasContentFrame>
  );
}

export function ProfileRuntimeDock({
  onRetryOperation,
  onSubmitProfileAction,
  operations,
  profile,
  receipts,
}: {
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onSubmitProfileAction: (
    profileId: string,
    action: DevIntegrationProfileAction,
  ) => Promise<unknown>;
  operations: readonly EnvironmentLifecycleOperation[];
  profile: DevIntegrationProfile;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const dashboard = buildDevIntegrationProfileDashboard(profile, []);
  const runtimeActions = dashboard.runtime.actions.filter(
    (action) => action.action !== "promote-check",
  );
  const [actionInFlight, setActionInFlight] =
    useState<DevIntegrationProfileAction | null>(null);
  const [resetGuardOpen, setResetGuardOpen] = useState(false);
  const enabledActionCount = runtimeActions.filter(
    (action) => action.enabled,
  ).length;

  async function submitAction(action: DevIntegrationProfileAction) {
    setActionInFlight(action);
    try {
      await onSubmitProfileAction(profile.profileId, action);
    } finally {
      setActionInFlight(null);
      setResetGuardOpen(false);
    }
  }

  return (
    <>
      <TerasContentFrame fill variant="standard">
        <TerasPanel
          fit="content"
          frame="padded"
          treatment="rail"
          tone={enabledActionCount > 0 ? "info" : "muted"}
        >
          <TerasPanelHeader
            description="Run actions admitted by the current profile lifecycle and runtime state."
            kicker="Runtime Controls"
            statusLabel={`${enabledActionCount}/${runtimeActions.length} available`}
            statusTone={enabledActionCount > 0 ? "info" : "muted"}
            title="Profile commands"
          />
          {runtimeActions.length > 0 ? (
            <TerasFieldGrid columns={2} spacing="compact">
              {runtimeActions.map((action) => (
                <TerasActionButton
                  disabled={!action.enabled || actionInFlight !== null}
                  emphasis="secondary"
                  key={action.action}
                  onClick={() => {
                    if (action.action === "reset") {
                      setResetGuardOpen(true);
                      return;
                    }
                    void submitAction(action.action);
                  }}
                  title={
                    action.enabled
                      ? undefined
                      : action.unavailableReason ?? undefined
                  }
                  tone={action.destructive ? "danger" : "accent"}
                >
                  {actionInFlight === action.action
                    ? "Running"
                    : action.label}
                </TerasActionButton>
              ))}
            </TerasFieldGrid>
          ) : (
            <TerasEmptyState>
              This profile lifecycle does not expose runtime actions.
            </TerasEmptyState>
          )}
        </TerasPanel>

        <EnvironmentOperationLogPanel
          actionScope={runtimeOperationActions}
          description="Run a profile command to record adapter events and its immutable receipt."
          kicker="Runtime Command Log"
          onRetry={onRetryOperation}
          operations={operations}
          receipts={receipts}
          subjectRef={environmentProfileSubjectRef(profile.profileId)}
          title="Runtime Command Events"
        />
      </TerasContentFrame>

      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="compact"
        actions={
          <>
            <TerasActionButton
              emphasis="secondary"
              onClick={() => setResetGuardOpen(false)}
            >
              Cancel
            </TerasActionButton>
            <TerasActionButton
              disabled={actionInFlight !== null}
              onClick={() => void submitAction("reset")}
              tone="danger"
            >
              Reset runtime
            </TerasActionButton>
          </>
        }
        description={
          profile.persistence?.destructiveResetSemantics ??
          "Reset clears the disposable local runtime state declared by this profile."
        }
        kicker="Destructive Action"
        onClose={() => setResetGuardOpen(false)}
        open={resetGuardOpen}
        role="alertdialog"
        title="Reset local runtime?"
      >
        <TerasMetadataList
          items={[
            { label: "Profile", value: profile.profileId },
            {
              label: "State model",
              value:
                devIntegrationStateModelLabels[
                  profile.runtime.stateModel
                ],
            },
          ]}
        />
      </TerasDialog>
    </>
  );
}
