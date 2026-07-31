import {
  TerasContentTray,
  TerasMetadataList,
  TerasPanelStack,
  TerasReadoutField,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import type {
  DevIntegrationProfileRequestDraft,
} from "../../../work-model/profile-request/dev-integration-profile-request-draft";
import {
  devIntegrationLaneLabels,
  devIntegrationStateModelLabels,
  devIntegrationWriteClassLabels,
} from "../dev-integration-labels";

function formatCollection(
  values: readonly string[],
  emptyLabel: string,
) {
  return values.length > 0 ? values.join(", ") : emptyLabel;
}

export function ProfileRequestReviewStep({
  draft,
}: {
  draft: DevIntegrationProfileRequestDraft;
}) {
  return (
    <TerasPanelStack fill="last">
      <TerasWizardPanel
        description="Confirm the normalized identity and runtime boundary before recording the request."
        fit="content"
        kicker="Request Review"
        title="Profile summary"
      >
        <TerasMetadataList
          columns={3}
          items={[
            { label: "Profile ID", value: draft.profileId },
            { label: "Owner", value: draft.ownerRepo },
            { label: "Purpose", value: draft.purpose },
            {
              label: "Lane",
              value: devIntegrationLaneLabels[draft.laneClass],
            },
            {
              label: "Runtime",
              value: draft.runtimePlatform,
            },
            {
              label: "State model",
              value:
                devIntegrationStateModelLabels[draft.runtimeStateModel],
            },
            {
              detail:
                draft.runtimeStateModel === "persistent"
                  ? "Shared smoke remains read-only."
                  : undefined,
              label: "Persistence",
              value:
                draft.runtimeStateModel === "persistent"
                  ? "Configured"
                  : "Not required",
            },
            {
              label: "Write class",
              value:
                devIntegrationWriteClassLabels[
                  draft.expectedWriteClassification
                ],
            },
          ]}
        />
      </TerasWizardPanel>

      <TerasWizardPanel
        description="Repository, review, and expected-write boundaries carried by the request."
        kicker="Request Scope"
        title="Participation and review"
      >
        <TerasTrayStack columns={2} spacing="normal">
          <TerasContentTray kicker="Participating Repositories">
            <TerasReadoutField
              fit="content"
              label="Repositories"
              value={formatCollection(
                draft.participatingRepos,
                "No participating repositories",
              )}
            />
          </TerasContentTray>
          <TerasContentTray kicker="Dependencies">
            <TerasReadoutField
              fit="content"
              label="Dependencies"
              value={formatCollection(
                draft.dependencies,
                "No dependencies",
              )}
            />
          </TerasContentTray>
          <TerasContentTray kicker="Security Triggers">
            <TerasReadoutField
              fit="content"
              label="Triggers"
              value={formatCollection(
                draft.securityTriggers,
                "No security triggers",
              )}
            />
          </TerasContentTray>
          <TerasContentTray kicker="Expected Write Targets">
            <TerasReadoutField
              fit="content"
              label="Targets"
              value={formatCollection(
                draft.expectedWriteTargets,
                "No write targets",
              )}
            />
          </TerasContentTray>
        </TerasTrayStack>
      </TerasWizardPanel>
    </TerasPanelStack>
  );
}
