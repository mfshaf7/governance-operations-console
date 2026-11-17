"use client";

import {
  ChevronRight,
  Maximize2,
  MessageSquareText,
  Minimize2,
  SendHorizonal,
  Square,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useAgentModalPresentation } from "../state/use-agent-modal-presentation.ts";
import { TerasAdvisorStatusBar, TerasLoadingState, TerasModalFoundation, TerasNewConversationButton } from "@/teras";
import { useAgentConsoleSession } from "../state/agent-console-session-provider";
import { useAgentDockPortal } from "../state/use-agent-dock-portal";
import type { AgentContextCandidate } from "../../console-shell/context/agent-context-candidate";
import type { AgentInteractionMode } from "../model/agent-context-policy";
import type { AgentProviderStatus } from "../model/agent-provider-status";
import { agentConnectionPresentation } from "../model/agent-provider-status";
import type { AgentConsolePlacement } from "../state/agent-console-session-provider";
import { useAgentConsoleController } from "../state/use-agent-console-controller";

export function ModelInteractionDock({
  className = "",
  contextCandidate: focusedContextCandidate,
  workspaceContextCandidate = null,
  contextFallbackLabel = "No active context",
  listenForOpenEvent = true,
  placement,
  providerStatus,
  title = "Agent Console",
}: {
  className?: string;
  contextFallbackLabel?: string;
  contextCandidate: AgentContextCandidate | null;
  workspaceContextCandidate?: AgentContextCandidate | null;
  listenForOpenEvent?: boolean;
  placement: AgentConsolePlacement;
  providerStatus: AgentProviderStatus | null;
  title?: string;
}) {
  const { agentContextMode: selectedMode } = useAgentConsoleSession();
  const contextCandidate = selectedMode === "workspace" ? workspaceContextCandidate : focusedContextCandidate;
  const portal = useAgentDockPortal(placement === "floating");
  const {
    agentBusy,
    agentContextMode,
    agentPrompt,
    agentTranscript,
    agentTranscriptRef,
    contextModeChanging,
    contextBarTone,
    contextPill,
    contextPillTone,
    contextSummary,
    contextTitle,
    dockStyle,
    floatingDockConstrainedByModal,
    modeMenuOpen,
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
    setAgentPrompt,
    setModeMenuOpen,
    setModelDockExpanded,
    savedConversationStatus,
    canSubmitConversation,
    conversationRecovery,
    conversationControls,
    projectContext,
    hasEarlierConversation,
    showEarlierConversation,
  } = useAgentConsoleController({
    contextCandidate,
    workspaceContextCandidate,
    contextFallbackLabel,
    listenForOpenEvent,
    placement,
    providerStatus,
  });
  const { titleId: modalTitleId, presentationRef } = useAgentModalPresentation(modelDockExpanded);
  const modeOptions: AgentInteractionMode[] = ["focused", "workspace"];
  const workspaceModeAvailable = workspaceContextCandidate?.scope === "workspace" && workspaceContextCandidate.sourceMode !== "unavailable";

  async function selectMode(mode: AgentInteractionMode) {
    if (await handleAgentContextModeChange(mode)) {
      setModeMenuOpen(false);
      presentationRef.current?.querySelector<HTMLButtonElement>(".model-dock-mode-select")?.focus();
    }
  }

  const presentation = (
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
        role="region"
        style={dockStyle}
        hidden={portal.blocked}
        onKeyDownCapture={(event) => {
          if (event.key === "Escape" && modeMenuOpen) {
            event.preventDefault(); event.stopPropagation(); setModeMenuOpen(false);
            event.currentTarget.querySelector<HTMLButtonElement>(".model-dock-mode-select")?.focus();
            return;
          }
          if (portal.host && modelDockExpanded && event.key === "Escape") {
            event.preventDefault(); event.stopPropagation(); setModelDockExpanded(false);
            event.currentTarget.querySelector<HTMLButtonElement>(".model-dock-expand")?.focus();
          }
        }}
        data-agent-console-dock
        ref={presentationRef}
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
              <p id={modalTitleId} className="model-dock-title mono text-[11px] font-bold uppercase">
                {title}
              </p>
            </div>
          </div>
          <div className="model-dock-header-actions">
            <div
              className="model-dock-mode-select-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setModeMenuOpen(false);
              }}
            >
              <span>Mode</span>
              <button
                aria-label={isFloatingDock ? "Floating agent context mode" : "Agent context mode"}
                aria-expanded={modeMenuOpen}
                className="model-dock-mode-select"
                disabled={agentBusy || contextModeChanging}
                type="button"
                onClick={() => setModeMenuOpen((current) => !current)}
              >
                {modeLabel}
                <ChevronRight className="h-3 w-3" />
              </button>
              {modeMenuOpen ? (
                <div className="model-dock-mode-menu rounded-2xl p-1">
                  {modeOptions.map((mode) => {
                    const label = mode === "focused" ? "Focus" : "Workspace";

                    return (
                      <button
                        key={mode}
                        aria-pressed={agentContextMode === mode}
                        className="model-dock-mode-menu-item"
                        data-active={agentContextMode === mode ? "true" : "false"}
                        disabled={agentBusy || contextModeChanging || (mode === "workspace" && !workspaceModeAvailable)}
                        title={
                          mode === "workspace"
                            ? "Workspace mode requires a current workspace context candidate."
                            : undefined
                        }
                        type="button"
                        onClick={() => void selectMode(mode)}
                      >
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <button
              aria-label={modelDockExpanded ? "Compact agent interaction console" : "Expand agent interaction console"}
              className="model-dock-expand model-dock-expand-small rounded-full"
              title={modelDockExpanded ? "Compact agent interaction console" : "Expand agent interaction console"}
              type="button"
              onClick={() => setModelDockExpanded((current) => !current)}
            >
              {modelDockExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
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
              title={contextPillTone === "admitted" ? "Context is checked for sensitive content and size before the model can use it." : undefined}
            >
              {contextPill}
            </span>
          </div>
          <p className="model-dock-context-summary mt-1 text-xs" title={contextSummary}>
            {contextSummary}
          </p>
          {projectContext.enabled && (projectContext.available.length || projectContext.selected) ? <div className="mt-2 flex min-w-0 items-center gap-2 text-xs">
            <label htmlFor={`project-context-${placement}`}>Item context</label>
            <select id={`project-context-${placement}`} aria-label="Item context" className="model-dock-mode-select min-w-0 flex-1" disabled={agentBusy}
              value={projectContext.selected ? `${projectContext.selected.kind}:${projectContext.selected.id}` : ""} onChange={event => projectContext.choose(event.target.value)}>
              <option value="">Page overview</option>
              {[...projectContext.available,...(projectContext.selected && !projectContext.available.some(item => item.kind === projectContext.selected!.kind && item.id === projectContext.selected!.id) ? [projectContext.selected] : [])].map(item => <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.title} · {item.kind}</option>)}
            </select>
          </div> : null}
        </div>
        <div className="model-dock-input-shell terminal-shell rounded-2xl p-3">
          {hasEarlierConversation || conversationRecovery.error || conversationRecovery.conflict ? <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs">
            {hasEarlierConversation ? <button className="model-dock-mode-select" type="button" onClick={showEarlierConversation}>Earlier messages</button> : null}
            {conversationRecovery.error && !conversationRecovery.conflict ? <button className="model-dock-mode-select" type="button" disabled={agentBusy} onClick={() => void conversationRecovery.retry()}>Retry conversation</button> : null}
            {!conversationRecovery.ready && conversationRecovery.error ? <button className="model-dock-mode-select" type="button" disabled={agentBusy} onClick={conversationRecovery.useCurrentContext}>Use current context only</button> : null}
            {conversationRecovery.conflict ? <>
              <button className="model-dock-mode-select" type="button" disabled={agentBusy} onClick={() => void conversationRecovery.useServer()}>Use server conversation</button>
              <button className="model-dock-mode-select" type="button" disabled={agentBusy} onClick={() => void conversationRecovery.keepBrowser()}>Keep browser conversation</button>
            </> : null}
          </div> : null}
          <TerasAdvisorStatusBar connection={agentConnectionPresentation(providerStatus)} conversationStatus={savedConversationStatus}
            actions={<TerasNewConversationButton disabled={agentBusy || contextModeChanging || !conversationControls.ready} onClick={conversationControls.onNew} />} />
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleAgentSubmit}>
            <div
              ref={agentTranscriptRef}
              aria-live="polite"
              className="terminal-transcript mono"
            >
              {contextModeChanging ? <TerasLoadingState inline label="Changing agent mode…" /> : null}
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
                          ? `agent[${entry.model ?? providerStatus?.model ?? "governed"}]`
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
                    agent[{providerStatus?.model ?? "governed"}]
                  </span>
                  <TerasLoadingState inline label="Processing request…" />
                </div>
              ) : null}
            </div>
            <div className="terminal-active-line">
              <span className="terminal-prompt mono">operator@workspace:~$</span>
              <textarea
                aria-label="Agent terminal command input"
                className="model-dock-input terminal-input mono"
                disabled={agentBusy || contextModeChanging}
                placeholder='ask "what should I inspect next?"'
                rows={2}
                value={agentPrompt}
                onChange={(event) => setAgentPrompt(event.target.value)}
                onKeyDown={handleAgentPromptKeyDown}
              />
            </div>
            <div className="terminal-footer mt-2 flex items-center justify-between gap-3">
              <span className="terminal-footer-hint mono text-[10px] uppercase">
                Enter sends / Shift+Enter adds a line
              </span>
              <button
                aria-label={contextModeChanging ? "Changing agent mode" : agentBusy ? "Cancel agent request" : "Run agent command"}
                className="model-dock-send terminal-run-button rounded-full px-3 py-1.5 text-xs"
                disabled={contextModeChanging || (!agentBusy && (!agentPrompt.trim() || !canSubmitConversation))}
                type={agentBusy ? "button" : "submit"}
                onClick={agentBusy ? handleAgentCancel : undefined}
              >
                {agentBusy ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <SendHorizonal className="h-3.5 w-3.5" />
                )}
                {contextModeChanging ? "switching" : agentBusy ? "cancel" : "run"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
  if (portal.host) return createPortal(presentation, portal.host);
  if (modelDockExpanded && !floatingDockConstrainedByModal) return (
    <TerasModalFoundation ariaLabelledBy={modalTitleId} className="model-dock-native"
      open onRequestClose={() => setModelDockExpanded(false)}>
      {presentation}
    </TerasModalFoundation>
  );
  return presentation;
}
