"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AgentRuntimeIdentity,
  type AgentRuntimeObservation,
  type AgentRuntimePresence,
  selectActiveAgentRuntimes,
} from "../model/agent-runtime-presence";

type AgentRuntimePresenceContextValue = {
  activeRuntimes: AgentRuntimePresence[];
  heartbeatRuntime: (runtimeId: string) => void;
  observeRuntime: (observation: AgentRuntimeObservation) => void;
  registerRuntime: (identity: AgentRuntimeIdentity) => void;
  unregisterRuntime: (runtimeId: string) => void;
};

const AgentRuntimePresenceContext =
  createContext<AgentRuntimePresenceContextValue | null>(null);

function runtimeTimestamp() {
  return new Date().toISOString();
}

export function AgentRuntimePresenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [runtimeMap, setRuntimeMap] = useState<
    Record<string, AgentRuntimePresence>
  >({});

  const registerRuntime = useCallback((identity: AgentRuntimeIdentity) => {
    const timestamp = runtimeTimestamp();

    setRuntimeMap((current) => {
      if (current[identity.runtimeId]) {
        return current;
      }

      return {
        ...current,
        [identity.runtimeId]: {
          ...identity,
          currentOperation: null,
          governancePosture: "unresolved",
          interactionMode: "general",
          invocationRef: null,
          lastActivityAt: timestamp,
          lastHeartbeatAt: timestamp,
          model: null,
          modelProfileRef: null,
          modelProfileVersion: null,
          operationRunRef: null,
          provider: "unresolved",
          startedAt: timestamp,
          state: "waiting",
        },
      };
    });
  }, []);

  const observeRuntime = useCallback(
    (observation: AgentRuntimeObservation) => {
      const timestamp = runtimeTimestamp();

      setRuntimeMap((current) => {
        const existing = current[observation.runtimeId];

        if (!existing) {
          return current;
        }

        const activityChanged =
          observation.state === "working" ||
          observation.state !== existing.state ||
          observation.currentOperation !== existing.currentOperation;

        return {
          ...current,
          [observation.runtimeId]: {
            ...existing,
            ...observation,
            lastActivityAt: activityChanged
              ? timestamp
              : existing.lastActivityAt,
            lastHeartbeatAt: timestamp,
          },
        };
      });
    },
    [],
  );

  const heartbeatRuntime = useCallback((runtimeId: string) => {
    const timestamp = runtimeTimestamp();

    setRuntimeMap((current) => {
      const existing = current[runtimeId];

      return existing
        ? {
            ...current,
            [runtimeId]: {
              ...existing,
              lastHeartbeatAt: timestamp,
            },
          }
        : current;
    });
  }, []);

  const unregisterRuntime = useCallback((runtimeId: string) => {
    setRuntimeMap((current) => {
      if (!current[runtimeId]) {
        return current;
      }

      const next = { ...current };
      delete next[runtimeId];
      return next;
    });
  }, []);

  const activeRuntimes = useMemo(
    () => selectActiveAgentRuntimes(Object.values(runtimeMap)),
    [runtimeMap],
  );
  const value = useMemo(
    () => ({
      activeRuntimes,
      heartbeatRuntime,
      observeRuntime,
      registerRuntime,
      unregisterRuntime,
    }),
    [
      activeRuntimes,
      heartbeatRuntime,
      observeRuntime,
      registerRuntime,
      unregisterRuntime,
    ],
  );

  return (
    <AgentRuntimePresenceContext.Provider value={value}>
      {children}
    </AgentRuntimePresenceContext.Provider>
  );
}

function useAgentRuntimePresenceContext() {
  const context = useContext(AgentRuntimePresenceContext);

  if (!context) {
    throw new Error(
      "Agent runtime presence must be used inside AgentRuntimePresenceProvider.",
    );
  }

  return context;
}

export function useActiveAgentRuntimes() {
  return useAgentRuntimePresenceContext().activeRuntimes;
}

export function useAgentRuntimePresenceRegistration({
  callerId,
  currentOperation,
  displayName,
  governancePosture,
  interactionMode,
  invocationRef,
  model,
  modelProfileRef,
  modelProfileVersion,
  operationRunRef,
  ownerSurface,
  provider,
  runtimeId,
  sourceAuthority,
  sourceRef,
  state,
}: AgentRuntimeIdentity &
  Omit<AgentRuntimeObservation, "runtimeId">) {
  const {
    heartbeatRuntime,
    observeRuntime,
    registerRuntime,
    unregisterRuntime,
  } = useAgentRuntimePresenceContext();

  useEffect(() => {
    registerRuntime({
      callerId,
      displayName,
      ownerSurface,
      runtimeId,
      sourceAuthority,
      sourceRef,
    });
    const heartbeatId = window.setInterval(
      () => heartbeatRuntime(runtimeId),
      5_000,
    );

    return () => {
      window.clearInterval(heartbeatId);
      unregisterRuntime(runtimeId);
    };
  }, [
    callerId,
    displayName,
    heartbeatRuntime,
    ownerSurface,
    registerRuntime,
    runtimeId,
    sourceAuthority,
    sourceRef,
    unregisterRuntime,
  ]);

  useEffect(() => {
    observeRuntime({
      currentOperation,
      governancePosture,
      interactionMode,
      invocationRef,
      model,
      modelProfileRef,
      modelProfileVersion,
      operationRunRef,
      provider,
      runtimeId,
      state,
    });
  }, [
    currentOperation,
    governancePosture,
    interactionMode,
    invocationRef,
    model,
    modelProfileRef,
    modelProfileVersion,
    observeRuntime,
    operationRunRef,
    provider,
    runtimeId,
    state,
  ]);
}
