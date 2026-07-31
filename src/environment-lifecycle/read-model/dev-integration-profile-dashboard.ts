import {
  devIntegrationProfileActionLabel,
  devIntegrationProfileActionAvailability,
  type DevIntegrationProfile,
  type DevIntegrationProfileAction,
} from "../model/dev-integration-profile.ts";
import {
  selectDevIntegrationProfileHistory,
  type DevIntegrationProfileHistoryEvent,
} from "../model/dev-integration-profile-history.ts";

const ACTION_ORDER = [
  "up",
  "status",
  "access",
  "smoke",
  "down",
  "reset",
  "promote-check",
] as const satisfies readonly DevIntegrationProfileAction[];

export type DevIntegrationProfileDashboard = Readonly<{
  handoff: DevIntegrationProfile["stageHandoff"];
  history: readonly DevIntegrationProfileHistoryEvent[];
  overview: Readonly<{
    admissionRefs: readonly string[];
    dependencies: readonly string[];
    expectedWrites: DevIntegrationProfile["expectedWrites"];
    laneClass: DevIntegrationProfile["laneClass"];
    nextMove: DevIntegrationProfile["nextMove"];
    ownerRepo: string;
    participatingRepos: readonly string[];
    profileId: string;
    purpose: string;
    runtime: DevIntegrationProfile["runtime"];
    securityOwner: string;
    securityTriggers: DevIntegrationProfile["securityTriggers"];
  }>;
  runtime: Readonly<{
    actions: readonly Readonly<{
      action: DevIntegrationProfileAction;
      destructive: boolean;
      enabled: boolean;
      label: string;
      unavailableReason: string | null;
    }>[];
    observation: DevIntegrationProfile["runtime"]["observation"];
    stateModel: DevIntegrationProfile["runtime"]["stateModel"];
  }>;
}>;

export function buildDevIntegrationProfileDashboard(
  profile: DevIntegrationProfile,
  historyEvents: readonly DevIntegrationProfileHistoryEvent[],
): DevIntegrationProfileDashboard {
  return {
    handoff: profile.stageHandoff,
    history: selectDevIntegrationProfileHistory(
      historyEvents,
      profile.profileId,
    ),
    overview: {
      admissionRefs: profile.admissionRefs,
      dependencies: profile.dependencies,
      expectedWrites: profile.expectedWrites,
      laneClass: profile.laneClass,
      nextMove: profile.nextMove,
      ownerRepo: profile.ownerRepo,
      participatingRepos: profile.participatingRepos,
      profileId: profile.profileId,
      purpose: profile.purpose,
      runtime: profile.runtime,
      securityOwner: profile.securityOwner,
      securityTriggers: profile.securityTriggers,
    },
    runtime: {
      actions: ACTION_ORDER.filter((action) =>
        profile.actions.includes(action),
      ).map((action) => {
        const availability =
          devIntegrationProfileActionAvailability(profile, action);

        return {
          action,
          destructive: action === "reset",
          enabled: availability.allowed,
          label: devIntegrationProfileActionLabel(profile, action),
          unavailableReason: availability.reason,
        };
      }),
      observation: profile.runtime.observation,
      stateModel: profile.runtime.stateModel,
    },
  };
}
