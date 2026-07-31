"use client";

import {
  ChevronRight,
  Maximize2,
  MessageSquareText,
  Minimize2,
  SendHorizonal,
  Square,
} from "lucide-react";
import type { AgentContextCandidate } from "../../console-shell/context/agent-context-candidate";
import type { AgentInteractionMode } from "../model/agent-context-policy";
import type { AgentProviderStatus } from "../model/agent-provider-status";
import type { AgentConsolePlacement } from "../state/agent-console-session-provider";
import { useAgentConsoleController } from "../state/use-agent-console-controller";

export function ModelInteractionDock({
  className = "",
  contextCandidate,
  contextFallbackLabel = "No active context",
  listenForOpenEvent = true,
  placement,
  providerStatus,
  title = "Agent Console",
}: {
  className?: string;
  contextFallbackLabel?: string;
  contextCandidate: AgentContextCandidate | null;
  listenForOpenEvent?: boolean;
  placement: AgentConsolePlacement;
  providerStatus: AgentProviderStatus | null;
  title?: string;
}) {
  const {
    agentBusy,
    agentContextMode,
    agentPrompt,
    agentTranscript,
    agentTranscriptRef,
    contextBarTone,
    contextPill,
    contextPillTone,
    contextSummary,
    contextTitle,
    dockStyle,
    floatingDockConstrainedByModal,
    floatingModeMenuOpen,
    handleAgentCancel,
    handleAgentContextModeChange,
    handleAgentPromptKeyDown,
    handleAgentSubmit,
    handleDockPointerDown,
    handleDockPointerMove,
    handleDockPointerUp,
    isFloatingDock,
    modeLabel,
    modelDockExpanded,
    providerOnline,
    providerState,
    providerStateLabel,
    providerStatusLabel,
    setAgentPrompt,
    setFloatingModeMenuOpen,
    setModelDockExpanded,
    useCompactFloatingControls,
  } = useAgentConsoleController({
    contextCandidate,
    contextFallbackLabel,
    listenForOpenEvent,
    placement,
    providerStatus,
  });
  const modeOptions: AgentInteractionMode[] = ["focused", "general", "workspace"];

  return (
    <>
      {modelDockExpanded && !floatingDockConstrainedByModal ? (
        <button
          aria-label={`Close ${title} modal`}
          className={`model-dock-backdrop ${isFloatingDock ? "model-dock-backdrop-floating" : ""}`.trim()}
          type="button"
          onClick={() => setModelDockExpanded(false)}
        />
      ) : null}
      <div
        aria-label={title}
        aria-modal={modelDockExpanded && !floatingDockConstrainedByModal}
        className={`model-dock rounded-3xl p-4 ${
          modelDockExpanded ? `model-dock-expanded ${floatingDockConstrainedByModal ? "" : "model-dock-modal"}` : ""
        } ${className}`.trim()}
        role={modelDockExpanded && !floatingDockConstrainedByModal ? "dialog" : "region"}
        style={dockStyle}
        data-agent-console-dock
      >
        <div
          className="model-dock-header mb-3 flex items-center justify-between gap-3"
          title={modelDockExpanded ? undefined : "Drag agent console"}
          onPointerCancel={handleDockPointerUp}
          onPointerDown={handleDockPointerDown}
          onPointerMove={handleDockPointerMove}
          onPointerUp={handleDockPointerUp}
        >
          <div className="model-dock-identity flex min-w-0 items-center gap-3">
            <span className="model-dock-icon">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <div className="model-dock-identity-copy min-w-0">
              <p className="model-dock-title mono text-[11px] font-bold uppercase">
                {title}
              </p>
              <p className="model-dock-subtitle mt-1 truncate text-xs">
                {providerOnline ? `${providerStatus?.modelCount ?? 0} local models detected` : "Local model path is visible but not ready"}
              </p>
            </div>
          </div>
          <div className="model-dock-header-actions">
            {useCompactFloatingControls ? (
              <div className="model-dock-mode-select-wrap">
                <span>Mode</span>
                <button
                  aria-label="Floating agent context mode"
                  aria-expanded={floatingModeMenuOpen}
                  className="model-dock-mode-select"
                  disabled={agentBusy}
                  type="button"
                  onClick={() => setFloatingModeMenuOpen((current) => !current)}
                >
                  {modeLabel}
                  <ChevronRight className="h-3 w-3" />
                </button>
                {floatingModeMenuOpen ? (
                  <div className="model-dock-mode-menu rounded-2xl p-1">
                    {modeOptions.map((mode) => {
                      const label = mode === "focused" ? "Focus" : mode === "workspace" ? "Workspace" : "General";

                      return (
                        <button
                          key={mode}
                          className="model-dock-mode-menu-item"
                          data-active={agentContextMode === mode ? "true" : "false"}
                          disabled={agentBusy || mode === "workspace"}
                          title={
                            mode === "workspace"
                              ? "Workspace mode requires a governed workspace packet source."
                              : undefined
                          }
                          type="button"
                          onClick={() => handleAgentContextModeChange(mode)}
                        >
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="model-dock-mode-compact" aria-label="Page agent context mode">
                {modeOptions.map((mode) => (
                  <button
                    key={mode}
                    aria-pressed={agentContextMode === mode}
                    className="model-dock-mode-compact-button"
                    data-active={agentContextMode === mode ? "true" : "false"}
                    disabled={agentBusy || mode === "workspace"}
                    title={
                      mode === "workspace"
                        ? "Workspace mode requires a governed workspace packet source."
                        : undefined
                    }
                    type="button"
                    onClick={() => handleAgentContextModeChange(mode)}
                  >
                    {mode === "focused" ? "Focus" : mode === "workspace" ? "Workspace" : "General"}
                  </button>
                ))}
              </div>
            )}
            <button
              aria-label={modelDockExpanded ? "Compact agent interaction console" : "Expand agent interaction console"}
              className={`model-dock-expand rounded-full ${
                useCompactFloatingControls ? "model-dock-expand-small px-2 py-2" : "px-3 py-1.5 text-xs"
              }`}
              type="button"
              onClick={() => setModelDockExpanded((current) => !current)}
            >
              {modelDockExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              {useCompactFloatingControls ? null : modelDockExpanded ? "compact" : "expand"}
            </button>
          </div>
        </div>
        <div
          className="model-dock-context-card mb-3 rounded-2xl px-3 py-2"
          data-context-tone={contextBarTone}
        >
          <div className="model-dock-context-header flex items-center justify-between gap-3">
            <p className="model-dock-context-title mono truncate text-[10px] font-bold uppercase">
              {contextTitle}
            </p>
            <span
              className="model-dock-context-pill rounded-full px-2 py-1"
              data-tone={contextPillTone}
            >
              {contextPill}
            </span>
          </div>
          <p className="model-dock-context-summary mt-1 text-xs" title={contextSummary}>
            {contextSummary}
          </p>
        </div>
        <div className="model-dock-input-shell terminal-shell rounded-2xl p-3">
          <div className="terminal-topbar mb-3 flex items-center justify-between gap-3">
            <span className="terminal-runtime-status" data-state={providerState}>
              <span className="terminal-runtime-status-dot" />
              <span>{providerStateLabel}</span>
            </span>
            <span className="terminal-provider-label mono text-[10px] uppercase">
              {providerStatusLabel}
            </span>
          </div>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleAgentSubmit}>
            <div
              ref={agentTranscriptRef}
              aria-live="polite"
              className="terminal-transcript mono"
            >
              {agentTranscript.map((entry) => (
                <div
                  key={entry.id}
                  className={`terminal-entry terminal-entry-${entry.kind}`}
                >
                  {entry.kind === "operator" ? (
                    <>
                      <span className="terminal-prompt">operator@workspace:~$</span>
                      <span className="terminal-command">{entry.text}</span>
                    </>
                  ) : (
                    <>
                      <span className="terminal-speaker">
                        {entry.kind === "agent"
                          ? `agent[${entry.model ?? providerStatus?.model ?? "ollama"}]`
                          : entry.kind}
                      </span>
                      <pre>{entry.text}</pre>
                    </>
                  )}
                </div>
              ))}
              {agentBusy && agentTranscript.at(-1)?.kind !== "agent" ? (
                <div className="terminal-entry terminal-entry-agent">
                  <span className="terminal-speaker">
                    agent[{providerStatus?.model ?? "ollama"}]
                  </span>
                  <pre className="terminal-thinking">thinking...</pre>
                </div>
              ) : null}
            </div>
            <div className="terminal-active-line">
              <span className="terminal-prompt mono">operator@workspace:~$</span>
              <textarea
                aria-label="Agent terminal command input"
                className="model-dock-input terminal-input mono"
                disabled={agentBusy}
                placeholder='ask "what should I inspect next?"'
                rows={2}
                value={agentPrompt}
                onChange={(event) => setAgentPrompt(event.target.value)}
                onKeyDown={handleAgentPromptKeyDown}
              />
            </div>
            <div className="terminal-footer mt-2 flex items-center justify-between gap-3">
              <span className="terminal-footer-hint mono text-[10px] uppercase">
                Enter runs / Shift+Enter adds a line
              </span>
              <button
                aria-label={agentBusy ? "Cancel agent request" : "Run agent command"}
                className="model-dock-send terminal-run-button rounded-full px-3 py-1.5 text-xs"
                disabled={!agentBusy && !agentPrompt.trim()}
                type={agentBusy ? "button" : "submit"}
                onClick={agentBusy ? handleAgentCancel : undefined}
              >
                {agentBusy ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <SendHorizonal className="h-3.5 w-3.5" />
                )}
                {agentBusy ? "cancel" : "run"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
