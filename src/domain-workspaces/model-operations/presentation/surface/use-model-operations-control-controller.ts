"use client";
import { useWorkspaceViewState } from "../../../../console-integration/registers/workspace-view-state.ts";

import { useMemo, useState } from "react";

import {
  consoleActionExecutable,
  resolveConsoleFixtureIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";
import { unavailableModelOperationsReadModel } from "../../live-runtime/model-operations-live-projection.ts";
import { useModelOperationsLiveRuntime } from "../../live-runtime/use-model-operations-live-runtime.ts";
import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../../live-runtime/model-operations-live-types.ts";
import {useModelProfileRequestOptions} from "../../live-runtime/use-model-profile-request-options.ts";
import {modelProfileOptionsPreview} from "../../read-model/fixtures/model-review-preview.fixture.ts";
import {modelProfileDraftFromRequest} from "../../work-model/profile-requests/model-profile-review-model.ts";
import {modelProfileRequestsPreview} from "../../read-model/fixtures/model-review-preview.fixture.ts";
import { modelOperationsReadModel } from "../../read-model/model-operations-read-model.ts";
import type { ModelProfileRecord } from "../../read-model/types/model-operations-types.ts";
import {
  emptyModelProfileRequestDraft,
} from "../../work-model/profile-requests/model-profile-request-model.ts";
import {
  filterModelProfiles,
  modelProfileAccessOptions,
  modelProfileLifecycleOptions,
  modelProfileProviderOptions,
  type ModelProfileAccessFilter,
  type ModelProfileLifecycleFilter,
} from "./model-operations-control-view-model.ts";

export function useModelOperationsControlController(enabled = true) {
  const liveRuntime = useModelOperationsLiveRuntime(enabled);
  const fixtureIsolation = resolveConsoleFixtureIsolation({
    mode: liveRuntime.snapshot?.mode ?? null,
    status: liveRuntime.snapshot?.status ?? "loading",
  });
  const readModel =
    selectConsoleAuthorityProjection({
      decision: fixtureIsolation,
      fixture: modelOperationsReadModel,
      live: liveRuntime.snapshot?.readModel ?? null,
    }) ??
    unavailableModelOperationsReadModel(
      liveRuntime.snapshot?.error ??
        "Model Operations source state is still loading.",
    );
  const [search, setSearch] = useWorkspaceViewState('model-profiles:search', "");
  const [lifecycle, setLifecycle] =
    useWorkspaceViewState<ModelProfileLifecycleFilter>('model-profiles:lifecycle', "all");
  const [access, setAccess] = useWorkspaceViewState<ModelProfileAccessFilter>('model-profiles:access', "all");
  const [provider, setProvider] = useWorkspaceViewState('model-profiles:provider', "all");
  const [selectedProfileId, setSelectedProfileId] = useWorkspaceViewState('model-profiles:selectedProfileId',
    readModel.profiles[0]?.policy.profileId ?? null,
  );
  const [dashboardProfileId, setDashboardProfileId] = useState<string | null>(null);
  const dashboardProfile = readModel.profiles.find(
    (profile) => profile.policy.profileId === dashboardProfileId,
  ) ?? null;
  const [requestSupportOpen, setRequestSupportOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDraft, setRequestDraft] = useState<ModelProfileRequestDraft>(() =>
    emptyModelProfileRequestDraft(),
  );
  const [requestResult, setRequestResult] =
    useState<ModelProfileRequestProjection | null>(null);

  const requestOptions=useModelProfileRequestOptions(requestOpen,fixtureIsolation.fixtureAllowed);
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
    if (liveRuntime.pending) return;
    if (requestDraft.requestId && !requestResult && Object.entries(requestDraft).some(([key,value])=>key!=="requestId" && key!=="environment" && key!=="dataClassification" && String(value).trim())) {
      setRequestOpen(true); return;
    }
    const id=`model-profile-request:console-${globalThis.crypto.randomUUID()}`;
    setRequestDraft(fixtureIsolation.fixtureAllowed ? {...modelProfileDraftFromRequest(modelProfileRequestsPreview()[0]),requestId:id,workflowId:modelProfileOptionsPreview().workflows[0].workflow_id,setupDigest:modelProfileOptionsPreview().workflows[0].setup_digest,operationalExpectations:""} : emptyModelProfileRequestDraft(id));
    setRequestResult(null);
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if(!consoleActionExecutable(fixtureIsolation,"durable-command")||!liveRuntime.current||liveRuntime.snapshot?.status!=="current")return;
    const result = await liveRuntime.submitCreate(requestDraft);
    setRequestResult(result);
  };

  return {
    dashboard: {
      close: () => setDashboardProfileId(null),
      open: (profile: ModelProfileRecord) => setDashboardProfileId(profile.policy.profileId),
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
    profiles: {
      all: readModel.profiles,
      filtered: filteredProfiles,
    },
    readModel,
    source: {
      loading: !liveRuntime.snapshot,
      revalidating: !fixtureIsolation.fixtureAllowed && liveRuntime.snapshot?.status === "current" && !liveRuntime.current,
      unavailable: liveRuntime.snapshot?.status === "offline",
      refresh: liveRuntime.refresh,
      description: fixtureIsolation.fixtureAllowed
        ? "Disconnected design preview; these sample profiles are not current Platform state."
        : liveRuntime.snapshot?.status === "offline"
          ? liveRuntime.snapshot.error ?? "Current Purpose profile evidence is unavailable."
          : !liveRuntime.current && liveRuntime.snapshot
            ? "Showing the last loaded profiles while checking current source state."
            : "Canonical profile records and caller-specific readiness projections.",
    },
    request: {
      preview: fixtureIsolation.fixtureAllowed,
      options:requestOptions,
      submitAvailable:consoleActionExecutable(fixtureIsolation,"durable-command")&&liveRuntime.current&&liveRuntime.snapshot?.status==="current",
      inspectSampleResult:()=>{if(fixtureIsolation.fixtureAllowed){setRequestResult(modelProfileRequestsPreview()[0]);}},
      available: fixtureIsolation.fixtureAllowed ||
        consoleActionExecutable(fixtureIsolation, "durable-command") &&
        liveRuntime.current && liveRuntime.snapshot?.status === "current" && !liveRuntime.pending,
      recoveryId: fixtureIsolation.fixtureAllowed ? null : liveRuntime.recoveryId,
      onRecovered: (request:ModelProfileRequestProjection) => {liveRuntime.clearRecovery(request.request_id);if(requestDraft.requestId===request.request_id)setRequestResult(request);},
      close: () => {if(!liveRuntime.pending)setRequestOpen(false);},
      draft: requestDraft,
      error: liveRuntime.error,
      references: fixtureIsolation.fixtureAllowed ? modelProfileRequestsPreview() : liveRuntime.snapshot?.requests ?? [],
      latest: requestResult,
      all: fixtureIsolation.fixtureAllowed ? modelProfileRequestsPreview() : liveRuntime.snapshot?.requests ?? [],
      historyAvailable: fixtureIsolation.fixtureAllowed || liveRuntime.snapshot?.mode === "live",
      refresh: liveRuntime.refresh,
      open: requestOpen,
      pending: liveRuntime.pending,
      result: requestResult,
      show: openRequest,
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
