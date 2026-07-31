import type { TerasMetadataItem } from "@/teras";

import { modelProfileAvailability } from "../../read-model/selectors/model-profile-selectors.ts";
import type {
  ModelAccessPlaneProjection,
  ModelProfileAvailability,
  ModelProfileLifecycle,
  ModelProfileRecord,
} from "../../read-model/types/model-operations-types.ts";
import {
  modelProfileAvailabilityLabel,
  modelProfileLifecycleLabel,
  modelProfileResolutionLabel,
} from "../shared/model-profile-display-model.ts";

export type ModelProfileLifecycleFilter = ModelProfileLifecycle | "all";
export type ModelProfileAccessFilter = ModelProfileAvailability | "all";
export type ModelProfileProviderFilter = string;

export function modelProfileSelectedMetadata(
  profile: ModelProfileRecord,
): TerasMetadataItem[] {
  return [
    { label: "Profile", value: profile.policy.profileId },
    { label: "Provider", value: profile.policy.provider },
    { label: "Callers", value: String(profile.consumers.length) },
    { label: "Upstream", value: modelProfileResolutionLabel(profile) },
  ];
}

export function modelAccessPlaneMetadata(
  accessPlane: ModelAccessPlaneProjection,
): TerasMetadataItem[] {
  return [
    { label: "Status", value: accessPlane.status },
    {
      label: "Activation",
      value: accessPlane.activationAllowed ? "allowed" : "blocked",
    },
    { label: "Credential Owner", value: accessPlane.credentialOwner },
  ];
}

export function modelProfileLifecycleOptions(profiles: ModelProfileRecord[]) {
  return [
    { label: "All lifecycle", value: "all" as const },
    ...Array.from(
      new Set(profiles.map((profile) => profile.policy.lifecycle)),
    ).map((lifecycle) => ({
      label: modelProfileLifecycleLabel(lifecycle),
      value: lifecycle,
    })),
  ];
}

export function modelProfileAccessOptions(profiles: ModelProfileRecord[]) {
  return [
    { label: "All access", value: "all" as const },
    ...Array.from(new Set(profiles.map(modelProfileAvailability))).map(
      (availability) => ({
        label: modelProfileAvailabilityLabel(availability),
        value: availability,
      }),
    ),
  ];
}

export function modelProfileProviderOptions(profiles: ModelProfileRecord[]) {
  return [
    { label: "All providers", value: "all" },
    ...Array.from(
      new Set(profiles.map((profile) => profile.policy.provider)),
    ).map((provider) => ({ label: provider, value: provider })),
  ];
}

export function filterModelProfiles({
  access,
  lifecycle,
  profiles,
  provider,
  search,
}: {
  access: ModelProfileAccessFilter;
  lifecycle: ModelProfileLifecycleFilter;
  profiles: ModelProfileRecord[];
  provider: ModelProfileProviderFilter;
  search: string;
}) {
  const query = search.trim().toLowerCase();

  return profiles.filter((profile) => {
    const availability = modelProfileAvailability(profile);
    const matchesAccess = access === "all" || availability === access;
    const matchesLifecycle =
      lifecycle === "all" || profile.policy.lifecycle === lifecycle;
    const matchesProvider =
      provider === "all" || profile.policy.provider === provider;
    const matchesSearch = query
      ? [
          profile.policy.profileId,
          profile.policy.purpose,
          profile.policy.provider,
          profile.policy.upstreamModel,
          profile.policy.invocationPath,
          ...profile.policy.allowedCallers,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;

    return (
      matchesAccess && matchesLifecycle && matchesProvider && matchesSearch
    );
  });
}
