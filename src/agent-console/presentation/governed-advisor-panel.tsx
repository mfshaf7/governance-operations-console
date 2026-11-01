"use client";

import { TerasAdvisorPanel, TerasTechnicalDetails } from "@/teras";
import type { AgentContextModelProjection } from "../model/agent-context-policy";
import type { AgentRuntimeIdentity } from "../model/agent-runtime-presence";
import { AgentConsoleSessionProvider } from "../state/agent-console-session-provider";
import { useAgentConsoleController } from "../state/use-agent-console-controller";
import { useAgentProviderStatus } from "../state/use-agent-provider-status";
import type { AgentProviderStatus } from "../model/agent-provider-status";

// A workspace presentation of the same governed Agent session/controller.
// It has no local response generator, provider fallback or workflow actions.
export function GovernedAdvisorPanel({ context, identity, title }: {
  context: AgentContextModelProjection;
  identity: AgentRuntimeIdentity;
  title: string;
}) {
  const providerStatus = useAgentProviderStatus();
  return <AgentConsoleSessionProvider initialContextMode="focused" providerStatus={providerStatus} runtimeIdentity={identity}>
    <AdvisorContent context={context} providerStatus={providerStatus} title={title} />
  </AgentConsoleSessionProvider>;
}

function AdvisorContent({ context, providerStatus, title }: {
  context: AgentContextModelProjection; providerStatus: AgentProviderStatus | null; title: string;
}) {
  const agent = useAgentConsoleController({ contextCandidate: context, contextFallbackLabel: "Delivery context unavailable",
    listenForOpenEvent: false, placement: "embedded", providerStatus });
  const transcript = agent.agentTranscript.filter(entry => !["boot", "mode", "help"].includes(entry.id));
  return <TerasAdvisorPanel fill density="compact" profileLabel={title}
    draftControls={{ busy: agent.agentBusy, canUndo: false, onUndo: () => {},
      onCancel: agent.handleAgentCancel, notice: null, evidenceLabel: null }}
    statusLabel={agent.agentBusy ? "Working" : agent.providerStateLabel}
    statusTitle={agent.providerStatusLabel} statusTone={agent.agentBusy ? "info" : agent.providerOnline ? "ok" : "warn"}
    transcript={transcript.length ? transcript.map(entry => ({ id: entry.id,
      role: entry.kind === "operator" ? "operator" : "advisor",
      text: `${entry.kind === "error" ? "Error: " : entry.kind === "system" ? "Status: " : ""}${entry.text}${entry.model ? `\nModel: ${entry.model}` : ""}`,
    })) : [{ id: "guidance", role: "advisor", text: "Ask about the current Delivery overview or where to continue. A reply is generated only after you send a request." }]}
    prompt={{ ariaLabel: `${title} prompt`, value: agent.agentPrompt, onChange: agent.setAgentPrompt,
      onSubmit: agent.handleAgentSubmit, placeholder: "Ask about Delivery…", rows: 2 }}
    footer={<TerasTechnicalDetails summary="Delivery context" items={[
        { label: "Coverage", value: context.status ?? "Unavailable" },
        { label: "Context", value: context.summary },
        { label: "Observed", value: context.observedAt ?? "Not observed" },
        { label: "Boundary", value: context.boundary },
      ]} />} />;
}
