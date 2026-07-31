"use client";

import {
  createAgentInvocation,
  isAgentRequestAbortReason,
  settleAgentInvocation,
  type AgentInvocationFailureCode,
  type AgentInvocationSettlement,
  type AgentTerminalEntry,
} from "../model/agent-console-session";
import {
  evaluateAgentContextPolicy,
  type AgentContextDecision,
  type AgentInteractionMode,
} from "../model/agent-context-policy";
import { inspectAgentInput } from "../model/agent-input-policy";
import {
  deriveAgentProviderReadinessState,
  isAgentProviderStatus,
  retainStaleAgentProviderObservation,
  type AgentProviderStatus,
} from "../model/agent-provider-status";
import {
  type AgentConsolePlacement,
  useAgentConsoleSession,
} from "./agent-console-session-provider";
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  contextCandidateBadgeLabel,
  formatAgentContextCandidate,
  type AgentContextCandidate,
} from "../../console-shell/context/agent-context-candidate";

function terminalEntry(
  kind: AgentTerminalEntry["kind"],
  text: string,
  model?: string | null,
): AgentTerminalEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    model,
    text,
  };
}

const localTerminalCommands = new Set([
  "clear",
  "context",
  "help",
  "mode",
  "reset",
  "status",
  "why this context?",
]);

function agentInteractionModeLabel(mode: AgentInteractionMode) {
  return mode === "focused"
    ? "Focus"
    : mode === "workspace"
      ? "Workspace"
      : "General";
}

function contextDecisionHeaderMismatch(
  response: Response,
  expected: AgentContextDecision,
) {
  const actual = {
    attached: response.headers.get("X-Agent-Context-Attached"),
    budget: response.headers.get("X-Agent-Context-Budget"),
    candidateId: response.headers.get("X-Agent-Context-Candidate"),
    code: response.headers.get("X-Agent-Context-Decision"),
    policy: response.headers.get("X-Agent-Context-Policy"),
  };
  const expectedBudget = `${expected.budgetUsedChars}/${expected.budgetLimitChars}`;

  if (
    actual.attached !== String(expected.attached) ||
    actual.budget !== expectedBudget ||
    actual.candidateId !== (expected.candidateId ?? "none") ||
    actual.code !== expected.code ||
    actual.policy !== expected.policyProfile
  ) {
    return "server context decision did not match the browser projection; response was discarded";
  }

  return null;
}

export function useAgentConsoleController({
  contextCandidate,
  contextFallbackLabel,
  listenForOpenEvent,
  placement,
  providerStatus,
}: {
  contextCandidate: AgentContextCandidate | null;
  contextFallbackLabel: string;
  listenForOpenEvent: boolean;
  placement: AgentConsolePlacement;
  providerStatus: AgentProviderStatus | null;
}) {
  const [dockPosition, setDockPosition] = useState<{ left: number; top: number } | null>(null);
  const {
    agentConsoleExpanded,
    agentBusy,
    agentContextMode,
    agentConversationTurns,
    agentHistory,
    agentHistoryCursor,
    agentPrompt,
    agentTranscript,
    beginAgentRequest,
    cancelAgentRequest,
    finishAgentRequest,
    setAgentConsoleExpanded,
    setAgentConversationTurns,
    setAgentContextMode,
    setAgentHistory,
    setAgentHistoryCursor,
    setAgentPrompt,
    setAgentTranscript,
    setCurrentInvocation,
  } = useAgentConsoleSession();
  const contextMode = agentContextMode;
  const [floatingModeMenuOpen, setFloatingModeMenuOpen] = useState(false);
  const [modalSurfaceOpen, setModalSurfaceOpen] = useState(false);
  const agentTranscriptRef = useRef<HTMLDivElement | null>(null);
  const dockDragOffsetRef = useRef({ x: 0, y: 0 });
  const isFloatingDock = placement === "floating";
  const modelDockExpanded = agentConsoleExpanded;
  const setModelDockExpanded = setAgentConsoleExpanded;

  useEffect(() => {
    if (!isFloatingDock) {
      return;
    }

    function updateModalSurfaceState() {
      setModalSurfaceOpen(
        document.body.matches(":has([data-teras-modal])"),
      );
    }

    updateModalSurfaceState();

    const observer = new MutationObserver(updateModalSurfaceState);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isFloatingDock]);

  useEffect(() => {
    if (!listenForOpenEvent) {
      return;
    }

    async function handleOpenAgentConsole(event: Event) {
      const detail = (
        event as CustomEvent<{
          autoRun?: boolean;
          mode?: AgentInteractionMode;
          note?: string;
          prompt?: string;
        }>
      ).detail;
      const requestedMode = detail?.mode ?? contextMode;

      setModelDockExpanded(true);

      if (detail?.mode && detail.mode !== "workspace") {
        setAgentContextMode(detail.mode);
      }

      if (detail?.note) {
        appendAgentTranscript([terminalEntry("system", detail.note)]);
      }

      if (detail?.prompt) {
        if (detail.autoRun) {
          await runAgentCommand(detail.prompt, requestedMode);
        } else {
          setAgentPrompt(detail.prompt);
        }
      }
    }

    window.addEventListener("governance-console:open-agent", handleOpenAgentConsole);

    return () => {
      window.removeEventListener("governance-console:open-agent", handleOpenAgentConsole);
    };
  }, [
    agentBusy,
    agentConversationTurns,
    providerStatus,
    contextMode,
    contextCandidate,
    listenForOpenEvent,
  ]);

  useEffect(() => {
    const floatingDockConstrainedByModal = isFloatingDock && modalSurfaceOpen;

    if (!modelDockExpanded || floatingDockConstrainedByModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModelDockExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFloatingDock, modalSurfaceOpen, modelDockExpanded]);

  useEffect(() => {
    agentTranscriptRef.current?.scrollTo({
      behavior: "smooth",
      top: agentTranscriptRef.current.scrollHeight,
    });
  }, [agentTranscript, agentBusy]);

  useEffect(() => {
    if (
      !providerStatus ||
      deriveAgentProviderReadinessState(providerStatus) !== "online"
    ) {
      return;
    }

    setAgentTranscript((current) =>
      current.map((entry) =>
        entry.kind === "error" && entry.text === "local ollama is offline; run status to inspect endpoint state"
          ? {
              ...entry,
              kind: "system",
              text: `local ollama recovered: ${providerStatus.model ?? "model ready"} / ${providerStatus.modelCount} models`,
            }
          : entry,
      ),
    );
  }, [
    providerStatus?.model,
    providerStatus?.modelCount,
    providerStatus?.freshness,
    providerStatus?.status,
  ]);

  function appendAgentTranscript(entries: AgentTerminalEntry[]) {
    setAgentTranscript((current) => [...current, ...entries].slice(-80));
  }

  function appendAgentTranscriptText(entryId: string, text: string) {
    setAgentTranscript((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              text: `${entry.text}${text}`,
            }
          : entry,
      ),
    );
  }

  function settleCurrentAgentInvocation(
    invocationId: string,
    settlement: AgentInvocationSettlement,
  ) {
    setCurrentInvocation((current) =>
      current?.id === invocationId
        ? settleAgentInvocation(current, settlement)
        : current,
    );
  }

  function statusText(status: AgentProviderStatus | null) {
    if (!status) {
      return "local ollama: probing";
    }

    const readiness = deriveAgentProviderReadinessState(status);

    if (readiness === "probing") {
      return [
        `local ollama: ${status.observedAt ? "stale" : "unavailable"}`,
        `last observed: ${status.observedAt ?? "not observed"}`,
        `last check: ${status.checkedAt}`,
        status.error ?? "fresh provider observation unavailable",
      ].join("\n");
    }

    if (readiness === "offline") {
      return `local ollama: offline\n${status.error ?? "endpoint unavailable"}`;
    }

    return [
      "local ollama: online",
      `endpoint: ${status.endpoint}`,
      `model: ${status.model}`,
      `models: ${status.modelCount}`,
      `operator mode: ${agentInteractionModeLabel(contextMode)}`,
      `session turns: ${agentConversationTurns.length}`,
      `safety: ${status.safetyMode}`,
      `observed: ${status.observedAt}`,
    ].join("\n");
  }

  async function fetchLiveProviderStatus() {
    const response = await fetch(`/api/agent-interaction?probe=${Date.now()}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`status probe failed with ${response.status}`);
    }

    const payload = (await response.json()) as unknown;

    if (!isAgentProviderStatus(payload)) {
      throw new Error("status probe returned an invalid observation");
    }

    return payload;
  }

  async function handleLocalTerminalCommand(
    command: string,
    requestedMode: AgentInteractionMode,
  ) {
    if (command === "clear") {
      setAgentTranscript([
        terminalEntry(
          "system",
          "transcript cleared; session context and command history retained",
        ),
        terminalEntry(
          "system",
          `mode: ${agentInteractionModeLabel(requestedMode)} / prototype-local context policy`,
        ),
      ]);
      return true;
    }

    if (command === "reset") {
      setAgentConversationTurns([]);
      setAgentHistory([]);
      setAgentHistoryCursor(null);
      setCurrentInvocation(null);
      setAgentTranscript([
        terminalEntry("system", "terminal reset"),
        terminalEntry(
          "system",
          "transcript, session context, and command history cleared",
        ),
        terminalEntry(
          "system",
          `mode: ${agentInteractionModeLabel(requestedMode)} / prototype-local context policy`,
        ),
      ]);
      return true;
    }

    if (command === "help") {
      appendAgentTranscript([
        terminalEntry(
          "system",
          [
            "available commands:",
            "  help                 show this guide",
            "  status               show local model and safety state",
            "  mode                 show operator intent mode",
            "  context              show the visible candidate and local policy decision",
            "  why this context?    explain the context projection boundary",
            "  clear                clear transcript; retain session context",
            "  reset                clear transcript, history, and session context",
            "  ask <question>       send a manual prompt to local Ollama",
            "",
            "keyboard:",
            "  Enter runs the command",
            "  Shift+Enter inserts a newline",
            "  ArrowUp/ArrowDown walks command history",
            "  Cancel button stops the active model request",
          ].join("\n"),
        ),
      ]);
      return true;
    }

    if (command === "status") {
      try {
        const liveStatus = await fetchLiveProviderStatus();
        appendAgentTranscript([terminalEntry("system", statusText(liveStatus))]);
      } catch (error) {
        const staleStatus = retainStaleAgentProviderObservation({
          checkedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          previous: providerStatus,
        });
        appendAgentTranscript([
          terminalEntry(
            "system",
            statusText(staleStatus),
          ),
        ]);
      }
      return true;
    }

    if (command === "mode") {
      const modeDescription =
        requestedMode === "focused"
          ? "Focus mode attaches only synthetic candidates allowed by the prototype-local policy."
          : requestedMode === "workspace"
            ? "Workspace mode is unavailable until a governed workspace packet source is connected."
            : "General mode suppresses workspace and active UI context.";
      appendAgentTranscript([
        terminalEntry(
          "system",
          [
            `operator mode: ${agentInteractionModeLabel(requestedMode)}`,
            modeDescription,
          ].join("\n"),
        ),
      ]);
      return true;
    }

    if (command === "context" || command === "why this context?") {
      const contextDecision = evaluateAgentContextPolicy({
        candidate: contextCandidate,
        mode: requestedMode,
      });
      appendAgentTranscript([
        terminalEntry(
          "system",
          [
            `local policy: ${contextDecision.policyProfile}`,
            `decision: ${contextDecision.code}`,
            `operator mode: ${agentInteractionModeLabel(contextDecision.mode)}`,
            `context attached: ${contextDecision.attached ? "yes" : "no"}`,
            `context budget: ${contextDecision.budgetUsedChars}/${contextDecision.budgetLimitChars} characters`,
            `reason: ${contextDecision.reason}`,
            "CGG receipt: unavailable before governed integration",
            "",
            formatAgentContextCandidate(contextCandidate),
          ].join("\n"),
        ),
      ]);
      return true;
    }

    return false;
  }

  async function runAgentCommand(
    command: string,
    requestedMode: AgentInteractionMode = contextMode,
  ) {
    if (!command || agentBusy) {
      return;
    }

    const normalizedCommand = command.toLowerCase();

    if (localTerminalCommands.has(normalizedCommand)) {
      if (normalizedCommand !== "clear" && normalizedCommand !== "reset") {
        setAgentHistory((current) => [...current, command].slice(-30));
        setAgentHistoryCursor(null);
        appendAgentTranscript([terminalEntry("operator", command)]);
      }

      await handleLocalTerminalCommand(normalizedCommand, requestedMode);
      return;
    }

    const requestedMessage = normalizedCommand.startsWith("ask ")
      ? command.slice(4)
      : command;
    const input = inspectAgentInput(requestedMessage);

    if (!input.ok) {
      appendAgentTranscript([terminalEntry("error", input.error)]);
      return;
    }

    const message = input.message;
    setAgentHistory((current) => [...current, command].slice(-30));
    setAgentHistoryCursor(null);
    appendAgentTranscript([terminalEntry("operator", command)]);

    let liveProviderStatus = providerStatus;

    if (
      !liveProviderStatus ||
      deriveAgentProviderReadinessState(liveProviderStatus) !== "online"
    ) {
      try {
        liveProviderStatus = await fetchLiveProviderStatus();
      } catch (error) {
        appendAgentTranscript([
          terminalEntry(
            "error",
            `local ollama status is unavailable; ${error instanceof Error ? error.message : String(error)}`,
          ),
        ]);
        return;
      }
    }

    if (
      !liveProviderStatus ||
      deriveAgentProviderReadinessState(liveProviderStatus) !== "online"
    ) {
      appendAgentTranscript([terminalEntry("error", "local ollama is offline; run status to inspect endpoint state")]);
      return;
    }

    const contextDecision = evaluateAgentContextPolicy({
      candidate: contextCandidate,
      mode: requestedMode,
    });
    const invocation = createAgentInvocation({
      contextDecision,
      model: liveProviderStatus.model,
      provider: liveProviderStatus.provider,
    });
    const requestSignal = beginAgentRequest(invocation.id);

    if (!requestSignal) {
      appendAgentTranscript([
        terminalEntry("error", "another agent request is already running"),
      ]);
      return;
    }

    let received = "";
    let responseStarted = false;
    setCurrentInvocation(invocation);

    try {
      appendAgentTranscript([
        terminalEntry(
          "system",
          `local policy: ${contextDecision.code}; context ${
            contextDecision.attached ? "attached" : "not attached"
          } / CGG receipt unavailable`,
        ),
      ]);

      const response = await fetch("/api/agent-interaction", {
        body: JSON.stringify({
          context: {
            candidate: contextCandidate,
            mode: requestedMode,
          },
          history: agentConversationTurns.slice(-16),
          message,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: requestSignal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `model request failed with status ${response.status}`);
      }

      const decisionMismatch = contextDecisionHeaderMismatch(
        response,
        contextDecision,
      );

      if (decisionMismatch) {
        await response.body?.cancel();
        throw new Error(decisionMismatch);
      }

      if (!response.body) {
        throw new Error("model response stream was empty");
      }

      responseStarted = true;
      const responseModel =
        response.headers.get("X-Agent-Model") ?? liveProviderStatus.model;
      const responseProvider =
        response.headers.get("X-Agent-Provider") ?? liveProviderStatus.provider;
      const replyEntry = terminalEntry("agent", "", responseModel);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      appendAgentTranscript([replyEntry]);
      setCurrentInvocation((current) =>
        current?.id === invocation.id
          ? {
              ...current,
              model: responseModel,
              provider: responseProvider,
            }
          : current,
      );

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          received += chunk;
          appendAgentTranscriptText(replyEntry.id, chunk);
        }

        const finalChunk = decoder.decode();

        if (finalChunk) {
          received += finalChunk;
          appendAgentTranscriptText(replyEntry.id, finalChunk);
        }
      } finally {
        reader.releaseLock();
      }

      if (!received.trim()) {
        appendAgentTranscriptText(replyEntry.id, "model returned an empty response");
        settleCurrentAgentInvocation(invocation.id, {
          error: "model returned an empty response",
          failureCode: "empty-response",
          state: "failed",
        });
      } else {
        setAgentConversationTurns((current) =>
          [
            ...current,
            {
              content: message,
              role: "user" as const,
            },
            {
              content: received.trim(),
              role: "assistant" as const,
            },
          ].slice(-16),
        );
        settleCurrentAgentInvocation(invocation.id, {
          state: "completed",
        });
      }
    } catch (error) {
      const abortReason = isAgentRequestAbortReason(requestSignal.reason)
        ? requestSignal.reason
        : null;
      const partialOutputNote = received.trim()
        ? " Partial output remains visible but was not added to session context."
        : "";

      if (
        abortReason?.code === "operator-cancelled" ||
        abortReason?.code === "session-ended"
      ) {
        appendAgentTranscript([
          terminalEntry(
            "system",
            `${abortReason.message}${partialOutputNote}`,
          ),
        ]);
        settleCurrentAgentInvocation(invocation.id, {
          state: "cancelled",
        });
      } else {
        const failureCode: AgentInvocationFailureCode =
          abortReason?.code === "request-timeout"
            ? "request-timeout"
            : responseStarted
              ? "stream-interrupted"
              : "provider-request-failed";
        const errorMessage =
          abortReason?.code === "request-timeout"
            ? `${abortReason.message}${partialOutputNote}`
            : responseStarted
              ? `response stream interrupted.${partialOutputNote}`
              : error instanceof Error
                ? error.message
                : String(error);

        appendAgentTranscript([terminalEntry("error", errorMessage)]);
        settleCurrentAgentInvocation(invocation.id, {
          error: errorMessage,
          failureCode,
          state: "failed",
        });
      }
    } finally {
      finishAgentRequest(invocation.id);
    }
  }

  async function handleAgentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const command = agentPrompt.trim();

    if (!command || agentBusy) {
      return;
    }

    setAgentPrompt("");
    await runAgentCommand(command);
  }

  function handleAgentCancel() {
    cancelAgentRequest();
  }

  function handleAgentContextModeChange(mode: AgentInteractionMode) {
    if (agentBusy || mode === "workspace") {
      return;
    }

    setAgentContextMode(mode);
    setFloatingModeMenuOpen(false);
  }

  function handleAgentPromptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }

    if (event.key === "ArrowUp" && agentHistory.length > 0) {
      event.preventDefault();
      const nextCursor =
        agentHistoryCursor === null
          ? agentHistory.length - 1
          : Math.max(0, agentHistoryCursor - 1);
      setAgentHistoryCursor(nextCursor);
      setAgentPrompt(agentHistory[nextCursor] ?? "");
      return;
    }

    if (event.key === "ArrowDown" && agentHistoryCursor !== null) {
      event.preventDefault();
      const nextCursor = agentHistoryCursor + 1;

      if (nextCursor >= agentHistory.length) {
        setAgentHistoryCursor(null);
        setAgentPrompt("");
        return;
      }

      setAgentHistoryCursor(nextCursor);
      setAgentPrompt(agentHistory[nextCursor] ?? "");
    }
  }

  function handleDockPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (modelDockExpanded) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("button, textarea, input, select, a")) {
      return;
    }

    const dock = event.currentTarget.closest(
      "[data-agent-console-dock]",
    ) as HTMLDivElement | null;

    if (!dock) {
      return;
    }

    const dockRect = dock.getBoundingClientRect();
    dockDragOffsetRef.current = {
      x: event.clientX - dockRect.left,
      y: event.clientY - dockRect.top,
    };
    setDockPosition({
      left: dockRect.left,
      top: dockRect.top,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDockPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (modelDockExpanded || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const dock = event.currentTarget.closest(
      "[data-agent-console-dock]",
    ) as HTMLDivElement | null;

    if (!dock) {
      return;
    }

    const dockRect = dock.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - dockRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - dockRect.height - margin);

    setDockPosition({
      left: Math.min(Math.max(margin, event.clientX - dockDragOffsetRef.current.x), maxLeft),
      top: Math.min(Math.max(margin, event.clientY - dockDragOffsetRef.current.y), maxTop),
    });
  }

  function handleDockPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const providerState = deriveAgentProviderReadinessState(providerStatus);
  const providerOnline = providerState === "online";
  const providerStateLabel =
    providerState === "online"
      ? "Online"
      : providerState === "offline"
        ? "Offline"
        : providerStatus
          ? providerStatus.observedAt
            ? "Stale"
            : "Unavailable"
          : "Probing";
  const providerStatusLabel =
    providerState === "online"
      ? `local ollama / ${providerStatus?.model}`
      : providerState === "offline"
        ? "local ollama / offline"
        : providerStatus
          ? providerStatus.observedAt
            ? "local ollama / stale"
            : "local ollama / unavailable"
          : "local ollama / probing";
  const contextDecision = evaluateAgentContextPolicy({
    candidate: contextCandidate,
    mode: contextMode,
  });
  const contextSummary =
    contextMode === "focused"
      ? contextCandidate?.summary ??
        "Ask generally; no console context candidate is available."
      : contextMode === "workspace"
        ? "Workspace mode requires a governed workspace packet source."
        : "General mode selected; workspace and active UI context will not be attached.";
  const contextTitle =
    contextMode === "focused"
      ? contextCandidateBadgeLabel(contextCandidate, contextFallbackLabel)
      : contextMode === "workspace"
        ? "Workspace mode / unavailable"
        : "General mode / no context";
  const contextPill =
    contextMode === "focused"
      ? contextDecision.code === "focused-synthetic-attached"
        ? "Eligible"
        : contextDecision.code === "cgg-required"
          ? "CGG required"
          : "Unavailable"
      : contextMode === "workspace"
        ? "Unavailable"
        : "Detached";
  const contextPillTone =
    contextMode === "focused"
      ? contextDecision.attached
        ? "admitted"
        : contextDecision.code === "cgg-required"
          ? "planned"
          : "missing"
      : contextMode === "workspace"
        ? "planned"
        : "off";
  const contextBarTone =
    contextMode === "focused"
      ? contextCandidate?.displayTone ?? "info"
      : contextMode === "workspace"
        ? "workspace"
        : "neutral";
  const floatingDockConstrainedByModal = isFloatingDock && modalSurfaceOpen;
  const useCompactFloatingControls = isFloatingDock && !modelDockExpanded;
  const modeLabel = agentInteractionModeLabel(contextMode);
  const dockStyle: CSSProperties | undefined =
    !modelDockExpanded && dockPosition
      ? {
          bottom: "auto",
          left: dockPosition.left,
          right: "auto",
          top: dockPosition.top,
        }
      : undefined;

  return {
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
  };
}
