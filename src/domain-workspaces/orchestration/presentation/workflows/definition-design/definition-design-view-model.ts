import type { OperationTone } from "../../../../operation-projections/index.ts";
import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  createOrchestrationDefinitionDesignDraft,
  orchestrationDefinitionDesignReadiness,
  orchestrationDefinitionDesignStages,
} from "../../../work-model/definition-design/definition-design-model.ts";
import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignSection,
  OrchestrationDefinitionDesignStage,
  OrchestrationDefinitionValidationFinding,
  OrchestrationQualificationDecision,
} from "../../../work-model/definition-design/definition-design-types.ts";

export const definitionDesignSectionOptions: Array<{
  label: string;
  value: Exclude<OrchestrationDefinitionDesignSection, "qualification">;
}> = [
  { label: "Identity And Ownership", value: "identity-ownership" },
  { label: "Trigger And Result", value: "trigger-result" },
  { label: "Execution Plan", value: "execution-plan" },
  { label: "Failure And Controls", value: "failure-controls" },
  { label: "Evidence And Security", value: "evidence-security" },
  { label: "Delivery And Versioning", value: "delivery-versioning" },
];

export const qualificationDecisionOptions: Array<{
  id: "conditional" | "durable-candidate" | "synchronous" | "unassigned";
  label: string;
  tone: OperationTone;
}> = [
  { id: "unassigned", label: "Select decision", tone: "muted" },
  { id: "synchronous", label: "Synchronous", tone: "info" },
  { id: "conditional", label: "Conditional", tone: "warn" },
  { id: "durable-candidate", label: "Durable candidate", tone: "ok" },
];

export const executionNodeTypeOptions = [
  { label: "Activity", value: "activity" },
  { label: "Wait", value: "wait" },
  { label: "Subworkflow", value: "subworkflow" },
] as const;

export const requestRouteOptions = [
  {
    id: "workspace-proposals",
    label: "Workspace Proposals",
    tone: "info",
  },
  {
    id: "delivery-art",
    label: "Delivery ART",
    tone: "warn",
  },
] as const;

export const supportedDispositionOptions = [
  { id: "remove", label: "Remove", tone: "info" },
  { id: "workaround", label: "Workaround", tone: "warn" },
  { id: "accept-risk", label: "Accept risk", tone: "warn" },
  { id: "defer", label: "Defer", tone: "muted" },
] as const;

export function createDefinitionDesignInitialDraft({
  record,
  savedAt,
}: {
  record: OrchestrationDefinitionRecord | null;
  savedAt: string;
}) {
  const draft = createOrchestrationDefinitionDesignDraft({
    draftId: definitionDesignDraftId(record),
    record,
    savedAt,
  });

  if (!record) {
    return draft;
  }

  if (record.lifecycle === "qualified") {
    draft.activeSection = "identity-ownership";
    draft.activeStage = "define";
  } else if (record.lifecycle === "definition-ready") {
    draft.activeSection = "identity-ownership";
    draft.activeStage = "review-request";
  } else if (record.lifecycle === "active") {
    draft.activeSection = "identity-ownership";
    draft.activeStage = "define";
    draft.identityOwnership.version = nextDefinitionVersion(record.version);
    draft.requestRoute = {
      operatorApproved: false,
      target: null,
      targetRef: "",
    };
  }

  return draft;
}

export function definitionDesignDraftId(
  record: OrchestrationDefinitionRecord | null,
) {
  if (!record) {
    return "orchestration-definition-new";
  }

  if (record.lifecycle === "active") {
    return `${record.definitionId}:candidate:${nextDefinitionVersion(record.version)}`;
  }

  return record.id;
}

export function definitionDesignEntryAllowed(
  record: OrchestrationDefinitionRecord,
) {
  return (
    (record.lifecycle === null &&
      record.qualification.status === "in-progress") ||
    record.lifecycle === "candidate" ||
    record.lifecycle === "qualified" ||
    record.lifecycle === "definition-ready" ||
    record.lifecycle === "active"
  );
}

export function definitionDesignClassificationLabel(
  classification: OrchestrationQualificationDecision | null,
) {
  switch (classification) {
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

export function definitionDesignClassificationTone(
  classification: OrchestrationQualificationDecision | null,
): OperationTone {
  switch (classification) {
    case "durable-candidate":
      return "ok";
    case "conditional":
      return "warn";
    case "synchronous":
      return "info";
    default:
      return "muted";
  }
}

export function definitionDesignSubject(
  draft: OrchestrationDefinitionDesignDraft,
  record: OrchestrationDefinitionRecord | null,
) {
  const title =
    draft.identityOwnership.title.trim() ||
    draft.qualification.title.trim() ||
    record?.title ||
    "New backend operation";
  const source =
    draft.qualification.sourceDomain.trim() ||
    draft.identityOwnership.sourceDomain.trim() ||
    "Source domain not assigned";

  return {
    detail: `${source} / ${definitionDesignClassificationLabel(
      draft.qualification.classification,
    )}`,
    eyebrow:
      record?.lifecycle === "active"
        ? "New Definition Version"
        : "Definition Draft",
    title,
  };
}

export function definitionDesignWorkflowSteps(
  draft: OrchestrationDefinitionDesignDraft,
  receiptRecorded: boolean,
) {
  const stages = orchestrationDefinitionDesignStages(
    draft.qualification.classification,
  );
  const activeIndex = stages.indexOf(draft.activeStage);

  return stages.map((stage, index) => {
    const complete = receiptRecorded || index < activeIndex;
    const current = index === activeIndex;

    return {
      available: receiptRecorded || index <= activeIndex,
      detail: definitionDesignStageDetail(stage),
      id: stage,
      label: definitionDesignStageLabel(stage),
      stateLabel: complete ? "Done" : current ? "Current" : "Next",
      tone: complete
        ? ("ok" as const)
        : current
          ? ("warn" as const)
          : ("muted" as const),
    };
  });
}

export function definitionDesignStageLabel(
  stage: OrchestrationDefinitionDesignStage,
) {
  switch (stage) {
    case "qualify":
      return "Qualify";
    case "define":
      return "Define";
    case "review-request":
      return "Review And Request";
  }
}

export function definitionDesignSectionLabel(
  section: OrchestrationDefinitionDesignSection,
) {
  if (section === "qualification") {
    return "Qualification";
  }

  return (
    definitionDesignSectionOptions.find((option) => option.value === section)
      ?.label ?? section
  );
}

export function qualificationCheckRows(
  draft: OrchestrationDefinitionDesignDraft,
) {
  const qualificationFindings = orchestrationDefinitionDesignReadiness(
    draft,
  ).findings.filter((finding) => finding.section === "qualification");
  const groups = [
    {
      fields: ["title", "sourceDomain", "sourceRecordType"],
      id: "qualification-source",
      label: "Source",
      readyDetail: "Operation and source are identified.",
    },
    {
      fields: ["executionProblem", "synchronousAlternative"],
      id: "qualification-boundary",
      label: "Boundary",
      readyDetail: "Execution boundary is explicit.",
    },
    {
      fields: ["trigger", "completionCondition", "executionOwner"],
      id: "qualification-result",
      label: "Trigger And Result",
      readyDetail: "Trigger, owner, and completion are explicit.",
    },
    {
      fields: ["classification", "rationale", "reevaluationCondition"],
      id: "qualification-decision",
      label: "Decision",
      readyDetail: "Classification rationale is ready.",
    },
  ];

  return groups.map((group, index) => {
    const finding = qualificationFindings.find((candidate) =>
      group.fields.includes(candidate.field),
    );

    return {
      detail: finding?.detail ?? group.readyDetail,
      id: group.id,
      indexLabel: String(index + 1).padStart(2, "0"),
      label: group.label,
      status: finding ? "needed" : "ready",
      tone: finding ? ("warn" as const) : ("ok" as const),
    };
  });
}

export function definitionSectionCheckRows(
  draft: OrchestrationDefinitionDesignDraft,
) {
  const findings = orchestrationDefinitionDesignReadiness(draft).findings;

  return definitionDesignSectionOptions.map((section, index) => {
    const sectionFindings = findings.filter(
      (finding) => finding.section === section.value,
    );

    return {
      detail:
        sectionFindings.length > 0
          ? `${sectionFindings.length} required ${
              sectionFindings.length === 1 ? "field remains" : "fields remain"
            }.`
          : "Section is review-ready.",
      id: section.value,
      indexLabel: String(index + 1).padStart(2, "0"),
      label: section.label,
      status: sectionFindings.length > 0 ? "needed" : "ready",
      tone: sectionFindings.length > 0 ? ("warn" as const) : ("ok" as const),
    };
  });
}

export function definitionReviewObligations(
  draft: OrchestrationDefinitionDesignDraft,
) {
  const findings = orchestrationDefinitionDesignReadiness(draft).findings;
  const durable = draft.qualification.classification === "durable-candidate";

  if (!durable) {
    return [
      reviewObligation("qualification", "Source And Boundary", findings, [
        "qualification",
      ]),
      reviewObligation(
        "qualification-decision",
        "Classification Decision",
        findings,
        ["qualification"],
      ),
    ];
  }

  return [
    reviewObligation("architecture", "Architecture", findings, [
      "qualification",
      "identity-ownership",
      "trigger-result",
      "execution-plan",
    ]),
    reviewObligation("security", "Security", findings, ["evidence-security"]),
    reviewObligation(
      "platform",
      "Platform",
      findings,
      ["delivery-versioning"],
      ["compatibilityPlan", "suspensionPlan", "retirementPlan"],
    ),
    reviewObligation(
      "owner-repo",
      "Owner Repo",
      findings,
      ["identity-ownership"],
      ["implementationRepo", "executionOwner", "businessOwner"],
    ),
    reviewObligation(
      "validation",
      "Validation",
      findings,
      ["delivery-versioning"],
      [
        "workflowReplayTests",
        "idempotencyTests",
        "failureInjectionTests",
        "timeoutTests",
        "cancellationTests",
        "signalTests",
      ],
    ),
    reviewObligation(
      "rollout",
      "Rollout",
      findings,
      ["delivery-versioning"],
      ["rolloutPlan", "rollbackPlan"],
    ),
    reviewObligation("work-home", "Work Home", findings, ["request-route"]),
  ];
}

export function firstDefinitionFindingForSection(
  findings: OrchestrationDefinitionValidationFinding[],
  section: OrchestrationDefinitionDesignSection | "request-route",
) {
  return findings.find((finding) => finding.section === section) ?? null;
}

export function definitionReviewSummary(
  draft: OrchestrationDefinitionDesignDraft,
) {
  const readiness = orchestrationDefinitionDesignReadiness(draft);
  const durable = draft.qualification.classification === "durable-candidate";
  const ready = durable
    ? readiness.canRequestImplementation
    : readiness.canRecordQualification;

  return {
    ready,
    status: ready ? "Ready" : "Needs review",
    tone: ready ? ("ok" as const) : ("warn" as const),
  };
}

export function definitionSectionFindingCount(
  findings: OrchestrationDefinitionValidationFinding[],
  section: OrchestrationDefinitionDesignSection,
) {
  return findings.filter((finding) => finding.section === section).length;
}

function nextDefinitionVersion(version: string | null) {
  const numericVersion = Number.parseInt(version ?? "", 10);

  return Number.isFinite(numericVersion)
    ? String(numericVersion + 1)
    : `${version ?? "1"}-candidate`;
}

function definitionDesignStageDetail(
  stage: OrchestrationDefinitionDesignStage,
) {
  switch (stage) {
    case "qualify":
      return "Classify the execution boundary.";
    case "define":
      return "Author the implementation contract.";
    case "review-request":
      return "Review obligations and record the route.";
  }
}

function reviewObligation(
  id: string,
  label: string,
  findings: OrchestrationDefinitionValidationFinding[],
  sections: Array<OrchestrationDefinitionDesignSection | "request-route">,
  fields?: string[],
) {
  const relevantFindings = findings.filter(
    (finding) =>
      sections.includes(finding.section) &&
      (!fields || fields.includes(finding.field)),
  );
  const firstFinding = relevantFindings[0] ?? null;

  return {
    detail:
      firstFinding?.detail ?? "Current draft satisfies this review obligation.",
    finding: firstFinding,
    id,
    label,
    status: relevantFindings.length > 0 ? "needed" : "ready",
    tone: relevantFindings.length > 0 ? ("warn" as const) : ("ok" as const),
  };
}
