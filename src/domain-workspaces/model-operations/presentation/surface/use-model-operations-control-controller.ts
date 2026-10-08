"use client";

import { useMemo, useState } from "react";

import { unavailableModelOperationsReadModel } from "../../live-runtime/model-operations-live-projection.ts";
import { useModelOperationsLiveRuntime } from "../../live-runtime/use-model-operations-live-runtime.ts";
import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../../live-runtime/model-operations-live-types.ts";
import { modelOperationsReadModel } from "../../read-model/model-operations-read-model.ts";
import type { ModelProfileRecord } from "../../read-model/types/model-operations-types.ts";
import {
  emptyModelProfileRequestDraft,
  type ModelProfileRequestStep,
} from "../../work-model/profile-requests/model-profile-request-model.ts";
import {
  filterModelProfiles,
  modelProfileAccessOptions,
  modelProfileLifecycleOptions,
  modelProfileProviderOptions,
  type ModelProfileAccessFilter,
  type ModelProfileLifecycleFilter,
} from "./model-operations-control-view-model.ts";

export function useModelOperationsControlController() {
  const liveRuntime = useModelOperationsLiveRuntime();
  const readModel =
    liveRuntime.snapshot?.readModel ??
    (liveRuntime.snapshot?.mode === "live"
      ? unavailableModelOperationsReadModel(
          liveRuntime.snapshot.error ?? "Model Operations live authority is unavailable.",
        )
      : modelOperationsReadModel);
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] =
    useState<ModelProfileLifecycleFilter>("all");
  const [access, setAccess] = useState<ModelProfileAccessFilter>("all");
  const [provider, setProvider] = useState("all");
  const [selectedProfileId, setSelectedProfileId] = useState(
    readModel.profiles[0]?.policy.profileId ?? null,
  );
  const [dashboardProfile, setDashboardProfile] =
    useState<ModelProfileRecord | null>(null);
  const [requestSupportOpen, setRequestSupportOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestStep, setRequestStep] = useState<ModelProfileRequestStep>("intent");
  const [requestDraft, setRequestDraft] = useState<ModelProfileRequestDraft>(() =>
    emptyModelProfileRequestDraft(),
  );
  const [requestResult, setRequestResult] =
    useState<ModelProfileRequestProjection | null>(null);
  const [localRuntimeOpen, setLocalRuntimeOpen] = useState(false);

  const filteredProfiles = useMemo(
    () =>
      filterModelProfiles({
        access,
        lifecycle,
        profiles: readModel.profiles,
        provider,
        search,
      }),
    [access, lifecycle, provider, readModel.profiles, search],
  );
  const selectedProfile =
    readModel.profiles.find(
      (profile) => profile.policy.profileId === selectedProfileId,
    ) ??
    filteredProfiles[0] ??
    readModel.profiles[0] ??
    null;

  const openRequest = () => {
    setRequestDraft(
      emptyModelProfileRequestDraft(
        `model-profile-request:console-${globalThis.crypto.randomUUID()}`,
      ),
    );
    setRequestResult(null);
    setRequestStep("intent");
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    const result = await liveRuntime.submitCreate(requestDraft);
    setRequestResult(result);
    setRequestStep("receipt");
  };

  return {
    dashboard: {
      close: () => setDashboardProfile(null),
      open: (profile: ModelProfileRecord) => setDashboardProfile(profile),
      profile: dashboardProfile,
    },
    filters: {
      access,
      accessOptions: modelProfileAccessOptions(
        readModel.profiles,
      ),
      lifecycle,
      lifecycleOptions: modelProfileLifecycleOptions(
        readModel.profiles,
      ),
      onAccessChange: setAccess,
      onLifecycleChange: setLifecycle,
      onProviderChange: setProvider,
      onSearchChange: setSearch,
      provider,
      providerOptions: modelProfileProviderOptions(
        readModel.profiles,
      ),
      search,
    },
    localRuntime: {
      close: () => setLocalRuntimeOpen(false),
      open: localRuntimeOpen,
      show: () => setLocalRuntimeOpen(true),
    },
    profiles: {
      all: readModel.profiles,
      filtered: filteredProfiles,
    },
    readModel,
    request: {
      available:
        liveRuntime.snapshot?.mode === "live" &&
        liveRuntime.snapshot.status === "current",
      close: () => setRequestOpen(false),
      draft: requestDraft,
      error: liveRuntime.error,
      latest: liveRuntime.snapshot?.requests.at(-1) ?? null,
      onStepChange: setRequestStep,
      open: requestOpen,
      pending: liveRuntime.pending,
      result: requestResult,
      show: openRequest,
      step: requestStep,
      submit: submitRequest,
      updateDraft: <TKey extends keyof ModelProfileRequestDraft>(
        key: TKey,
        value: ModelProfileRequestDraft[TKey],
      ) => setRequestDraft((current) => ({ ...current, [key]: value })),
    },
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
