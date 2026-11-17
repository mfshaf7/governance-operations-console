"use client";

import { TerasAdvisorPanel, TerasSelectField } from "@/teras";
import type { AgentContextModelProjection } from "../model/agent-context-policy";
import type { AgentRuntimeIdentity } from "../model/agent-runtime-presence";
import { AgentConsoleSessionProvider } from "../state/agent-console-session-provider";
import { useAgentConsoleController } from "../state/use-agent-console-controller";
import { useAgentConnectionStatus } from "../state/agent-connection-status-provider";
import type { AgentProviderStatus } from "../model/agent-provider-status";

// A workspace presentation of the same governed Agent session/controller.
// It has no local response generator, provider fallback or workflow actions.
export function GovernedAdvisorPanel({ context, identity, title }: {
  context: AgentContextModelProjection;
  identity: AgentRuntimeIdentity;
  title: string;
}) {
  const { providerStatus } = useAgentConnectionStatus();
  return <AgentConsoleSessionProvider initialContextMode="focused" providerStatus={providerStatus} runtimeIdentity={identity}>
    <AdvisorContent context={context} providerStatus={providerStatus} title={title} />
  </AgentConsoleSessionProvider>;
}

function AdvisorContent({ context, providerStatus, title }: {
  context: AgentContextModelProjection; providerStatus: AgentProviderStatus | null; title: string;
}) {
  const { connection } = useAgentConnectionStatus();
  const agent = useAgentConsoleController({ contextCandidate: context, contextFallbackLabel: "Delivery context unavailable",
    listenForOpenEvent: false, placement: "embedded", providerStatus, conversationRole: "delivery-home" });
  const transcript = agent.agentTranscript.filter(entry => !["boot", "mode", "help"].includes(entry.id));
  const lines = transcript.map(entry => ({ id: entry.id, role: entry.kind === "operator" ? "operator" as const : "advisor" as const,
    text: `${entry.kind === "error" ? "Error: " : entry.kind === "system" ? "Status: " : ""}${entry.text}${entry.model ? `\nModel: ${entry.model}` : ""}` }));
  return <TerasAdvisorPanel fill density="compact" profileLabel={title}
    draftControls={{ connection, busy: agent.agentBusy, canUndo: false, onUndo: () => {},
      onCancel: agent.handleAgentCancel, notice: null, evidenceLabel: null,
      history: { ...agent.conversationControls, transcript: lines } }}
    statusLabel={agent.agentBusy ? "Working" : "Read-only advice"}
    statusTitle="Advice does not submit workflow decisions." statusTone={agent.agentBusy ? "info" : "muted"}
    transcript={lines}
    prompt={{ ariaLabel: `${title} prompt`, value: agent.agentPrompt, onChange: agent.setAgentPrompt,
      onSubmit: agent.handleAgentSubmit, placeholder: "Ask about Delivery…", rows: 2 }}
    footer={agent.projectContext.enabled && agent.projectContext.available.length ? <TerasSelectField label="Item context" ariaLabel="Delivery advisor item context" disabled={agent.agentBusy}
      value={agent.projectContext.selected ? `${agent.projectContext.selected.kind}:${agent.projectContext.selected.id}` : ""} onValueChange={agent.projectContext.choose}
      options={[{ value: "", label: "Delivery overview" }, ...agent.projectContext.available.map(item => ({ value: `${item.kind}:${item.id}`, label: item.title }))]} /> : undefined} />;
}
