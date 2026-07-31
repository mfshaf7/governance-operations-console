import {
  TerasActionButton,
  TerasSelectedPanel,
} from "@/teras";

import type { DevIntegrationProfile } from "../../../model/dev-integration-profile";
import {
  devIntegrationLaneLabels,
  devIntegrationLifecycleLabels,
  devIntegrationLifecycleTones,
  devIntegrationPromoteCheckLabels,
  devIntegrationRuntimeLabels,
} from "../dev-integration-labels";

export function DevIntegrationSelectedProfile({
  onOpenDashboard,
  profile,
}: {
  onOpenDashboard: (profile: DevIntegrationProfile) => void;
  profile: DevIntegrationProfile | null;
}) {
  const tone = profile
    ? devIntegrationLifecycleTones[profile.lifecycle]
    : "muted";

  return (
    <TerasSelectedPanel
      action={
        profile
          ? {
              description:
                profile.nextMove?.reason ??
                "Inspect the profile contract, runtime controls, and stage handoff evidence.",
              kicker: profile.nextMove ? "Required Move" : "Profile Control",
              node: (
                <TerasActionButton
                  emphasis="primary"
                  onClick={() => onOpenDashboard(profile)}
                >
                  Open Profile Dashboard
                </TerasActionButton>
              ),
              title: profile.nextMove?.label ?? "Review profile operation",
            }
          : null
      }
      description={
        profile?.purpose ??
        "Select a profile to inspect its lifecycle, runtime, and handoff posture."
      }
      meta={
        profile
          ? [
              { label: "Owner", value: profile.ownerRepo },
              {
                label: "Lane",
                value: devIntegrationLaneLabels[profile.laneClass],
              },
              {
                label: "Runtime",
                value:
                  devIntegrationRuntimeLabels[
                    profile.runtime.observation.state
                  ],
              },
              {
                label: "Stage handoff",
                value:
                  devIntegrationPromoteCheckLabels[profile.stageHandoff.result],
              },
            ]
          : []
      }
      kicker="Selected Profile"
      selected={Boolean(profile)}
      status={{
        label: profile
          ? devIntegrationLifecycleLabels[profile.lifecycle]
          : "No selection",
        tone,
      }}
      title={profile?.profileId ?? "Select a profile"}
      tone={tone}
      variant="compact"
    />
  );
}
