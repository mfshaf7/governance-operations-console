import {
  TerasActionButton,
  TerasActionRow,
  TerasContentFrame,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type { DevIntegrationProfile } from "../../../model/dev-integration-profile";
import { buildDevIntegrationProfileDashboard } from "../../../read-model/dev-integration-profile-dashboard";
import { formatDevIntegrationObservedAt } from "../dev-integration-formatters";
import {
  devIntegrationLaneLabels,
  devIntegrationRuntimeLabels,
  devIntegrationRuntimeTones,
  devIntegrationStateModelLabels,
  devIntegrationWriteClassLabels,
} from "../dev-integration-labels";

export function ProfileOverviewStage({
  onOpenSupportDetails,
  profile,
}: {
  onOpenSupportDetails: () => void;
  profile: DevIntegrationProfile;
}) {
  const overview = buildDevIntegrationProfileDashboard(profile, []).overview;

  return (
    <TerasContentFrame fill variant="standard">
      <TerasPanel fit="content" frame="padded" treatment="neutral">
        <TerasPanelHeader
          description="Request identity and source authority carried by this profile."
          kicker="Profile Contract"
          title="Identity and provenance"
        />
        <TerasMetadataList
          columns={2}
          items={[
            {
              label: "Lane",
              value: devIntegrationLaneLabels[overview.laneClass],
            },
            {
              label: "Request record",
              value: profile.requestRecordRef,
            },
            {
              detail: profile.source.provenance,
              label: "Source",
              value: profile.source.source,
            },
            {
              label: "Source observed",
              value: formatDevIntegrationObservedAt(
                profile.source.observedAt,
              ),
            },
          ]}
        />
      </TerasPanel>

      <TerasPanel
        fit="content"
        frame="padded"
        layout="header-body-footer"
        treatment="neutral"
      >
        <TerasPanelHeader
          description="Runtime shape, write boundary, and review ownership."
          kicker="Runtime Contract"
          title="Declared support boundary"
        />
        <TerasMetadataList
          items={[
            {
              label: "Platform",
              value: overview.runtime.platform,
            },
            {
              label: "State model",
              value:
                devIntegrationStateModelLabels[
                  overview.runtime.stateModel
                ],
            },
            {
              label: "Write class",
              value:
                devIntegrationWriteClassLabels[
                  overview.expectedWrites.classification
                ],
            },
            {
              label: "Security owner",
              value: overview.securityOwner,
            },
          ]}
        />
        <TerasActionRow spacing="normal">
          <TerasActionButton
            emphasis="secondary"
            onClick={onOpenSupportDetails}
          >
            View Support Details
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>
    </TerasContentFrame>
  );
}

export function ProfileOverviewDock({
  onOpenRuntime,
  onOpenStageHandoff,
  profile,
}: {
  onOpenRuntime: () => void;
  onOpenStageHandoff: () => void;
  profile: DevIntegrationProfile;
}) {
  const overview = buildDevIntegrationProfileDashboard(profile, []).overview;
  const runtimeAction = profile.actions.find(
    (action) => action === overview.nextMove?.actionId,
  );
  const stageHandoffMove =
    overview.nextMove?.actionId === "promote-check" ||
    overview.nextMove?.actionId === "review-promote-check" ||
    overview.nextMove?.actionId === "review-stage-handoff";
  const requiredMoveRoute =
    stageHandoffMove
      ? {
          label: "Open Stage Handoff",
          onOpen: onOpenStageHandoff,
        }
      : runtimeAction
        ? {
            label: "Open Runtime Controls",
            onOpen: onOpenRuntime,
          }
        : null;

  return (
    <TerasContentFrame fill variant="standard">
      <TerasPanel
        fit="content"
        frame="padded"
        layout={
          requiredMoveRoute
            ? "header-body-footer"
            : "header-body"
        }
        treatment="rail"
        tone={overview.nextMove ? "info" : "muted"}
      >
        <TerasPanelHeader
          description={
            overview.nextMove?.reason ??
            "No required move is currently projected."
          }
          kicker="Current Required Move"
          title={overview.nextMove?.label ?? "No action required"}
        />
        {overview.nextMove ? (
          <TerasMetadataList
            columns={1}
            items={[
              {
                label: "Owner",
                value: overview.nextMove.ownerRef,
              },
            ]}
            topOffset="compact"
          />
        ) : null}
        {requiredMoveRoute ? (
          <TerasActionRow spacing="normal">
            <TerasActionButton
              emphasis="primary"
              onClick={requiredMoveRoute.onOpen}
            >
              {requiredMoveRoute.label}
            </TerasActionButton>
          </TerasActionRow>
        ) : null}
      </TerasPanel>

      <TerasPanel
        fit="content"
        frame="padded"
        treatment="rail"
        tone={
          devIntegrationRuntimeTones[
            overview.runtime.observation.state
          ]
        }
      >
        <TerasPanelHeader
          description="Latest profile-owned runtime observation."
          kicker="Runtime Observation"
          statusLabel={
            devIntegrationRuntimeLabels[
              overview.runtime.observation.state
            ]
          }
          statusTone={
            devIntegrationRuntimeTones[
              overview.runtime.observation.state
            ]
          }
          title="Current state"
        />
        <TerasMetadataList
          columns={1}
          items={[
            {
              label: "Observed",
              value: formatDevIntegrationObservedAt(
                overview.runtime.observation.observedAt,
              ),
            },
            {
              label: "Observation source",
              value:
                overview.runtime.observation.sourceRef ??
                "No observation source",
            },
          ]}
          topOffset="compact"
        />
      </TerasPanel>
    </TerasContentFrame>
  );
}
