import type { OperationTone } from "../../../../operation-projections/index.ts";
import type {
  OrchestrationAdmissionCheck,
  OrchestrationDefinitionClassification,
  OrchestrationDefinitionFilters,
  OrchestrationDefinitionLifecycle,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";

export type OrchestrationDefinitionActionProjection = {
  actionLabel: string | null;
  description: string;
  disabled: boolean;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export type OrchestrationDefinitionInspectorId =
  | "evidence-security"
  | "failure-controls"
  | "trigger-result"
  | "version-history";

export const orchestrationDefinitionRecordStateOptions: Array<{
  label: string;
  value: OrchestrationDefinitionFilters["recordState"];
}> = [
  { label: "All states", value: "all" },
  { label: "Qualification", value: "qualification" },
  { label: "Candidate", value: "candidate" },
  { label: "Qualified", value: "qualified" },
  { label: "Definition ready", value: "definition-ready" },
  {
    label: "Implementation requested",
    value: "implementation-requested",
  },
  { label: "Admission review", value: "admission-review" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Retired", value: "retired" },
];

export const orchestrationDefinitionClassificationOptions: Array<{
  label: string;
  value: OrchestrationDefinitionFilters["classification"];
}> = [
  { label: "All classes", value: "all" },
  { label: "Unclassified", value: "unclassified" },
  { label: "Synchronous", value: "synchronous" },
  { label: "Conditional", value: "conditional" },
  { label: "Durable candidate", value: "durable-candidate" },
  { label: "Admitted durable", value: "admitted-durable" },
];

export const orchestrationDefinitionInspectorRows: Array<{
  detail: string;
  id: OrchestrationDefinitionInspectorId;
  label: string;
}> = [
  {
    detail: "Trigger, completion condition, and returned projection.",
    id: "trigger-result",
    label: "Trigger And Result",
  },
  {
    detail: "Failure, cancellation, approval, and recovery boundaries.",
    id: "failure-controls",
    label: "Failure And Controls",
  },
  {
    detail: "Evidence, receipt, security, and source authority.",
    id: "evidence-security",
    label: "Evidence And Security",
  },
  {
    detail: "Immutable version history retained by the definition family.",
    id: "version-history",
    label: "Version History",
  },
];

export function orchestrationDefinitionSourceDomainOptions(
  records: readonly OrchestrationDefinitionRecord[],
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

export function orchestrationDefinitionClassificationLabel(
  classification: OrchestrationDefinitionClassification | null,
) {
  switch (classification) {
    case "admitted-durable":
      return "Admitted durable";
    case "conditional":
      return "Conditional";
    case "durable-candidate":
      return "Durable candidate";
    case "synchronous":
      return "Synchronous";
    default:
      return "Unclassified";
  }
}

export function orchestrationDefinitionClassificationTone(
  record: OrchestrationDefinitionRecord,
): OperationTone {
  switch (record.classification) {
    case "admitted-durable":
      return record.source.mode === "synthetic-scenario" ? "info" : "ok";
    case "durable-candidate":
      return "info";
    case "conditional":
    case "synchronous":
      return "muted";
    default:
      return "warn";
  }
}

export function orchestrationDefinitionLifecycleLabel(
  lifecycle: OrchestrationDefinitionLifecycle | null,
) {
  switch (lifecycle) {
    case "admission-review":
      return "Admission review";
    case "definition-ready":
      return "Definition ready";
    case "implementation-requested":
      return "Implementation requested";
    case "active":
      return "Active";
    case "candidate":
      return "Candidate";
    case "qualified":
      return "Qualified";
    case "retired":
      return "Retired";
    case "suspended":
      return "Suspended";
    default:
      return "Qualification";
  }
}

export function orchestrationDefinitionVersionLabel(
  record: OrchestrationDefinitionRecord,
) {
  return record.version ? `v${record.version}` : "Qualification record";
}

export function orchestrationDefinitionSelectedFacts(
  record: OrchestrationDefinitionRecord,
) {
  return [
    { label: "Source", value: record.sourceDomain },
    { label: "Version", value: orchestrationDefinitionVersionLabel(record) },
    {
      label: "Classification",
      value: orchestrationDefinitionClassificationLabel(record.classification),
    },
    { label: "Execution Owner", value: record.executionOwner },
    { label: "Implementation Repo", value: record.implementationRepo },
    {
      label: "Lifecycle",
      value: orchestrationDefinitionLifecycleLabel(record.lifecycle),
    },
  ];
}

export function orchestrationDefinitionDashboardFacts(
  record: OrchestrationDefinitionRecord,
) {
  return [
    { label: "Definition", value: record.definitionId },
    {
      label: "Family",
      value: record.definitionFamilyId ?? "not assigned",
    },
    { label: "Version", value: orchestrationDefinitionVersionLabel(record) },
    { label: "Source Domain", value: record.sourceDomain },
    { label: "Business Owner", value: record.businessOwner },
    { label: "Execution Owner", value: record.executionOwner },
    { label: "Implementation Repo", value: record.implementationRepo },
    { label: "Source Mode", value: definitionSourceModeLabel(record) },
  ];
}

export function orchestrationDefinitionAction(
  record: OrchestrationDefinitionRecord,
): OrchestrationDefinitionActionProjection {
  if (record.lifecycle === null) {
    return {
      actionLabel:
        record.qualification.status === "in-progress"
          ? "Continue Qualification"
          : null,
      description:
        record.qualification.status === "in-progress"
          ? "Continue the execution-boundary interview and record the classification."
          : "This recorded qualification remains outside the durable lifecycle.",
      disabled: record.qualification.status !== "in-progress",
      statusLabel:
        record.qualification.status === "in-progress" ? "Pending" : "Recorded",
      title:
        record.qualification.status === "in-progress"
          ? "Qualification required"
          : "Qualification retained",
      tone: record.qualification.status === "in-progress" ? "warn" : "muted",
    };
  }

  switch (record.lifecycle) {
    case "candidate":
      return enabledAction(
        "Continue Qualification",
        "Qualification required",
        "Complete the execution-boundary interview before definition authoring begins.",
        "Pending",
        "warn",
      );
    case "qualified":
      return enabledAction(
        "Continue Definition",
        "Definition contract required",
        "Author the implementation-ready definition contract.",
        "Qualified",
        "info",
      );
    case "definition-ready":
      return enabledAction(
        "Request Implementation",
        "Implementation request required",
        "Review the definition obligations and record the implementation work home.",
        "Ready",
        "ok",
      );
    case "implementation-requested":
      return {
        actionLabel: null,
        description:
          "The immutable request projection is retained while implementation evidence is prepared.",
        disabled: true,
        statusLabel: "Requested",
        title: "Implementation requested",
        tone: "info",
      };
    case "admission-review":
      return {
        actionLabel: null,
        description:
          "Admission evidence remains under implementation, platform, security, validation, and runtime review.",
        disabled: true,
        statusLabel: "In review",
        title: "Admission review",
        tone: "warn",
      };
    case "active":
      return enabledAction(
        "Draft New Version",
        "Immutable active version",
        "New runs keep using this version until a separately admitted candidate replaces it.",
        record.source.mode === "synthetic-scenario" ? "Synthetic" : "Active",
        record.source.mode === "synthetic-scenario" ? "info" : "ok",
      );
    case "suspended":
      return {
        actionLabel: null,
        description:
          "This immutable version is retained for review and cannot start new runs.",
        disabled: true,
        statusLabel: "Read only",
        title: "Suspended version",
        tone: "warn",
      };
    case "retired":
      return {
        actionLabel: null,
        description:
          "This immutable version remains available only as historical evidence.",
        disabled: true,
        statusLabel: "Read only",
        title: "Retired version",
        tone: "muted",
      };
  }
}

export function orchestrationAdmissionAreaLabel(
  area: OrchestrationAdmissionCheck["area"],
) {
  switch (area) {
    case "implementation":
      return "Implementation";
    case "platform":
      return "Platform";
    case "runtime":
      return "Runtime";
    case "security":
      return "Security";
    case "validation":
      return "Validation";
  }
}

export function orchestrationAdmissionStateLabel(
  state: OrchestrationAdmissionCheck["state"],
) {
  switch (state) {
    case "not-required":
      return "Not required";
    case "blocked":
      return "Blocked";
    case "pending":
      return "Pending";
    case "ready":
      return "Ready";
    case "synthetic":
      return "Synthetic";
  }
}

export function orchestrationDefinitionNodeTypeLabel(
  type: OrchestrationDefinitionNode["type"],
) {
  switch (type) {
    case "activity":
      return "Activity";
    case "subworkflow":
      return "Subworkflow";
    case "wait":
      return "Wait";
  }
}

export function orchestrationDefinitionNodeTone(
  node: OrchestrationDefinitionNode,
): OperationTone {
  return node.optional ? "muted" : node.type === "wait" ? "warn" : "info";
}

export function formatOrchestrationDefinitionTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function definitionSourceModeLabel(record: OrchestrationDefinitionRecord) {
  switch (record.source.mode) {
    case "contract-derived":
      return "Contract derived";
    case "prototype-local":
      return "Prototype local";
    case "synthetic-scenario":
      return "Synthetic scenario";
  }
}

function enabledAction(
  actionLabel: string,
  title: string,
  description: string,
  statusLabel: string,
  tone: OperationTone,
): OrchestrationDefinitionActionProjection {
  return {
    actionLabel,
    description,
    disabled: false,
    statusLabel,
    title,
    tone,
  };
}
