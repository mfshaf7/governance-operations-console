"use client";

import { useMemo, useSyncExternalStore } from "react";

import { deliveryAttentionSource, projectDeliveryOwnerAttention } from "../../domain-workspaces/delivery";
import { orchestrationAttentionSource, projectOrchestrationOwnerAttention } from "../../domain-workspaces/orchestration";
import { portfolioAttentionSource, projectPortfolioOwnerAttention } from "../../domain-workspaces/portfolio";
import { proposalAttentionSource, projectProposalOwnerAttention } from "../../domain-workspaces/proposal";
import { prototypeAttentionSource, projectPrototypeOwnerAttention } from "../../domain-workspaces/prototype";
import { repositoryAttentionSource, projectRepositoryOwnerAttention } from "../../domain-workspaces/repository";
import type { ConsoleOwnerReads } from "../../console-integration/live-attention";
import {
  devIntegrationAttentionSource,
  governedReleaseAttentionSource,
  projectEnvironmentOwnerAttention,
} from "../../environment-lifecycle";
import {
  projectLifecycleTransitionAttentionSnapshot,
  type LifecycleTransitionLiveSnapshot,
} from "../../lifecycle-transitions";
import {
  normalizeCommandCenterAttentionSourceForRuntime,
  projectCommandCenterAttention,
} from "./command-center-attention";
import { resolveConsoleFixtureIsolation } from "../../console-integration/fixture-isolation/console-fixture-isolation";

export function useCommandCenterAttention({
  disconnectedPreview = false,
  lifecycleSnapshot = null,
  ownerReads = {},
  ownerReadAt = "",
}: {
  disconnectedPreview?: boolean;
  lifecycleSnapshot?: LifecycleTransitionLiveSnapshot | null;
  ownerReads?: ConsoleOwnerReads;
  ownerReadAt?: string;
} = {}) {
  const proposal = useAttentionSource(proposalAttentionSource);
  const repository = useAttentionSource(repositoryAttentionSource);
  const delivery = useAttentionSource(deliveryAttentionSource);
  const prototype = useAttentionSource(prototypeAttentionSource);
  const portfolio = useAttentionSource(portfolioAttentionSource);
  const orchestration = useAttentionSource(orchestrationAttentionSource);
  const lifecycle = useMemo(
    () =>
      projectLifecycleTransitionAttentionSnapshot(lifecycleSnapshot, {
        allowSyntheticPreview: disconnectedPreview,
      }),
    [disconnectedPreview, lifecycleSnapshot],
  );
  const devIntegration = useAttentionSource(devIntegrationAttentionSource);
  const governedReleases = useAttentionSource(governedReleaseAttentionSource);

  return useMemo(() => {
    const runtimeMode = resolveConsoleFixtureIsolation({
      mode: lifecycleSnapshot?.mode ?? null,
      status: lifecycleSnapshot?.status ?? "loading",
    }).fixtureAllowed
      ? "disconnected-preview"
      : "live";
    const sources = (runtimeMode === "live" ? [
      projectProposalOwnerAttention(ownerReads.proposals),
      projectRepositoryOwnerAttention(ownerReads.repositories, ownerReads.continuity),
      projectDeliveryOwnerAttention(ownerReads.delivery),
      projectPrototypeOwnerAttention(ownerReads.prototypes),
      projectPortfolioOwnerAttention(ownerReads.continuity),
      projectOrchestrationOwnerAttention(ownerReads.orchestration),
      lifecycle,
      projectEnvironmentOwnerAttention(ownerReads.platform, "dev-integration"),
      projectEnvironmentOwnerAttention(ownerReads.platform, "governed-releases"),
    ] : [
      proposal,
      repository,
      delivery,
      prototype,
      portfolio,
      orchestration,
      lifecycle,
      devIntegration,
      governedReleases,
    ]).map((source) =>
      normalizeCommandCenterAttentionSourceForRuntime(source, runtimeMode),
    );
    const projectedAt =
      sources
        .map((source) => source.source.projectedAt)
        .sort()
        .at(-1) ?? "2026-07-28T00:00:00.000Z";

    return projectCommandCenterAttention(sources, projectedAt);
  }, [
    ownerReads,
    ownerReadAt,
    delivery,
    devIntegration,
    governedReleases,
    lifecycle,
    orchestration,
    portfolio,
    proposal,
    prototype,
    repository,
    disconnectedPreview,
    lifecycleSnapshot?.mode,
  ]);
}

function useAttentionSource(
  source:
    | typeof deliveryAttentionSource
    | typeof devIntegrationAttentionSource
    | typeof governedReleaseAttentionSource
    | typeof orchestrationAttentionSource
    | typeof portfolioAttentionSource
    | typeof proposalAttentionSource
    | typeof prototypeAttentionSource
    | typeof repositoryAttentionSource,
) {
  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
}
