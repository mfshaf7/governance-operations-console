import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionClass,
  ConsoleAttentionSource,
  ConsoleAttentionUrgency,
} from "../../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import type {
  OrchestrationAttentionCondition,
  OrchestrationAttentionItem,
} from "./workspace/orchestration-workspace-read-model.ts";
import {
  getOrchestrationWorkspaceProjectionSnapshot,
  subscribeOrchestrationWorkspaceProjection,
} from "../local-runtime/orchestration-workspace-runtime.ts";

const registration = consoleAttentionSourceRegistrations.orchestration;
let cachedWorkspace = getOrchestrationWorkspaceProjectionSnapshot();
let cachedSnapshot = orchestrationAttentionSnapshot(cachedWorkspace);

export const orchestrationAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const workspace = getOrchestrationWorkspaceProjectionSnapshot();
    if (workspace !== cachedWorkspace) {
      cachedWorkspace = workspace;
      cachedSnapshot = orchestrationAttentionSnapshot(workspace);
    }
    return cachedSnapshot;
  },
  registration,
  subscribe: subscribeOrchestrationWorkspaceProjection,
};

function orchestrationAttentionCandidate(
  item: OrchestrationAttentionItem,
  projectedAt: string,
): ConsoleAttentionCandidate {
  const requiredMoveId = `orchestration.${item.kind}.${slug(item.requiredMove)}`;

  return {
    attentionClass: orchestrationAttentionClass(item.condition),
    candidateId: `orchestration:${item.id}:${requiredMoveId}`,
    correlationRef: item.id,
    dedupeKey: `${item.id}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: [],
    owner: {
      label: item.owner,
      ref: `owner://${item.owner}`,
    },
    ownerRank: orchestrationOwnerRank(item.condition),
    reason: item.detail,
    receiptRefs: [],
    requiredMove: {
      id: requiredMoveId,
      label: item.requiredMove,
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode:
          item.condition === "blocked" || item.condition === "failed"
            ? "resolve"
            : "review",
        requiredMoveRef: requiredMoveId,
        subjectRef: item.id,
        target: {
          id: "workbench:orchestration",
          kind: "workbench-domain",
          surfaceLabel: "ORCHESTRATION",
        },
      },
      externalHref: null,
      label: "Open Orchestration",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "operator-orchestration-service-contract",
      freshness: "current",
      mode: "synthetic",
      observedAt: item.updatedAt,
      projectedAt,
      ref: `orchestration://${item.id}`,
      version: item.updatedAt,
    },
    subject: {
      kind: `orchestration-${item.kind}`,
      ref: item.id,
      title: item.label,
    },
    urgency: orchestrationUrgency(item.condition),
  };
}

function orchestrationAttentionSnapshot(
  workspace: ReturnType<typeof getOrchestrationWorkspaceProjectionSnapshot>,
) {
  const projectedAt =
    workspace.attention
      .map((item) => item.updatedAt)
      .sort()
      .at(-1) ?? "2026-07-28T00:00:00.000Z";

  return {
    candidates: workspace.attention.map((item) =>
      orchestrationAttentionCandidate(item, projectedAt),
    ),
    registration,
    schemaVersion: 1 as const,
    source: {
      authority: "operator-orchestration-service-contract",
      freshness: "current" as const,
      mode: "synthetic" as const,
      observedAt: projectedAt,
      projectedAt,
      ref: "orchestration://attention-projection",
      version: `orchestration-attention-v1:${workspace.scenarioCoverage.length}:${projectedAt}`,
    },
  };
}

function orchestrationAttentionClass(
  condition: OrchestrationAttentionCondition,
): ConsoleAttentionClass {
  switch (condition) {
    case "blocked":
    case "failed":
      return "recovery";
    case "admission-review":
      return "decision";
    case "waiting":
      return "external-follow-up";
    case "definition-ready":
    case "implementation-requested":
      return "required-action";
    case "qualification":
      return "review";
  }
}

function orchestrationUrgency(
  condition: OrchestrationAttentionCondition,
): ConsoleAttentionUrgency {
  switch (condition) {
    case "failed":
      return "critical";
    case "blocked":
      return "high";
    case "waiting":
    case "admission-review":
      return "normal";
    case "definition-ready":
    case "implementation-requested":
    case "qualification":
      return "low";
  }
}

function orchestrationOwnerRank(condition: OrchestrationAttentionCondition) {
  switch (condition) {
    case "failed":
      return 5;
    case "blocked":
      return 10;
    case "admission-review":
      return 20;
    case "waiting":
      return 30;
    case "definition-ready":
    case "implementation-requested":
      return 40;
    case "qualification":
      return 50;
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
