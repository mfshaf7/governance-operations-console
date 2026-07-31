"use client";

import { Bot } from "lucide-react";
import { useState } from "react";

import {
  AgentRuntimePresenceDialog,
  AgentRuntimeStatusDialog,
  deriveAgentProviderReadinessState,
  agentRuntimeStateLabel,
  type AgentRuntimeActivityState,
  type AgentProviderStatus,
  useActiveAgentRuntimes,
} from "../../agent-console";
import {
  consoleStatusCardClass,
  consoleToneClass,
  type ConsoleTone,
} from "../console-shell-status";

import styles from "./agent-runtime-dock.module.css";

const presenceTone: Record<AgentRuntimeActivityState, ConsoleTone> = {
  failed: "danger",
  idle: "ok",
  waiting: "warn",
  working: "ok",
};

export function AgentRuntimeDock({
  providerStatus,
}: {
  providerStatus: AgentProviderStatus | null;
}) {
  const [runtimeStatusOpen, setRuntimeStatusOpen] = useState(false);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(
    null,
  );
  const activeRuntimes = useActiveAgentRuntimes();
  const selectedRuntime =
    activeRuntimes.find(
      (runtime) => runtime.runtimeId === selectedRuntimeId,
    ) ?? null;
  const providerState = deriveAgentProviderReadinessState(providerStatus);
  const providerOnline = providerState === "online";
  const runtimeHasFailure = activeRuntimes.some(
    (runtime) => runtime.state === "failed",
  );
  const runtimeIsWaiting = activeRuntimes.some(
    (runtime) => runtime.state === "waiting",
  );
  const runtimeTone: ConsoleTone = !providerStatus
    ? "info"
    : providerState === "offline" || runtimeHasFailure
      ? "danger"
      : providerState === "probing" || runtimeIsWaiting
        ? "warn"
        : "ok";
  const runtimeStateLabel = providerStatus
    ? providerState === "offline"
      ? "OFFLINE"
      : providerState === "probing"
        ? providerStatus.observedAt
          ? "STALE"
          : "UNAVAILABLE"
        : runtimeHasFailure || runtimeIsWaiting
          ? "ATTENTION"
          : "HEALTHY"
    : "PROBING";
  const providerLabel = providerStatus
    ? providerOnline
      ? "Local Ollama"
      : providerState === "offline"
        ? "Provider unavailable"
        : providerStatus.observedAt
          ? "Observation stale"
          : "Provider unavailable"
    : "Resolving provider";
  const modelLabel = providerStatus
    ? providerOnline
      ? providerStatus.model ?? "model ready"
      : providerState === "offline"
        ? "no model"
        : providerStatus.model ?? "waiting"
    : "waiting";
  const runtimeDetail = providerStatus
    ? providerOnline
      ? `${activeRuntimes.length} active runtime${
          activeRuntimes.length === 1 ? "" : "s"
        } / ${providerStatus.modelCount} models available`
      : providerStatus.error ??
        (providerState === "offline"
          ? "endpoint unavailable"
          : "Fresh provider observation unavailable.")
    : "Checking the model endpoint.";

  return (
    <>
      <aside aria-label="Agent runtime" className={styles.dock}>
        <button
          aria-label="Open Agent Runtime status"
          className={consoleStatusCardClass(
            runtimeTone,
            styles.statusCard,
          )}
          onClick={() => setRuntimeStatusOpen(true)}
          type="button"
        >
          <div className={styles.statusHeader}>
            <span className={styles.statusTitle}>
              <Bot
                className={`h-4 w-4 ${consoleToneClass[runtimeTone]}`}
              />
              AGENT RUNTIME
            </span>
            <span className={styles.statePill}>
              {runtimeStateLabel}
            </span>
          </div>
          <div className={styles.providerShell}>
            <p className={styles.providerLabel}>Model Provider</p>
            <div className={styles.providerRow}>
              <p className={styles.providerName}>{providerLabel}</p>
              <span className={styles.modelPill}>
                {modelLabel}
              </span>
            </div>
          </div>
          <p className={styles.runtimeDetail}>{runtimeDetail}</p>
          <p className={styles.openHint}>
            Open Runtime Status
          </p>
        </button>

        <section
          aria-label="Active agent runtimes"
          className={styles.roster}
        >
          <div className={styles.rosterHeader}>
            <p>Active agent runtimes</p>
            <span>{activeRuntimes.length}</span>
          </div>
          <div className={styles.runtimeList}>
            {activeRuntimes.length ? (
              activeRuntimes.map((runtime) => {
                const tone = presenceTone[runtime.state];

                return (
                  <button
                    aria-label={`Inspect ${runtime.displayName}`}
                    className={styles.runtimeRow}
                    key={runtime.runtimeId}
                    onClick={() => setSelectedRuntimeId(runtime.runtimeId)}
                    type="button"
                  >
                    <span className={styles.runtimeRowHeader}>
                      <strong>{runtime.displayName}</strong>
                      <span
                        className={`${styles.runtimeRowStatus} ${consoleToneClass[tone]}`}
                      >
                        <span aria-hidden="true" className={styles.statusDot} />
                        {agentRuntimeStateLabel[runtime.state]}
                      </span>
                    </span>
                    <span className={styles.runtimeRowMeta}>
                      <span>{runtime.ownerSurface}</span>
                      <span>{runtime.model ?? runtime.provider}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className={styles.emptyRoster}>
                No active agent runtime heartbeat.
              </div>
            )}
          </div>
        </section>
      </aside>

      <AgentRuntimeStatusDialog
        activeRuntimeCount={activeRuntimes.length}
        onClose={() => setRuntimeStatusOpen(false)}
        open={runtimeStatusOpen}
        providerStatus={providerStatus}
      />
      <AgentRuntimePresenceDialog
        onClose={() => setSelectedRuntimeId(null)}
        open={Boolean(selectedRuntime)}
        runtime={selectedRuntime}
      />
    </>
  );
}
