import type { TerasTone } from "@/teras";

import type { PrototypeCommandView } from "../../../work-model/commands/prototype-command-model.ts";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeCloseoutDecision,
  type PrototypeCloseoutInput,
  type PrototypeCloseoutImpactRow,
  type PrototypeCloseoutReason,
  type PrototypeCloseoutRetention,
  prototypeCloseoutImpactRows,
  prototypeCloseoutRequiresMovement,
  prototypeCloseoutRetentionRows,
  type PrototypeCloseoutRetirementMove,
} from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";

export type CloseoutReason = PrototypeCloseoutReason;
export type CloseoutRetention = PrototypeCloseoutRetention;
export type CloseoutDraft = PrototypeCloseoutInput;

export type CloseoutChecklistRow = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export type CloseoutDecisionSignal = {
  detail: string;
  label: string;
  title: string;
  tone: TerasTone;
};

export type CloseoutStatusProjection = {
  description?: string;
  label: string;
  panelTone?: TerasTone;
  tone: TerasTone;
};

export const closeoutReasonOptions = [
  { id: "no-longer-valuable", label: "No longer valuable", tone: "warn" },
  { id: "duplicate", label: "Duplicate / superseded", tone: "warn" },
  { id: "unsafe", label: "Unsafe", tone: "danger" },
  { id: "blocked", label: "Blocked", tone: "danger" },
  { id: "wrong-route", label: "Wrong route", tone: "warn" },
  { id: "completed-elsewhere", label: "Completed elsewhere", tone: "info" },
  { id: "stale", label: "Stale", tone: "muted" },
  { id: "operator-decision", label: "Operator decision", tone: "info" },
] satisfies Array<{
  id: CloseoutReason;
  label: string;
  tone: "danger" | "info" | "muted" | "warn";
}>;

export const closeoutRetentionOptions = [
  { id: "archive-source", label: "Archive source", tone: "info" },
  { id: "keep-docs-only", label: "Keep docs only", tone: "warn" },
  { id: "remove-draft", label: "Remove local draft", tone: "danger" },
] satisfies Array<{
  id: CloseoutRetention;
  label: string;
  tone: "danger" | "info" | "warn";
}>;

const closeoutDecisionBaseOptions = [
  { id: "retire-locally", label: "Retire locally", tone: "danger" },
  {
    id: "prepare-impacted-request",
    label: "Prepare impacted request",
    tone: "warn",
  },
] satisfies Array<{
  id: PrototypeCloseoutDecision;
  label: string;
  tone: "danger" | "info" | "warn";
}>;

export function closeoutDecisionOptionsForState({
  decisionSignal,
  requiresMovement,
}: {
  decisionSignal: CloseoutDecisionSignal;
  requiresMovement: boolean;
}) {
  return closeoutDecisionBaseOptions.map((option) => {
    const disabled =
      option.id === "retire-locally" ? requiresMovement : !requiresMovement;

    return {
      ...option,
      disabled,
      disabledReason: disabled ? decisionSignal.detail : undefined,
    };
  });
}

export function closeoutDraftFromRecord(
  record: PrototypeRecord | null,
): CloseoutDraft {
  const requiresMovement = record
    ? prototypeCloseoutRequiresMovement(record)
    : false;

  return {
    decision: requiresMovement ? "prepare-impacted-request" : "retire-locally",
    explanation: record?.openIssues.length
      ? "Closeout requested because unresolved issues make this prototype no longer worth continuing."
      : "",
    reason: record?.openIssues.length ? "blocked" : "operator-decision",
    retention: "archive-source",
    supersededBy: "",
  };
}

export function closeoutDraftDirty(
  draft: CloseoutDraft,
  sourceDraft: CloseoutDraft,
) {
  return (
    draft.decision !== sourceDraft.decision ||
    draft.explanation !== sourceDraft.explanation ||
    draft.reason !== sourceDraft.reason ||
    draft.retention !== sourceDraft.retention ||
    draft.supersededBy !== sourceDraft.supersededBy
  );
}

export function closeoutDraftComplete(draft: CloseoutDraft) {
  return draft.explanation.trim().length > 0;
}

export function closeoutReasonStatus(
  draftComplete: boolean,
): CloseoutStatusProjection {
  return {
    label: draftComplete ? "Reason ready" : "Needs reason",
    tone: draftComplete ? "ok" : "warn",
  };
}

export function closeoutImpactStatus(
  requiresMovement: boolean,
): CloseoutStatusProjection {
  return {
    label: requiresMovement ? "Movement" : "Local",
    panelTone: requiresMovement ? "warn" : "info",
    tone: requiresMovement ? "warn" : "ok",
  };
}

export function closeoutReviewStatus(
  canRecordCloseout: boolean,
): CloseoutStatusProjection {
  return {
    label: canRecordCloseout ? "Ready" : "Needs review",
    tone: canRecordCloseout ? "ok" : "warn",
  };
}

export function closeoutMoveDescription(
  command: PrototypeCommandView,
  closeoutMove: PrototypeCloseoutRetirementMove,
) {
  return command.disabledReason ?? closeoutMove.description;
}

export function closeoutReasonChecklistRows(
  draft: CloseoutDraft,
  state: { draftComplete: boolean; showSupersededBy: boolean },
): CloseoutChecklistRow[] {
  const rows: CloseoutChecklistRow[] = [
    {
      detail: closeoutReasonLabel(draft.reason),
      id: "closeout-reason",
      label: "Reason",
      status: "selected",
      tone: "ok",
    },
    {
      detail: draft.explanation.trim() || "Explanation required.",
      id: "closeout-explanation",
      label: "Explanation",
      status: state.draftComplete ? "ready" : "needed",
      tone: state.draftComplete ? "ok" : "warn",
    },
  ];

  if (state.showSupersededBy) {
    rows.push({
      detail: draft.supersededBy.trim() || "Optional ref not set.",
      id: "closeout-superseded",
      label: "Superseded by",
      status: draft.supersededBy.trim() ? "linked" : "optional",
      tone: draft.supersededBy.trim() ? "info" : "muted",
    });
  }

  return rows;
}

export function closeoutImpactChecklistRows(
  impactRows: PrototypeCloseoutImpactRow[],
): CloseoutChecklistRow[] {
  if (impactRows.length === 0) {
    return [
      {
        detail:
          "No linked-record, custody, visibility, data, mutation, baseline, or Movement impact is listed.",
        id: "closeout-impact-local",
        label: "Local impact",
        status: "clear",
        tone: "ok",
      },
    ];
  }

  return impactRows.map((row, index) => ({
    detail: row.detail,
    id: `closeout-impact-${index}-${row.label}`,
    label: row.title,
    status: row.label,
    tone: row.tone,
  }));
}

export function closeoutRetentionChecklistRows(
  retentionRows: ReturnType<typeof prototypeCloseoutRetentionRows>,
): CloseoutChecklistRow[] {
  return retentionRows.map((row, index) => ({
    detail: row.detail,
    id: `closeout-retention-${index}-${row.label}`,
    label: row.title,
    status: row.label,
    tone: row.tone,
  }));
}

export function closeoutDecisionChecklistRows(
  draft: CloseoutDraft,
  state: {
    canRecordCloseout: boolean;
    requiresMovement: boolean;
    showSupersededBy: boolean;
  },
): CloseoutChecklistRow[] {
  const selectedAction = closeoutDraftAction(draft.decision);
  const rows: CloseoutChecklistRow[] = [
    {
      detail: draft.explanation.trim()
        ? "Explanation is ready for the closeout receipt."
        : "Add an explanation on Reason and Impact before recording.",
      id: "closeout-review-reason",
      label: "Closeout reason",
      status: draft.explanation.trim() ? "ready" : "review",
      tone: draft.explanation.trim() ? "ok" : "warn",
    },
    {
      detail: selectedAction.description,
      id: "closeout-decision",
      label: "Selected action",
      status: "selected",
      tone: "info",
    },
    {
      detail: state.requiresMovement
        ? "This closeout will prepare a Movement Control request."
        : "Prototype-local retirement is allowed for this record.",
      id: "closeout-route",
      label: "Impact route",
      status: state.requiresMovement ? "movement" : "local",
      tone: state.requiresMovement ? "info" : "ok",
    },
    {
      detail: closeoutRetentionLabel(draft.retention),
      id: "closeout-retention",
      label: "Retention",
      status: "selected",
      tone:
        draft.retention === "remove-draft"
          ? "danger"
          : draft.retention === "keep-docs-only"
            ? "warn"
            : "info",
    },
  ];

  if (state.showSupersededBy) {
    rows.push({
      detail: draft.supersededBy.trim() || "Optional ref not set.",
      id: "closeout-review-superseded",
      label: "Superseded by",
      status: draft.supersededBy.trim() ? "linked" : "optional",
      tone: draft.supersededBy.trim() ? "info" : "muted",
    });
  }

  return rows;
}

export function closeoutReasonLabel(reason: CloseoutReason) {
  return (
    closeoutReasonOptions.find((option) => option.id === reason)?.label ??
    reason
  );
}

export function closeoutRetentionLabel(retention: CloseoutRetention) {
  return (
    closeoutRetentionOptions.find((option) => option.id === retention)?.label ??
    retention
  );
}

export function closeoutDraftAction(decision: PrototypeCloseoutDecision) {
  switch (decision) {
    case "prepare-impacted-request":
      return {
        description:
          "Prepare an impacted closeout request for Movement Control review.",
        label: "Prepare Closeout Request",
        tone: "warn" as const,
      };
    case "retire-locally":
      return {
        description:
          "Record a local retirement receipt and move this prototype to History.",
        label: "Record Local Retirement",
        tone: "danger" as const,
      };
  }
}

export function closeoutDecisionSignal(
  requiresMovement: boolean,
  impactRows: ReturnType<typeof prototypeCloseoutImpactRows>,
): CloseoutDecisionSignal {
  if (!requiresMovement) {
    return {
      detail: "No movement impact is detected.",
      label: "decision note",
      title: "Impacted request unavailable",
      tone: "muted",
    };
  }

  const firstImpact = impactRows[0];

  return {
    detail: firstImpact
      ? `${firstImpact.title} requires Movement Control.`
      : "Movement impact requires Movement Control.",
    label: "decision note",
    title: "Local retirement unavailable",
    tone: "muted",
  };
}
