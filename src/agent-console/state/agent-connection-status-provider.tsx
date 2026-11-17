"use client";

import { createContext, useContext, type ReactNode } from "react";
import { agentConnectionPresentation, type AgentProviderStatus } from "../model/agent-provider-status";

const AgentConnectionContext = createContext<AgentProviderStatus | null>(null);

// Consume the shell's existing observation; advisors do not create more pollers.
export function AgentConnectionStatusProvider({ status, children }: {
  status: AgentProviderStatus | null;
  children: ReactNode;
}) {
  return <AgentConnectionContext.Provider value={status}>{children}</AgentConnectionContext.Provider>;
}

export function useAgentConnectionStatus() {
  const providerStatus = useContext(AgentConnectionContext);
  return { providerStatus, connection: agentConnectionPresentation(providerStatus) };
}
