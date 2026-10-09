"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  agentRequestTimeoutMs,
  createAgentRequestAbortReason,
  type AgentConversationTurn,
  type AgentInteractionMode,
  type AgentInvocation,
  type AgentTerminalEntry,
} from "../model/agent-console-session";
import {
  deriveAgentProviderReadinessState,
  type AgentProviderStatus,
} from "../model/agent-provider-status";
import {
  deriveAgentRuntimeActivityState,
  type AgentRuntimeIdentity,
} from "../model/agent-runtime-presence";
import { useAgentRuntimePresenceRegistration } from "./agent-runtime-presence-provider";

export type AgentConsolePlacement = "embedded" | "floating";

type AgentConsoleSessionContextValue = {
  agentConsoleExpanded: boolean;
  agentBusy: boolean;
  agentConversationTurns: AgentConversationTurn[];
  agentContextMode: AgentInteractionMode;
  agentHistory: string[];
  agentHistoryCursor: number | null;
  agentPrompt: string;
  agentTranscript: AgentTerminalEntry[];
  agentSessionBinding: AgentBrowserSessionBinding;
  beginAgentRequest: (invocationId: string) => AbortSignal | null;
  cancelAgentRequest: () => boolean;
  currentInvocation: AgentInvocation | null;
  finishAgentRequest: (invocationId: string) => void;
  setAgentConversationTurns: Dispatch<SetStateAction<AgentConversationTurn[]>>;
  setAgentConsoleExpanded: Dispatch<SetStateAction<boolean>>;
  setAgentContextMode: Dispatch<SetStateAction<AgentInteractionMode>>;
  setAgentHistory: Dispatch<SetStateAction<string[]>>;
  setAgentHistoryCursor: Dispatch<SetStateAction<number | null>>;
  setAgentPrompt: Dispatch<SetStateAction<string>>;
  setAgentTranscript: Dispatch<SetStateAction<AgentTerminalEntry[]>>;
  setCurrentInvocation: Dispatch<SetStateAction<AgentInvocation | null>>;
  rotateAgentSession: () => void;
};

export type AgentBrowserSessionBinding = Readonly<{
  nonce: string;
  openedAt: string;
}>;

type ActiveAgentRequest = {
  controller: AbortController;
  invocationId: string;
  timeoutId: number;
};

const AgentConsoleSessionContext =
  createContext<AgentConsoleSessionContextValue | null>(null);

function interactionModeLabel(mode: AgentInteractionMode) {
  return mode === "focused"
    ? "Focus"
    : mode === "workspace"
      ? "Workspace"
      : "General";
}

function createInitialTranscript(
  initialContextMode: AgentInteractionMode,
): AgentTerminalEntry[] {
  return [
    {
      id: "boot",
      kind: "system",
      text: "agent-terminal booted",
    },
    {
      id: "mode",
      kind: "system",
      text: `mode: ${interactionModeLabel(initialContextMode)} by default / governed CGG context admission / no raw operational context`,
    },
    {
      id: "help",
      kind: "system",
      text: 'type "help", "status", "context", "clear", or ask a question',
    },
  ];
}

export function AgentConsoleSessionProvider({
  children,
  initialContextMode,
  providerStatus,
  runtimeIdentity,
}: {
  children: ReactNode;
  initialContextMode: AgentInteractionMode;
  providerStatus: AgentProviderStatus | null;
  runtimeIdentity: AgentRuntimeIdentity;
}) {
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentTranscript, setAgentTranscript] = useState<AgentTerminalEntry[]>(
    () => createInitialTranscript(initialContextMode),
  );
  const [agentHistory, setAgentHistory] = useState<string[]>([]);
  const [agentHistoryCursor, setAgentHistoryCursor] = useState<number | null>(
    null,
  );
  const [agentConversationTurns, setAgentConversationTurns] = useState<
    AgentConversationTurn[]
  >([]);
  const [agentContextMode, setAgentContextMode] =
    useState<AgentInteractionMode>(initialContextMode);
  const [agentConsoleExpanded, setAgentConsoleExpanded] = useState(false);
  const [currentInvocation, setCurrentInvocation] =
    useState<AgentInvocation | null>(null);
  const [agentSessionBinding, setAgentSessionBinding] =
    useState<AgentBrowserSessionBinding>(() => createSessionBinding());
  const activeAgentRequestRef = useRef<ActiveAgentRequest | null>(null);
  const agentBusy = currentInvocation?.state === "running";

  const finishAgentRequest = useCallback((invocationId: string) => {
    const activeRequest = activeAgentRequestRef.current;

    if (activeRequest?.invocationId !== invocationId) {
      return;
    }

    window.clearTimeout(activeRequest.timeoutId);
    activeAgentRequestRef.current = null;
  }, []);

  const beginAgentRequest = useCallback((invocationId: string) => {
    if (activeAgentRequestRef.current) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const activeRequest = activeAgentRequestRef.current;

      if (
        activeRequest?.invocationId === invocationId &&
        !activeRequest.controller.signal.aborted
      ) {
        activeRequest.controller.abort(
          createAgentRequestAbortReason("request-timeout"),
        );
      }
    }, agentRequestTimeoutMs);

    activeAgentRequestRef.current = {
      controller,
      invocationId,
      timeoutId,
    };

    return controller.signal;
  }, []);

  const cancelAgentRequest = useCallback(() => {
    const activeRequest = activeAgentRequestRef.current;

    if (!activeRequest || activeRequest.controller.signal.aborted) {
      return false;
    }

    activeRequest.controller.abort(
      createAgentRequestAbortReason("operator-cancelled"),
    );
    return true;
  }, []);

  const rotateAgentSession = useCallback(() => {
    setAgentSessionBinding(createSessionBinding());
  }, []);

  useEffect(
    () => () => {
      const activeRequest = activeAgentRequestRef.current;

      if (!activeRequest) {
        return;
      }

      window.clearTimeout(activeRequest.timeoutId);
      activeRequest.controller.abort(
        createAgentRequestAbortReason("session-ended"),
      );
      activeAgentRequestRef.current = null;
    },
    [],
  );
  const providerState = deriveAgentProviderReadinessState(providerStatus);
  const runtimeState = deriveAgentRuntimeActivityState({
    invocationState: currentInvocation?.state ?? null,
    providerStatus: providerState,
  });

  useAgentRuntimePresenceRegistration({
    ...runtimeIdentity,
    currentOperation:
      currentInvocation?.state === "running" ? "Manual operator request" : null,
    governancePosture: "governed",
    interactionMode: agentContextMode,
    invocationRef: currentInvocation?.id ?? null,
    model: currentInvocation?.model ?? providerStatus?.model ?? null,
    modelProfileRef: providerStatus?.model
      ? `platform://profiles/${providerStatus.model}`
      : null,
    modelProfileVersion: providerStatus?.model ? "1.0" : null,
    operationRunRef: null,
    provider: providerStatus?.provider ?? "governed-ai-gateway",
    state: runtimeState,
  });

  return (
    <AgentConsoleSessionContext.Provider
      value={{
        agentConsoleExpanded,
        agentBusy,
        agentConversationTurns,
        agentContextMode,
        agentHistory,
        agentHistoryCursor,
        agentPrompt,
        agentSessionBinding,
        agentTranscript,
        beginAgentRequest,
        cancelAgentRequest,
        currentInvocation,
        finishAgentRequest,
        rotateAgentSession,
        setAgentConversationTurns,
        setAgentConsoleExpanded,
        setAgentContextMode,
        setAgentHistory,
        setAgentHistoryCursor,
        setAgentPrompt,
        setAgentTranscript,
        setCurrentInvocation,
      }}
    >
      {children}
    </AgentConsoleSessionContext.Provider>
  );
}

function createSessionBinding(): AgentBrowserSessionBinding {
  return {
    nonce: crypto.randomUUID(),
    openedAt: new Date().toISOString(),
  };
}

export function useAgentConsoleSession() {
  const context = useContext(AgentConsoleSessionContext);

  if (!context) {
    throw new Error(
      "Agent Console session must be used inside AgentConsoleSessionProvider.",
    );
  }

  return context;
}
