"use client";

import { useMemo, useState } from "react";

import { modelOperationsReadModel } from "../../read-model/model-operations-read-model.ts";
import type { ModelProfileRecord } from "../../read-model/types/model-operations-types.ts";
import {
  filterModelProfiles,
  modelProfileAccessOptions,
  modelProfileLifecycleOptions,
  modelProfileProviderOptions,
  type ModelProfileAccessFilter,
  type ModelProfileLifecycleFilter,
} from "./model-operations-control-view-model.ts";

export function useModelOperationsControlController() {
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] =
    useState<ModelProfileLifecycleFilter>("all");
  const [access, setAccess] = useState<ModelProfileAccessFilter>("all");
  const [provider, setProvider] = useState("all");
  const [selectedProfileId, setSelectedProfileId] = useState(
    modelOperationsReadModel.profiles[0]?.policy.profileId ?? null,
  );
  const [dashboardProfile, setDashboardProfile] =
    useState<ModelProfileRecord | null>(null);
  const [requestSupportOpen, setRequestSupportOpen] = useState(false);
  const [localRuntimeOpen, setLocalRuntimeOpen] = useState(false);

  const filteredProfiles = useMemo(
    () =>
      filterModelProfiles({
        access,
        lifecycle,
        profiles: modelOperationsReadModel.profiles,
        provider,
        search,
      }),
    [access, lifecycle, provider, search],
  );
  const selectedProfile =
    modelOperationsReadModel.profiles.find(
      (profile) => profile.policy.profileId === selectedProfileId,
    ) ??
    filteredProfiles[0] ??
    modelOperationsReadModel.profiles[0] ??
    null;

  return {
    dashboard: {
      close: () => setDashboardProfile(null),
      open: (profile: ModelProfileRecord) => setDashboardProfile(profile),
      profile: dashboardProfile,
    },
    filters: {
      access,
      accessOptions: modelProfileAccessOptions(
        modelOperationsReadModel.profiles,
      ),
      lifecycle,
      lifecycleOptions: modelProfileLifecycleOptions(
        modelOperationsReadModel.profiles,
      ),
      onAccessChange: setAccess,
      onLifecycleChange: setLifecycle,
      onProviderChange: setProvider,
      onSearchChange: setSearch,
      provider,
      providerOptions: modelProfileProviderOptions(
        modelOperationsReadModel.profiles,
      ),
      search,
    },
    localRuntime: {
      close: () => setLocalRuntimeOpen(false),
      open: localRuntimeOpen,
      show: () => setLocalRuntimeOpen(true),
    },
    profiles: {
      all: modelOperationsReadModel.profiles,
      filtered: filteredProfiles,
    },
    readModel: modelOperationsReadModel,
    requestSupport: {
      close: () => setRequestSupportOpen(false),
      open: requestSupportOpen,
      show: () => setRequestSupportOpen(true),
    },
    selectedProfile,
    selectProfile: (profile: ModelProfileRecord) =>
      setSelectedProfileId(profile.policy.profileId),
  };
}
