import type {
  CommandCenterAttentionCandidate,
} from "../../command-center/read-model/command-center-attention.ts";
import type { ConsoleWorkspaceId } from "../../console-architecture";
import {
  createAgentContextCandidate,
  type AgentContextCandidate,
  type AgentContextCandidateTone,
  type AgentContextSourceMode,
} from "./agent-context-candidate.ts";

type OperationWorkbenchContextInput = {
  availability: "available" | "unavailable";
  detail: string;
  domain: string;
  label: string;
  runtimeReadiness: "interactive" | "read-only" | "unavailable";
  sourceMode: "prototype-local" | "source-projected" | "unavailable";
};

type ComponentContextInput = {
  freshness: string;
  href: string | null;
  label: string;
  observedAt: string | null;
  sourceAuthority: string;
  sourceMode: string;
  status: string;
  surface: string;
  tone: string;
};

type AlertContextInput = {
  detail: string;
  evidence: string;
  freshness: string;
  id: string;
  label: string;
  nextMove: string;
  observedAt: string | null;
  scope: string;
  source: string;
  sourceMode: string;
  status: string;
  tone: string;
};

type ResourceMetricContextInput = {
  capturedAt: string;
  current: string;
  id: string;
  normalRange: string;
  operatorRead: string;
  sourceLabel: string;
  sourceMode: "live" | "mock";
  threshold: string;
  tone: string;
  trend: string;
};

type PulseMetricContextInput = {
  detail: string;
  id: string;
  label: string;
  projectionAuthority: string;
  projectionLabel: string;
  projectionMode: "cached" | "live" | "synthetic";
  sourceSummary: string;
  stateLabel: string;
  tone: string;
  value: string;
};

type SystemMoodContextInput = {
  detail: string;
  id: string;
  label: string;
  projectionAuthority: string;
  projectionLabel: string;
  projectionMode: "cached" | "live" | "synthetic";
  sourceSummary: string;
  tone: string;
};

function asContextTone(
  tone: string | null | undefined,
  fallback: AgentContextCandidateTone = "muted",
): AgentContextCandidateTone {
  if (
    tone === "ok" ||
    tone === "warn" ||
    tone === "muted" ||
    tone === "info" ||
    tone === "danger" ||
    tone === "stale"
  ) {
    return tone;
  }

  return fallback;
}

function pulseSourceMode(
  mode: PulseMetricContextInput["projectionMode"],
): AgentContextSourceMode {
  if (mode === "live") {
    return "live";
  }

  if (mode === "cached") {
    return "source-projected";
  }

  return "synthetic";
}

function asSourceMode(sourceMode: string): AgentContextSourceMode {
  if (sourceMode === "live") {
    return "live";
  }

  if (sourceMode === "source-projected") {
    return "source-projected";
  }

  if (sourceMode === "unavailable") {
    return "unavailable";
  }

  return "synthetic";
}

function asObservedAt(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) {
    return null;
  }

  return value;
}

export function defaultPageContextCandidate() {
  return createAgentContextCandidate({
    boundary:
      "Prototype console context only. No backend mutation or raw operational data is attached.",
    displayTone: "info",
    id: "page:command-center-default",
    safeActions: [
      "Ask about the current focus",
      "Inspect visible synthetic signals",
      "Request an approved source check later",
    ],
    scope: "page",
    signals: [],
    sourceAuthority: "Command Center attention projection",
    sourceMode: "synthetic",
    status: "no current priority",
    summary:
      "Command Center Focus has no selected owner-issued priority.",
    surfaceKind: "command-center",
    title: "Command Center Focus",
  });
}

function attentionContextTone(
  candidate: CommandCenterAttentionCandidate,
): AgentContextCandidateTone {
  if (candidate.source.freshness === "unavailable") {
    return "danger";
  }

  if (
    candidate.source.freshness === "stale" ||
    candidate.source.freshness === "unverified"
  ) {
    return "stale";
  }

  if (candidate.urgency === "critical") {
    return "danger";
  }

  if (candidate.urgency === "high") {
    return "warn";
  }

  return candidate.urgency === "normal" ? "info" : "muted";
}

function attentionSourceMode(
  candidate: CommandCenterAttentionCandidate,
): AgentContextSourceMode {
  if (candidate.source.mode === "live") {
    return "live";
  }

  if (candidate.source.mode === "source-projected") {
    return "source-projected";
  }

  return "synthetic";
}

export function attentionContextCandidate(
  candidate: CommandCenterAttentionCandidate,
) {
  return createAgentContextCandidate({
    boundary:
      "Command Center Focus is read-only. The owning surface retains action, decision, and mutation authority.",
    displayTone: attentionContextTone(candidate),
    freshness: candidate.source.freshness,
    id: `page:command-center-focus:${candidate.candidateId}`,
    observedAt: asObservedAt(candidate.source.observedAt),
    projectedAt: candidate.source.projectedAt,
    refs: [
      candidate.subject.ref,
      candidate.source.ref,
      ...candidate.receiptRefs,
      ...candidate.evidenceRefs,
    ],
    safeActions: [
      "Explain the selected required move",
      "Summarize the owner projection",
      "Clarify the route and source boundary",
    ],
    scope: "page",
    signals: [
      `required move: ${candidate.requiredMove.label}`,
      `owner: ${candidate.owner.label}`,
      `urgency: ${candidate.urgency}`,
      `attention class: ${candidate.attentionClass}`,
    ],
    sourceAuthority: candidate.source.authority,
    sourceMode: attentionSourceMode(candidate),
    status: candidate.requiredMove.label,
    summary: candidate.reason,
    surfaceKind: "command-center-focus",
    title: candidate.subject.title,
  });
}

export function operationWorkbenchContextCandidate(
  path: OperationWorkbenchContextInput,
) {
  return createAgentContextCandidate({
    boundary:
      "Operation Workbench context only. Each domain retains its workflow and mutation boundary.",
    displayTone: "muted",
    id: `page:operation-workbench:${path.label.toLowerCase()}`,
    refs: [`operation-workbench://${path.domain}`],
    safeActions: [
      "Explain the intake path",
      "Summarize the next safe operator step",
      "Clarify the approval boundary",
    ],
    scope: "page",
    signals: [
      `availability: ${path.availability}`,
      `runtime readiness: ${path.runtimeReadiness}`,
      `source mode: ${path.sourceMode}`,
    ],
    sourceAuthority: "Operation Workbench domain registry",
    sourceMode: "synthetic",
    status: path.runtimeReadiness,
    summary: path.detail,
    surfaceKind: "operation-workbench",
    title: path.label,
  });
}

export function componentContextCandidate(component: ComponentContextInput) {
  return createAgentContextCandidate({
    boundary:
      "Component Status context only. Live health must come from approved source checks.",
    displayTone: asContextTone(component.tone),
    freshness: component.freshness,
    id: `page:component:${component.label.toLowerCase()}`,
    observedAt: asObservedAt(component.observedAt),
    refs: component.href ? [component.href] : [],
    safeActions: [
      "Explain component status",
      "Describe the next read-only inspection",
      "Request approved source verification",
    ],
    scope: "page",
    signals: [
      `status: ${component.status}`,
      `surface: ${component.surface}`,
      `source mode: ${component.sourceMode}`,
    ],
    sourceAuthority: component.sourceAuthority,
    sourceMode: asSourceMode(component.sourceMode),
    status: component.status,
    summary: `${component.label} is selected in Component Status with surface ${component.surface}.`,
    surfaceKind: "component",
    title: component.label,
  });
}

export function alertContextCandidate(alert: AlertContextInput) {
  return createAgentContextCandidate({
    boundary:
      "Alert context only. Agent guidance cannot mutate runtime state.",
    displayTone: asContextTone(alert.tone),
    freshness: alert.freshness,
    id: `page:alert:${alert.id}`,
    observedAt: asObservedAt(alert.observedAt),
    refs: [alert.source],
    safeActions: [
      "Explain alert impact",
      "Summarize evidence",
      "Suggest the next read-only inspection",
    ],
    scope: "page",
    signals: [
      `status: ${alert.status}`,
      `scope: ${alert.scope}`,
      `evidence: ${alert.evidence}`,
      `next: ${alert.nextMove}`,
    ],
    sourceAuthority: alert.source,
    sourceMode: asSourceMode(alert.sourceMode),
    status: alert.status,
    summary: alert.detail,
    surfaceKind: "runtime-alert",
    title: alert.label,
  });
}

export function resourceContextCandidate(metric: ResourceMetricContextInput) {
  return createAgentContextCandidate({
    boundary:
      "Resource metric context only. Live diagnosis requires an approved fresh resource probe.",
    displayTone: asContextTone(metric.tone),
    freshness: `${metric.sourceMode} / ${metric.capturedAt}`,
    id: `page:resource:${metric.id.toLowerCase()}`,
    observedAt:
      metric.sourceMode === "live" ? asObservedAt(metric.capturedAt) : null,
    refs: [metric.sourceLabel],
    safeActions: [
      "Explain the selected resource metric",
      "Interpret the captured trend",
      "Clarify source freshness",
    ],
    scope: "page",
    signals: [
      `current: ${metric.current}`,
      `trend: ${metric.trend}`,
      `threshold: ${metric.threshold}`,
      `normal: ${metric.normalRange}`,
    ],
    sourceAuthority: metric.sourceLabel,
    sourceMode: metric.sourceMode === "live" ? "live" : "synthetic",
    status: metric.tone,
    summary: metric.operatorRead,
    surfaceKind: "resource-metric",
    title: metric.id,
  });
}

export function pulseContextCandidate(metric: PulseMetricContextInput) {
  return createAgentContextCandidate({
    boundary:
      "Workspace Pulse is a read-only aggregate. Changes remain with each owning operation or workspace.",
    displayTone: asContextTone(metric.tone),
    freshness: metric.projectionLabel,
    id: `page:pulse:${metric.id}`,
    refs: [metric.sourceSummary],
    safeActions: [
      "Explain the pulse state",
      "Summarize projected records",
      "Identify the owning surface",
    ],
    scope: "page",
    signals: [
      `state: ${metric.stateLabel}`,
      `value: ${metric.value}`,
      `coverage: ${metric.sourceSummary}`,
    ],
    sourceAuthority: metric.projectionAuthority,
    sourceMode: pulseSourceMode(metric.projectionMode),
    status: metric.stateLabel,
    summary: metric.detail,
    surfaceKind: "workspace-pulse",
    title: metric.label,
  });
}

export function systemMoodContextCandidate(mood: SystemMoodContextInput) {
  return createAgentContextCandidate({
    boundary:
      "System Mood explains the read-only Workspace Pulse aggregate. It does not own source mutations.",
    displayTone: asContextTone(mood.tone),
    freshness: mood.projectionLabel,
    id: "page:system-mood",
    refs: [mood.sourceSummary],
    safeActions: [
      "Explain the aggregate posture",
      "Describe contributing pulse signals",
      "Identify source-coverage limitations",
    ],
    scope: "page",
    signals: [mood.sourceSummary],
    sourceAuthority: mood.projectionAuthority,
    sourceMode: pulseSourceMode(mood.projectionMode),
    status: mood.id,
    summary: mood.detail,
    surfaceKind: "system-mood",
    title: mood.label,
  });
}

export function workspaceContextCandidate(
  workspaceId: ConsoleWorkspaceId,
): AgentContextCandidate {
  if (workspaceId === "lifecycle-transitions") {
    return createAgentContextCandidate({
      boundary:
        "Lifecycle transition context is synthetic and read-only. Transition requests retain their own approval authority.",
      displayTone: "info",
      id: "workspace:lifecycle-transitions",
      refs: ["Lifecycle transition projection fixtures"],
      safeActions: [
        "Explain a projected transition",
        "Summarize a request profile",
        "Clarify the transition authority boundary",
      ],
      scope: "workspace",
      signals: [
        "transition register available",
        "request profiles available",
        "no live transition authority",
      ],
      sourceAuthority: "Lifecycle transition projection fixtures",
      sourceMode: "synthetic",
      status: "prototype projection",
      summary:
        "Review projected lifecycle transitions and their governed request boundaries.",
      surfaceKind: "lifecycle-transitions",
      title: "Lifecycle Transitions",
    });
  }

  if (workspaceId === "dev-integration") {
    return createAgentContextCandidate({
      boundary:
        "Dev Integration context is synthetic and read-only. Profile launch and admission remain separate operator actions.",
      displayTone: "info",
      id: "workspace:dev-integration",
      refs: ["Dev Integration profile fixtures"],
      safeActions: [
        "Explain a profile lifecycle",
        "Summarize projected profile posture",
        "Clarify admission and launch boundaries",
      ],
      scope: "workspace",
      signals: [
        "profile register available",
        "profile history available",
        "no live profile mutation",
      ],
      sourceAuthority: "Dev Integration profile fixtures",
      sourceMode: "synthetic",
      status: "prototype projection",
      summary:
        "Review projected local integration profiles, admission posture, and launch readiness.",
      surfaceKind: "dev-integration",
      title: "Dev Integration",
    });
  }

  return createAgentContextCandidate({
    boundary:
      "Governed Releases context is synthetic and read-only. Promotion and release authority remain outside Agent Console.",
    displayTone: "info",
    id: "workspace:governed-releases",
    refs: ["Product release capability fixtures"],
    safeActions: [
      "Explain projected release capability",
      "Summarize release readiness",
      "Clarify promotion authority",
    ],
    scope: "workspace",
    signals: [
      "release capability register available",
      "readiness projection available",
      "no release mutation",
    ],
    sourceAuthority: "Product release capability fixtures",
    sourceMode: "synthetic",
    status: "prototype projection",
    summary:
      "Review projected product release capability and governed promotion boundaries.",
    surfaceKind: "governed-releases",
    title: "Governed Releases",
  });
}

export function resolveConsoleAgentContextCandidate({
  activeWorkspaceId,
  selectedAttentionCandidate,
  selectedAlert,
  selectedComponent,
  selectedWorkbenchSurface,
  selectedPulseSignal,
  selectedResourceMetric,
  systemMood,
  systemMoodOpen,
}: {
  activeWorkspaceId: ConsoleWorkspaceId | null;
  selectedAttentionCandidate: CommandCenterAttentionCandidate | null;
  selectedAlert: AlertContextInput | null;
  selectedComponent: ComponentContextInput | null;
  selectedWorkbenchSurface: OperationWorkbenchContextInput | null;
  selectedPulseSignal: PulseMetricContextInput | null;
  selectedResourceMetric: ResourceMetricContextInput | null;
  systemMood: SystemMoodContextInput;
  systemMoodOpen: boolean;
}): AgentContextCandidate {
  if (activeWorkspaceId) {
    return workspaceContextCandidate(activeWorkspaceId);
  }

  if (selectedWorkbenchSurface) {
    return operationWorkbenchContextCandidate(selectedWorkbenchSurface);
  }

  if (selectedResourceMetric) {
    return resourceContextCandidate(selectedResourceMetric);
  }

  if (selectedAlert) {
    return alertContextCandidate(selectedAlert);
  }

  if (selectedComponent) {
    return componentContextCandidate(selectedComponent);
  }

  if (systemMoodOpen) {
    return systemMoodContextCandidate(systemMood);
  }

  if (selectedPulseSignal) {
    return pulseContextCandidate(selectedPulseSignal);
  }

  if (selectedAttentionCandidate) {
    return attentionContextCandidate(selectedAttentionCandidate);
  }

  return defaultPageContextCandidate();
}
