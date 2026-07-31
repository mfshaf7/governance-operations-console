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

import { projectConsoleActivity } from "./console-activity-model";
import { projectConsoleActivitySources } from "./console-activity-sources";

export function useConsoleActivity({
  environmentHistory,
  lifecycleTransitions,
}: {
  environmentHistory: readonly DevIntegrationProfileHistoryEvent[];
  lifecycleTransitions: readonly LifecycleTransitionProjection[];
}) {
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

  return useMemo(
    () =>
      projectConsoleActivity(
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
      ),
    [
      delivery,
      environmentHistory,
      lifecycleTransitions,
      orchestration,
      portfolio,
      proposal,
      prototype,
      repository,
    ],
  );
}
