"use client";

import { useState } from "react";
import { ScanSearch, ShieldCheck } from "lucide-react";

import { TerasDialog, TerasMetadataList } from "@/teras";

import {
  evaluateAgentContextPolicy,
  type AgentContextDecision,
  type AgentInteractionMode,
} from "../../agent-console/model/agent-context-policy";
import type { AgentContextCandidate } from "../context/agent-context-candidate";
import {
  ConsoleShellPanel,
  ConsoleShellSectionTitle,
} from "../console-shell-panel";
import styles from "./agent-context-panel.module.css";

type AgentContextProjection = {
  detail: string;
  label: string;
  state: "available" | "detached" | "unavailable";
};

function contextProjection(
  decision: AgentContextDecision,
): AgentContextProjection {
  if (decision.code === "focused-synthetic-attached") {
    return {
      detail:
        "The prototype-local policy can attach this synthetic candidate in Focus mode.",
      label: "Eligible",
      state: "available",
    };
  }

  if (decision.code === "general-detached") {
    return {
      detail: "General requests do not receive console context.",
      label: "Detached",
      state: "detached",
    };
  }

  if (decision.code === "workspace-unavailable") {
    return {
      detail:
        "Workspace mode requires a governed workspace packet source.",
      label: "Unavailable",
      state: "unavailable",
    };
  }

  if (decision.code === "cgg-required") {
    return {
      detail:
        "This visible live or source-projected candidate requires governed CGG admission.",
      label: "CGG required",
      state: "unavailable",
    };
  }

  return {
    detail: decision.reason,
    label:
      decision.code === "context-budget-exceeded"
        ? "Over budget"
        : "Unavailable",
    state: "unavailable",
  };
}

function modeLabel(mode: AgentInteractionMode) {
  return mode === "focused"
    ? "Focus"
    : mode === "workspace"
      ? "Workspace"
      : "General";
}

function sourceModeLabel(sourceMode: AgentContextCandidate["sourceMode"]) {
  return sourceMode === "source-projected"
    ? "Source projected"
    : sourceMode === "live"
      ? "Live"
      : sourceMode === "synthetic"
        ? "Synthetic"
        : "Unavailable";
}

function formatContextTimestamp(value: string | null) {
  if (!value) {
    return "Not observed";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

export function AgentContextPanel({
  candidate,
  mode,
}: {
  candidate: AgentContextCandidate | null;
  mode: AgentInteractionMode;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const decision = evaluateAgentContextPolicy({ candidate, mode });
  const projection = contextProjection(decision);
  const references = candidate?.refs ?? [];
  const sourceTitle =
    candidate?.title ??
    (mode === "workspace"
      ? "Workspace context is not connected"
      : "No console context selected");
  const sourceDetail =
    candidate?.summary ??
    (mode === "workspace"
      ? "Use Focus mode for the active page context."
      : "Switch to Focus mode to make page context available.");

  return (
    <>
      <ConsoleShellPanel className={styles.panel}>
        <div className={styles.header}>
          <ConsoleShellSectionTitle
            kicker="Embedded Agent"
            title="Agent Context"
          />
          <span className={styles.state} data-state={projection.state}>
            {projection.label}
          </span>
        </div>
        <p className={styles.description}>
          See the visible candidate and its model-projection decision.
        </p>

        <div className={styles.source}>
          <span className={styles.sourceLabel}>Current source</span>
          <strong title={sourceTitle}>{sourceTitle}</strong>
          <p title={sourceDetail}>{sourceDetail}</p>
        </div>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <span>Mode</span>
            <strong>{modeLabel(mode)}</strong>
          </div>
          <div className={styles.fact}>
            <span>Source mode</span>
            <strong>
              {candidate
                ? sourceModeLabel(candidate.sourceMode)
                : "Unavailable"}
            </strong>
          </div>
          <div className={styles.fact}>
            <span>Scope</span>
            <strong>
              {candidate
                ? candidate.scope === "workspace"
                  ? "Workspace"
                  : "Page"
                : "None"}
            </strong>
          </div>
          <div className={styles.fact}>
            <span>Freshness</span>
            <strong>{candidate?.freshness ?? "Unavailable"}</strong>
          </div>
        </div>

        <div className={styles.requestUse}>
          <span className={styles.requestUseIcon}>
            <ShieldCheck aria-hidden="true" size={14} />
          </span>
          <div>
            <span>Request use</span>
            <p>{projection.detail}</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.inspectButton}
            disabled={!candidate}
            onClick={() => setDetailsOpen(true)}
            type="button"
          >
            <ScanSearch aria-hidden="true" size={13} />
            Inspect context
          </button>
        </div>
      </ConsoleShellPanel>

      <TerasDialog
        contentOverflow="auto"
        height="content"
        description="Structured candidate and the prototype-local decision that controls model projection."
        kicker="Agent Context"
        onClose={() => setDetailsOpen(false)}
        open={detailsOpen && Boolean(candidate)}
        title="Context Candidate"
        width="standard"
      >
        {candidate ? (
          <TerasMetadataList
            columns={2}
            items={[
              {
                label: "Projection",
                tone: decision.attached ? "ok" : "muted",
                value: projection.label,
              },
              { label: "Mode", value: modeLabel(mode) },
              {
                label: "Local Policy",
                value: decision.policyProfile,
              },
              { label: "Surface", value: candidate.title },
              {
                label: "Summary",
                value: candidate.summary,
              },
              {
                label: "Source Authority",
                value: candidate.sourceAuthority,
              },
              {
                label: "Source Mode",
                value: sourceModeLabel(candidate.sourceMode),
              },
              {
                label: "Scope",
                value:
                  candidate.scope === "workspace" ? "Workspace" : "Page",
              },
              { label: "Freshness", value: candidate.freshness },
              {
                label: "Observed",
                value: formatContextTimestamp(candidate.observedAt),
              },
              {
                label: "Projected",
                value: formatContextTimestamp(candidate.projectedAt),
              },
              {
                label: "Request Context",
                value: `${decision.budgetUsedChars}/${decision.budgetLimitChars} characters`,
              },
              {
                label: "Candidate Size",
                value: `${decision.candidateChars} characters`,
              },
              {
                label: "Input Screening",
                value: "Secret-like input is rejected before a request",
              },
              {
                label: "CGG Receipt",
                value: "Not available in prototype-local mode",
              },
              {
                detail:
                  candidate.safeActions.join(" / ") ||
                  "No guidance scope declared.",
                label: "Guidance Scope",
                value: `${candidate.safeActions.length} declared`,
              },
              {
                detail:
                  candidate.signals.join(" / ") ||
                  "No context signals declared.",
                label: "Signals",
                value: `${candidate.signals.length} available`,
              },
              {
                detail: references.join(" / ") || "No references declared.",
                label: "References",
                value: `${references.length} available`,
              },
              {
                label: "Boundary",
                value: candidate.boundary,
              },
            ]}
            wrap
          />
        ) : null}
      </TerasDialog>
    </>
  );
}
