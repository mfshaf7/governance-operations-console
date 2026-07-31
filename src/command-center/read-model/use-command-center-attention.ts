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
import { lifecycleTransitionAttentionSource } from "../../lifecycle-transitions";
import { projectCommandCenterAttention } from "./command-center-attention";

export function useCommandCenterAttention() {
  const proposal = useAttentionSource(proposalAttentionSource);
  const repository = useAttentionSource(repositoryAttentionSource);
  const delivery = useAttentionSource(deliveryAttentionSource);
  const prototype = useAttentionSource(prototypeAttentionSource);
  const portfolio = useAttentionSource(portfolioAttentionSource);
  const orchestration = useAttentionSource(orchestrationAttentionSource);
  const lifecycle = useAttentionSource(lifecycleTransitionAttentionSource);
  const devIntegration = useAttentionSource(devIntegrationAttentionSource);
  const governedReleases = useAttentionSource(governedReleaseAttentionSource);

  return useMemo(() => {
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
    ];
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
  ]);
}

function useAttentionSource(
  source:
    | typeof deliveryAttentionSource
    | typeof devIntegrationAttentionSource
    | typeof governedReleaseAttentionSource
    | typeof lifecycleTransitionAttentionSource
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
