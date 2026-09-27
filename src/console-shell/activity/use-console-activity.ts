"use client";

import { useMemo, useSyncExternalStore } from "react";

import { deliveryActivitySource } from "@/domain-workspaces/delivery";
import { portfolioActivitySource } from "@/domain-workspaces/portfolio";
import { orchestrationActivitySource } from "@/domain-workspaces/orchestration";
import { proposalActivitySource } from "@/domain-workspaces/proposal";
import { prototypeActivitySource } from "@/domain-workspaces/prototype";
import { repositoryActivitySource } from "@/domain-workspaces/repository";
import type {
  DevIntegrationProfileHistoryEvent,
} from "@/environment-lifecycle";
import type {
  LifecycleTransitionProjection,
} from "@/lifecycle-transitions";
import { useGovernanceActivityRuntime } from "@/governance-activity/use-governance-activity-runtime";

import { projectConsoleActivity } from "./console-activity-model";
import { projectConsoleActivitySources } from "./console-activity-sources";

export function useConsoleActivity({
  environmentHistory,
  lifecycleTransitions,
}: {
  environmentHistory: readonly DevIntegrationProfileHistoryEvent[];
  lifecycleTransitions: readonly LifecycleTransitionProjection[];
}) {
  const liveRuntime = useGovernanceActivityRuntime();
  const delivery = useSyncExternalStore(
    deliveryActivitySource.subscribeRuntime,
    deliveryActivitySource.getRuntimeSnapshot,
    deliveryActivitySource.getRuntimeSnapshot,
  );
  const portfolio = useSyncExternalStore(
    portfolioActivitySource.subscribeRuntime,
    portfolioActivitySource.getRuntimeSnapshot,
    portfolioActivitySource.getRuntimeSnapshot,
  );
  const orchestration = useSyncExternalStore(
    orchestrationActivitySource.subscribeRuntime,
    orchestrationActivitySource.getRuntimeSnapshot,
    orchestrationActivitySource.getRuntimeSnapshot,
  );
  const proposal = useSyncExternalStore(
    proposalActivitySource.subscribeRuntime,
    proposalActivitySource.getRuntimeSnapshot,
    proposalActivitySource.getRuntimeSnapshot,
  );
  const prototype = useSyncExternalStore(
    prototypeActivitySource.subscribeRuntime,
    prototypeActivitySource.getRuntimeSnapshot,
    prototypeActivitySource.getRuntimeSnapshot,
  );
  const repository = useSyncExternalStore(
    repositoryActivitySource.subscribeRuntime,
    repositoryActivitySource.getRuntimeSnapshot,
    repositoryActivitySource.getRuntimeSnapshot,
  );

  return useMemo(() => {
    if (liveRuntime.mode === "live") {
      return {
        ...liveRuntime,
        events: projectConsoleActivity(liveRuntime.events),
      };
    }

    const events = projectConsoleActivity(
      projectConsoleActivitySources({
          environmentHistory,
          lifecycleTransitions,
          runtime: {
            delivery,
            orchestration,
            portfolio,
            proposal,
            prototype,
            repository,
          },
        }),
    );
    const sourceOwners = new Map<string, { label: string; eventCount: number }>();
    for (const event of events) {
      const current = sourceOwners.get(event.source.owner);
      sourceOwners.set(event.source.owner, {
        eventCount: (current?.eventCount ?? 0) + 1,
        label: event.source.label,
      });
    }
    return {
      ...liveRuntime,
      events,
      sources: [...sourceOwners.entries()].map(([owner, source]) => ({
        authority: owner,
        errorCode: null,
        eventCount: source.eventCount,
        label: source.label,
        observedAt: liveRuntime.observedAt,
        owner,
        sourceId: `preview:${owner}`,
        state: "current" as const,
        truncated: false,
      })),
    };
  }, [
      delivery,
      environmentHistory,
      lifecycleTransitions,
      liveRuntime,
      orchestration,
      portfolio,
      proposal,
      prototype,
      repository,
    ]);
}
