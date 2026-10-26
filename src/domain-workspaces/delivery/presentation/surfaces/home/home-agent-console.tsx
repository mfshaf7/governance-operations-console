"use client";

import { openGovernedAgentConsole } from "@/agent-console";
import { TerasActionButton, TerasPanel, TerasPanelHeader, TerasMetadataList } from "@/teras";
import type { DeliveryHomeViewModel } from "./home-view-model.ts";

export function DeliveryHomeAgentConsole({ viewModel }: { viewModel: DeliveryHomeViewModel }) {
  return <TerasPanel frame="padded" fit="content" treatment="neutral">
    <TerasPanelHeader kicker="Manual assistance" title="Governed Agent Console"
      description="Use the shared Docking Agent with current Delivery owner context. OOS and CGG govern each request; opening this entry does not invoke a model." />
    <TerasMetadataList items={[
      { label: "Workspace", value: viewModel.workspaceStatus.title },
      { label: "Context", value: "Current owner collection summary; inspect the candidate before sending" },
    ]} />
    <TerasActionButton onClick={openGovernedAgentConsole}>Open Agent Console</TerasActionButton>
  </TerasPanel>;
}
