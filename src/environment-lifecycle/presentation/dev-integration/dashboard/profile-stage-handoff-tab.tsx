"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasContentFrame,
  TerasEmptyState,
  TerasList,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasStatusItem,
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
import {
  devIntegrationPromoteCheckLabels,
  devIntegrationPromoteCheckTones,
} from "../dev-integration-labels";

const handoffOperationActions = [
  "promote-check",
] as const satisfies readonly EnvironmentLifecycleOperation["action"][];

export function ProfileStageHandoffStage({
  profile,
}: {
  profile: DevIntegrationProfile;
}) {
  const handoff = profile.stageHandoff;

  return (
    <TerasPanelStack fill="first">
      <TerasPanel
        fit="fill"
        frame="padded"
        overflow="auto"
        treatment="neutral"
      >
        <TerasPanelHeader
          description="Checks declared by the profile contract for governed stage handoff."
          kicker="Required Evidence"
          title="Profile checks"
        />
        {handoff.requiredChecks.length > 0 ? (
          <TerasList ariaLabel="Required stage handoff checks">
            {handoff.requiredChecks.map((check, index) => {
              const result = handoff.checkResults.find(
                (candidate) => candidate.checkId === check.id,
              );

              return (
                <TerasStatusItem
                  detail={result?.evidenceRef ?? check.description}
                  index={String(index + 1).padStart(2, "0")}
                  key={check.id}
                  label={check.label}
                  status={
                    result?.status === "passed"
                      ? "Passed"
                      : result?.status === "failed"
                        ? "Failed"
                        : result?.status === "blocked"
                          ? "Blocked"
                          : "Required"
                  }
                  tone={
                    result?.status === "passed"
                      ? "ok"
                      : result?.status === "failed"
                        ? "danger"
                        : result?.status === "blocked"
                          ? "warn"
                          : "muted"
                  }
                />
              );
            })}
          </TerasList>
        ) : (
          <TerasEmptyState>
            No stage checks are declared for this profile.
          </TerasEmptyState>
        )}
      </TerasPanel>

      <TerasPanel fit="content" frame="padded" treatment="neutral">
        <TerasPanelHeader
          description="References produced by the latest local promote check."
          kicker="Handoff Artifacts"
          title="Recorded evidence"
        />
        <TerasMetadataList
          items={[
            {
              label: "Session manifest",
              value: handoff.sessionManifestRef ?? "Unavailable",
            },
            {
              label: "Smoke summary",
              value: handoff.smokeSummaryRef ?? "Unavailable",
            },
            {
              label: "Promotion report",
              value: handoff.promotionReportRef ?? "Unavailable",
            },
            {
              label: "Governed surface",
              value: handoff.governedSurface,
            },
          ]}
          topOffset="compact"
        />
      </TerasPanel>
    </TerasPanelStack>
  );
}

export function ProfileStageHandoffDock({
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
  const handoff = profile.stageHandoff;
  const [submitting, setSubmitting] = useState(false);
  const promoteCheck =
    buildDevIntegrationProfileDashboard(profile, []).runtime.actions.find(
      (action) => action.action === "promote-check",
    );

  return (
    <TerasContentFrame fill variant="standard">
      <TerasPanel
        fit="content"
        frame="padded"
        tone={devIntegrationPromoteCheckTones[handoff.result]}
        treatment="rail"
      >
        <TerasPanelHeader
          description="Review current readiness, then run the profile-owned promote check."
          kicker="Stage Handoff"
          statusLabel={devIntegrationPromoteCheckLabels[handoff.result]}
          statusTone={devIntegrationPromoteCheckTones[handoff.result]}
          title="Stage readiness"
        />
        <TerasMetadataList
          columns={1}
          items={[
            {
              label: "Owner",
              value: handoff.ownerRepo,
            },
          ]}
          topOffset="compact"
        />
        <TerasActionRow spacing="normal">
          <TerasActionButton
            disabled={!promoteCheck?.enabled || submitting}
            onClick={() => {
              setSubmitting(true);
              void onSubmitProfileAction(
                profile.profileId,
                "promote-check",
              ).finally(() => setSubmitting(false));
            }}
            title={
              promoteCheck?.enabled
                ? undefined
                : promoteCheck?.unavailableReason ?? undefined
            }
          >
            {submitting ? "Running check" : "Run Promote Check"}
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>

      <EnvironmentOperationLogPanel
        actionScope={handoffOperationActions}
        description="Run the promote check to record handoff events and its immutable receipt."
        kicker="Handoff Command Log"
        onRetry={onRetryOperation}
        operations={operations}
        receipts={receipts}
        subjectRef={environmentProfileSubjectRef(profile.profileId)}
        title="Promote Check Events"
      />
    </TerasContentFrame>
  );
}
