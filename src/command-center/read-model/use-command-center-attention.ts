"use client";

import { useMemo, useSyncExternalStore } from "react";

import { deliveryAttentionSource } from "../../domain-workspaces/delivery";
import { orchestrationAttentionSource } from "../../domain-workspaces/orchestration";
import { portfolioAttentionSource } from "../../domain-workspaces/portfolio";
import { proposalAttentionSource } from "../../domain-workspaces/proposal";
import { prototypeAttentionSource } from "../../domain-workspaces/prototype";
import { repositoryAttentionSource } from "../../domain-workspaces/repository";
import {
  devIntegrationAttentionSource,
  governedReleaseAttentionSource,
} from "../../environment-lifecycle";
import {
  projectLifecycleTransitionAttentionSnapshot,
  type LifecycleTransitionLiveSnapshot,
} from "../../lifecycle-transitions";
import {
  normalizeCommandCenterAttentionSourceForRuntime,
  projectCommandCenterAttention,
} from "./command-center-attention";

export function useCommandCenterAttention({
  disconnectedPreview = false,
  lifecycleSnapshot = null,
}: {
  disconnectedPreview?: boolean;
  lifecycleSnapshot?: LifecycleTransitionLiveSnapshot | null;
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
    const runtimeMode =
      disconnectedPreview || lifecycleSnapshot?.mode === "disconnected-preview"
        ? "disconnected-preview"
        : "live";
    const sources = [
      proposal,
      repository,
      delivery,
      prototype,
      portfolio,
      orchestration,
      lifecycle,
      devIntegration,
      governedReleases,
    ].map((source) =>
      normalizeCommandCenterAttentionSourceForRuntime(source, runtimeMode),
    );
    const projectedAt =
      sources
        .map((source) => source.source.projectedAt)
        .sort()
        .at(-1) ?? "2026-07-28T00:00:00.000Z";

    return projectCommandCenterAttention(sources, projectedAt);
  }, [
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
