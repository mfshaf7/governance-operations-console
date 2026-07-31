import type { TerasTone } from "@/teras";
import type { OperationSurfaceStatusModel } from "@/domain-workspaces/operation-projections";

import type { PrototypeWorkspaceReadModel } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeWorkspaceStats } from "../../read-model/selectors/prototype-workspace-selectors.ts";

export type PrototypeSummaryMetric = {
  id: string;
  label: string;
  tone: TerasTone;
  value: number;
};

export function prototypeSummaryMetrics(
  stats: PrototypeWorkspaceStats,
): PrototypeSummaryMetric[] {
  return [
    { id: "total", label: "Total", tone: "info", value: stats.total },
    {
      id: "exploring",
      label: "Exploring",
      tone: "info",
      value: stats.exploring,
    },
    {
      id: "candidate",
      label: "Candidate",
      tone: "warn",
      value: stats.candidate,
    },
    {
      id: "baseline",
      label: "Baseline",
      tone: "ok",
      value: stats.baselineApproved,
    },
    { id: "retired", label: "Retired", tone: "muted", value: stats.retired },
  ];
}

export function prototypeWorkspaceStatus(
  readModel: PrototypeWorkspaceReadModel,
  stats: PrototypeWorkspaceStats,
): OperationSurfaceStatusModel {
  const proposalRoutedCount = readModel.records.filter(
    (record) => record.ingress === "proposal-routed",
  ).length;
  const localEntryCount = readModel.records.filter(
    (record) => record.ingress === "local-entry",
  ).length;
  const returnedMovementCount = readModel.records.filter(
    (record) => record.movementRequest.state === "returned",
  ).length;
  const needsAttention = stats.blocked > 0 || returnedMovementCount > 0;
  const postureTone =
    stats.blocked > 0 ? "danger" : returnedMovementCount > 0 ? "warn" : "ok";

  return {
    ariaLabel: "Prototype workspace status details",
    detailDataAttribute: "data-prototype-status-modal",
    items: [
      {
        detail: needsAttention
          ? "Explicit blockers or returned movement requests need operator attention."
          : "No explicit Landing, Baseline, issue, or returned movement conditions need attention.",
        facts: [
          { label: "Records", value: String(stats.total) },
          { label: "Blocked", value: String(stats.blocked) },
          { label: "Movement Ready", value: String(stats.movementReady) },
          { label: "Returned", value: String(returnedMovementCount) },
        ],
        id: "record-posture",
        label: "Posture",
        state:
          stats.blocked > 0
            ? "blocked"
            : returnedMovementCount > 0
              ? "degraded"
              : "ready",
        tone: postureTone,
      },
      {
        detail:
          "Prototype Control merges registry records with proposal-routed and local-entry records.",
        facts: [
          { label: "Registry", value: readModel.source.registry },
          { label: "Total Records", value: String(readModel.records.length) },
          { label: "Proposal Routed", value: String(proposalRoutedCount) },
          { label: "Local Entries", value: String(localEntryCount) },
          { label: "Last Read", value: readModel.source.lastRead },
        ],
        id: "source-projection",
        label: "Source",
        state: "local",
        tone: "info",
      },
      {
        detail:
          "Prototype requests, workflow receipts, and preview proof remain prototype-local until a future backend command path is admitted.",
        facts: [
          { label: "Mutation", value: readModel.source.mutationGateway },
          { label: "Receipt Scope", value: "local prototype session" },
          { label: "Backend Write", value: "not connected" },
          { label: "Durable Source", value: readModel.source.registry },
        ],
        id: "write-path",
        label: "Write Path",
        state: "local",
        tone: "warn",
      },
      {
        detail:
          "Prototype prepares transition evidence and intent; target authorities own validation, admission, and application.",
        facts: [
          { label: "Transition View", value: "Lifecycle Transitions" },
          { label: "Prototype Role", value: "evidence and intent" },
          { label: "Cross-boundary Receipt", value: "not owned here" },
          { label: "Target Authority", value: "route-specific" },
        ],
        id: "movement",
        label: "Handoff",
        state: "local",
        tone: "warn",
      },
    ],
    kicker: "Prototype Status",
    statusLabel: needsAttention ? "attention" : "healthy",
    summary: needsAttention
      ? "Prototype-local record posture has explicit work requiring operator attention."
      : "Prototype-local record posture has no explicit blockers or returned movement requests.",
    title: needsAttention
      ? "Prototype records need attention"
      : "Prototype records are healthy",
    tone: postureTone,
  };
}
