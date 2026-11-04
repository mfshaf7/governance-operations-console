import type { OperationTone } from "../../../../operation-projections/index.ts";
import type {
  OrchestrationRunEffectPosture,
  OrchestrationRunFilters,
  OrchestrationRunLifecycle,
  OrchestrationRunNode,
  OrchestrationRunNodeState,
  OrchestrationRunRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-run-types";

export const orchestrationRunStateOptions: Array<{
  label: string;
  value: OrchestrationRunFilters["state"];
}> = [
  { label: "All states", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Running", value: "running" },
  { label: "Waiting", value: "waiting" },
  { label: "Blocked", value: "blocked" },
  { label: "Failed", value: "failed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export function orchestrationRunDefinitionOptions(
  records: readonly OrchestrationRunRecord[],
) {
  return [
    { label: "All definitions", value: "all" },
    ...Array.from(new Set(records.map((record) => record.definitionId)))
      .sort((left, right) => left.localeCompare(right))
      .map((definitionId) => ({
        label: definitionId,
        value: definitionId,
      })),
  ];
}

export function orchestrationRunSourceDomainOptions(
  records: readonly OrchestrationRunRecord[],
) {
  return [
    { label: "All sources", value: "all" },
    ...Array.from(new Set(records.map((record) => record.sourceDomain)))
      .sort((left, right) => left.localeCompare(right))
      .map((sourceDomain) => ({
        label: sourceDomain,
        value: sourceDomain,
      })),
  ];
}

export function orchestrationRunCurrentNode(record: OrchestrationRunRecord) {
  return record.nodes.find((node) => node.id === record.currentNodeId) ?? null;
}

export function orchestrationRunStateLabel(state: OrchestrationRunLifecycle) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
  }
}

export function orchestrationRunStateTone(
  state: OrchestrationRunLifecycle,
): OperationTone {
  switch (state) {
    case "blocked":
    case "failed":
      return "danger";
    case "completed":
      return "ok";
    case "waiting":
      return "warn";
    case "cancelled":
      return "muted";
    case "queued":
    case "running":
      return "info";
  }
}

export function orchestrationRunNodeStateLabel(
  state: OrchestrationRunNodeState,
) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "skipped":
      return "Skipped";
    case "waiting":
      return "Waiting";
  }
}

export function orchestrationRunNodeStateTone(
  state: OrchestrationRunNodeState,
): OperationTone {
  switch (state) {
    case "blocked":
    case "failed":
      return "danger";
    case "completed":
      return "ok";
    case "running":
      return "info";
    case "waiting":
      return "warn";
    case "cancelled":
    case "queued":
    case "skipped":
      return "muted";
  }
}

export function orchestrationRunEffectPostureLabel(
  posture: OrchestrationRunEffectPosture,
) {
  switch (posture) {
    case "none":
      return "No effects";
    case "partial":
      return "Partial effects";
    case "possible":
      return "Possible effects";
    case "verified":
      return "Verified effects";
  }
}

export function orchestrationRunEffectPostureTone(
  posture: OrchestrationRunEffectPosture,
): OperationTone {
  switch (posture) {
    case "verified":
      return "ok";
    case "partial":
      return "danger";
    case "possible":
      return "warn";
    case "none":
      return "muted";
  }
}

export function orchestrationRunNodeDetail(node: OrchestrationRunNode) {
  const duration = node.duration ?? (["completed", "cancelled", "failed", "skipped"].includes(node.state) ? "Duration not recorded" : "Duration pending");
  const parallel = node.parallelGroup
    ? ` / Parallel group ${node.parallelGroup}`
    : "";
  const skipped = node.skipReason ? ` / ${node.skipReason}` : "";

  return `${node.owner} / Attempt ${node.attempt} / ${duration}${parallel}${skipped}`;
}

export function orchestrationRunSelectedFacts(record: OrchestrationRunRecord) {
  const currentNode = orchestrationRunCurrentNode(record);

  return [
    {
      label: "Source",
      value: orchestrationRunSourceLabel(record),
    },
    {
      label: "Definition",
      value: `${record.definitionId} / v${record.definitionVersion}`,
    },
    {
      label: "Current Node",
      value: currentNode?.label ?? "Awaiting scheduling",
    },
    {
      label: "Execution component",
      value: currentNode?.owner ?? "Operator Orchestration Service",
    },
    {
      label: "Effect Posture",
      tone: orchestrationRunEffectPostureTone(record.effectPosture),
      value: orchestrationRunEffectPostureLabel(record.effectPosture),
    },
    {
      label: "Run State",
      tone: orchestrationRunStateTone(record.state),
      value: orchestrationRunStateLabel(record.state),
    },
  ];
}

export function formatOrchestrationRunTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function orchestrationRunTitle(record: OrchestrationRunRecord | undefined) {
  return (record?.definitionId ?? "Workflow run").replace(/^scenario[.:_-]/, "").replace(/[._:-]+/g, " ").replace(/^./, letter => letter.toUpperCase());
}

export function orchestrationRunSourceLabel(record: OrchestrationRunRecord) {
  const initiative = /(?:work_packages\/|art:delivery-)([1-9][0-9]*)$/.exec(record.sourceRecordRef);
  return initiative ? `Delivery #${initiative[1]}` : record.sourceDomain;
}

export function orchestrationRunTechnicalFacts(record: OrchestrationRunRecord) {
  return [
    { label: "Run ID", value: record.runId }, { label: "Request ID", value: record.requestId },
    { label: "Source record", value: record.sourceRecordRef }, { label: "Source version", value: record.sourceProjectionVersion },
    { label: "Correlation", value: record.correlationRef }, { label: "Source", value: record.source.ref },
    { label: "Freshness", value: record.source.freshness },
    { label: "Business state", value: record.businessState.label },
  ];
}
