import type {
  DevIntegrationLaneClass,
  DevIntegrationProfile,
  DevIntegrationProfileLifecycle,
} from "../model/dev-integration-profile.ts";

const PROFILE_LIFECYCLES = [
  "proposed",
  "build-admitted",
  "active",
  "suspended",
  "retired",
] as const satisfies readonly DevIntegrationProfileLifecycle[];

export type DevIntegrationProfileFilters = Readonly<{
  laneClass: DevIntegrationLaneClass | "all";
  lifecycle: DevIntegrationProfileLifecycle | "all";
  ownerRepo: string | "all";
  query: string;
}>;

export function selectDevIntegrationProfileById(
  profiles: readonly DevIntegrationProfile[],
  profileId: string,
) {
  return profiles.find((profile) => profile.profileId === profileId) ?? null;
}

export function filterDevIntegrationProfiles(
  profiles: readonly DevIntegrationProfile[],
  filters: DevIntegrationProfileFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return profiles.filter((profile) => {
    const matchesQuery =
      !query ||
      [
        profile.profileId,
        profile.ownerRepo,
        profile.purpose,
        ...profile.participatingRepos,
      ].some((value) => value.toLowerCase().includes(query));

    return (
      matchesQuery &&
      (filters.lifecycle === "all" ||
        profile.lifecycle === filters.lifecycle) &&
      (filters.laneClass === "all" ||
        profile.laneClass === filters.laneClass) &&
      (filters.ownerRepo === "all" ||
        profile.ownerRepo === filters.ownerRepo)
    );
  });
}

export function summarizeDevIntegrationProfileLifecycles(
  profiles: readonly DevIntegrationProfile[],
): Record<DevIntegrationProfileLifecycle, number> {
  const summary = Object.fromEntries(
    PROFILE_LIFECYCLES.map((lifecycle) => [lifecycle, 0]),
  ) as Record<DevIntegrationProfileLifecycle, number>;

  for (const profile of profiles) {
    summary[profile.lifecycle] += 1;
  }

  return summary;
}

export function selectSelfServeDevIntegrationProfiles(
  profiles: readonly DevIntegrationProfile[],
) {
  return profiles.filter((profile) => profile.lifecycle === "active");
}
