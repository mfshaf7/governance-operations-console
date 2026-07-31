import type { OperationTone } from "../../../../operation-contracts/operation-state.ts";

import type {
  PrototypeCurrentMove,
  PrototypeMovementGate,
  PrototypeRecord,
} from "../../../domain/prototype-types.ts";

export type PrototypeCloseoutRetirementStepId = "impact" | "decision";

export type PrototypeCloseoutRetirementStep = {
  available: boolean;
  connectsToNext?: boolean;
  current: boolean;
  detail: string;
  id: PrototypeCloseoutRetirementStepId;
  label: string;
  stateLabel: string;
  tone: OperationTone;
};

export type PrototypeCloseoutRetirementMove = {
  description: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export type PrototypeCloseoutRetirementAction = {
  description: string;
  label: string;
  tone: OperationTone;
};

export type PrototypeCloseoutDecision =
  "prepare-impacted-request" | "retire-locally";

export type PrototypeCloseoutReason =
  | "blocked"
  | "completed-elsewhere"
  | "duplicate"
  | "no-longer-valuable"
  | "operator-decision"
  | "stale"
  | "unsafe"
  | "wrong-route";

export type PrototypeCloseoutRetention =
  "archive-source" | "keep-docs-only" | "remove-draft";

export type PrototypeCloseoutInput = {
  decision: PrototypeCloseoutDecision;
  explanation: string;
  reason: PrototypeCloseoutReason;
  retention: PrototypeCloseoutRetention;
  supersededBy: string;
};

export type PrototypeCloseoutImpactRow = {
  detail: string;
  label: string;
  title: string;
  tone: OperationTone;
};

export function prototypeCloseoutRetirementActiveStep(
  record: PrototypeRecord,
): PrototypeCloseoutRetirementStepId {
  if (!prototypeCloseoutRetirementAvailable(record)) {
    return "decision";
  }

  return "impact";
}

export function prototypeCloseoutRetirementMove(
  record: PrototypeRecord,
): PrototypeCloseoutRetirementMove {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      description:
        "This prototype is review-only in Prototype Studio. Use History for retained receipts and closeout evidence.",
      statusLabel: "Review",
      title: "Closeout archived",
      tone: "muted",
    };
  }

  if (!prototypeCloseoutRetirementAvailable(record)) {
    return {
      description:
        "Landing must finish before this prototype can be retired through the closeout workflow.",
      statusLabel: "Locked",
      title: "Landing required",
      tone: "muted",
    };
  }

  if (prototypeCloseoutRequiresMovement(record)) {
    return {
      description:
        "This closeout crosses linked-record, custody, evidence, or boundary impact. Prepare a Movement Control request instead of retiring locally.",
      statusLabel: "Movement",
      title: "Impacted closeout",
      tone: "warn",
    };
  }

  return {
    description:
      "This prototype is local to Prototype Studio and can be retired with a retained local receipt.",
    statusLabel: "Local",
    title: "Local retirement",
    tone: "warn",
  };
}

export function prototypeCloseoutRetirementWorkflowSteps(
  record: PrototypeRecord,
): PrototypeCloseoutRetirementStep[] {
  const activeStep = prototypeCloseoutRetirementActiveStep(record);
  const impactRows = prototypeCloseoutImpactRows(record);
  const requiresMovement = prototypeCloseoutRequiresMovement(record);
  const available = prototypeCloseoutRetirementAvailable(record);
  const decisionTone = available ? "warn" : "muted";

  return [
    {
      available,
      connectsToNext: true,
      current: activeStep === "impact",
      detail: requiresMovement
        ? `${impactRows.length} impact signal${impactRows.length === 1 ? "" : "s"}`
        : "Local-only impact",
      id: "impact",
      label: "Reason and Impact",
      stateLabel: requiresMovement ? "Review" : "Clear",
      tone: requiresMovement ? "warn" : "ok",
    },
    {
      available,
      connectsToNext: false,
      current: activeStep === "decision",
      detail: requiresMovement
        ? "Prepare impacted request"
        : "Record local retirement",
      id: "decision",
      label: "Review and Apply",
      stateLabel: !available
        ? "Locked"
        : requiresMovement
          ? "Movement"
          : "Retire",
      tone: decisionTone,
    },
  ];
}

export function prototypeCloseoutRetirementAction(
  record: PrototypeRecord,
): PrototypeCloseoutRetirementAction {
  if (!prototypeCloseoutRetirementAvailable(record)) {
    return {
      description: "Closeout is locked until the prototype has landed.",
      label: "Closeout Locked",
      tone: "muted",
    };
  }

  if (prototypeCloseoutRequiresMovement(record)) {
    return {
      description:
        "Prepare an impacted closeout request. Movement Control will own the durable closeout decision.",
      label: "Prepare Closeout Request",
      tone: "warn",
    };
  }

  return {
    description:
      "Record a local retirement receipt and move this prototype to History.",
    label: "Record Local Retirement",
    tone: "danger",
  };
}

export function prototypeCloseoutImpactRows(
  record: PrototypeRecord,
): PrototypeCloseoutImpactRow[] {
  const rows: PrototypeCloseoutImpactRow[] = [];

  if (record.linkedRecords.length > 0) {
    rows.push({
      detail: `${record.linkedRecords.length} linked record${record.linkedRecords.length === 1 ? "" : "s"} must stay visible to the owner system.`,
      label: "linked",
      title: "Linked records",
      tone: "warn",
    });
  }

  if (
    record.dataMode === "real-readonly" ||
    record.dataMode === "real-mutable"
  ) {
    rows.push({
      detail:
        "Real-data posture requires impact review before local retirement.",
      label: record.dataMode,
      title: "Data boundary",
      tone: record.dataMode === "real-mutable" ? "danger" : "warn",
    });
  }

  if (
    record.mutationBoundary === "real-system" ||
    record.mutationBoundary === "external-sandbox"
  ) {
    rows.push({
      detail: "Mutation or external sandbox boundary cannot be closed locally.",
      label: record.mutationBoundary,
      title: "Mutation boundary",
      tone: "danger",
    });
  }

  if (
    record.visibilityTier === "client-review" ||
    record.visibilityTier === "public-demo"
  ) {
    rows.push({
      detail: "External visibility needs retained evidence and owner review.",
      label: record.visibilityTier,
      title: "Visibility",
      tone: "warn",
    });
  }

  if (
    record.lifecycle === "baseline-approved" ||
    record.lifecycle === "graduating" ||
    record.movementRequest.lastMovementReceiptRef
  ) {
    rows.push({
      detail:
        "Baseline or Movement state exists, so the closeout must not be local-only.",
      label: "movement",
      title: "Movement boundary",
      tone: "warn",
    });
  }

  if (record.openIssues.some((issue) => issue.status === "blocked")) {
    rows.push({
      detail: "Blocked issues must be preserved in the closeout request.",
      label: "blocked",
      title: "Blocked issue",
      tone: "danger",
    });
  }

  return rows;
}

export function prototypeCloseoutRetentionRows(
  record: PrototypeRecord,
): PrototypeCloseoutImpactRow[] {
  return [
    {
      detail: record.sourceRef,
      label: "keep",
      title: "Source reference",
      tone: "info",
    },
    {
      detail:
        record.preview.lastProofRef ??
        (record.preview.profileState === "no-profile"
          ? "No preview profile"
          : record.preview.profileState),
      label: record.preview.proofState,
      title: "Preview proof",
      tone: record.preview.proofState === "proof-ready" ? "ok" : "muted",
    },
    {
      detail: `${record.receipts.length} imported receipt${record.receipts.length === 1 ? "" : "s"}`,
      label: "history",
      title: "Receipt history",
      tone: record.receipts.length > 0 ? "info" : "muted",
    },
    {
      detail:
        record.openIssues.length > 0
          ? `${record.openIssues.length} issue${record.openIssues.length === 1 ? "" : "s"} retained`
          : "No open issues",
      label: record.openIssues.length > 0 ? "retain" : "clear",
      title: "Open issues",
      tone: record.openIssues.length > 0 ? "warn" : "ok",
    },
  ];
}

export function prototypeCloseoutRequiresMovement(record: PrototypeRecord) {
  return prototypeCloseoutImpactRows(record).length > 0;
}

export function prototypeCloseoutRetirementAvailable(record: PrototypeRecord) {
  return (
    record.landing.state === "landed" &&
    record.lifecycle !== "retired" &&
    record.lifecycle !== "graduated"
  );
}

export function prototypeRecordAfterCloseoutRetirement(
  record: PrototypeRecord,
  receiptRef: string,
  input: PrototypeCloseoutInput,
): PrototypeRecord {
  const requiresMovement = prototypeCloseoutRequiresMovement(record);

  if (
    !prototypeCloseoutRetirementAvailable(record) ||
    !input.explanation.trim() ||
    (input.decision === "prepare-impacted-request" && !requiresMovement) ||
    (input.decision === "retire-locally" && requiresMovement)
  ) {
    return record;
  }

  if (input.decision === "prepare-impacted-request") {
    const nextMove: PrototypeCurrentMove = {
      actionLabel: "Open Movement Request",
      detail:
        "Impacted closeout was prepared locally. Review the Movement request before handoff.",
      id: "movement-request",
      label: "Prepare impacted closeout request",
      tone: "warn",
    };
    const gateSnapshot: PrototypeMovementGate[] = [
      ...record.movementRequest.gateSnapshot,
      ...prototypeCloseoutImpactRows(record).map(
        (row) =>
          ({
            authority: "Prototype Closeout",
            gateId: `closeout-${row.label}`,
            gateKind: row.title,
            owner: "Prototype Studio",
            requiredFix: row.detail,
            status: "review",
            summary: row.detail,
            tone: row.tone,
          }) satisfies PrototypeMovementGate,
      ),
    ];

    return {
      ...record,
      currentMove: nextMove,
      movementRequest: {
        ...record.movementRequest,
        gateSnapshot,
        movementType: "retire",
        requestReason: input.explanation.trim(),
        state: "draft-ready",
        targetHome: "Movement Control",
        targetLane: "impacted closeout",
        targetOwner: "Movement reviewer",
      },
      projectionFreshness: "prototype-local impacted closeout prepared",
      projectionVersion: appendPrototypeProjectionVersion(
        record.projectionVersion,
        "closeout-request",
      ),
    };
  }

  if (requiresMovement) {
    return record;
  }

  return {
    ...record,
    currentMove: {
      actionLabel: "View History",
      detail:
        "Local retirement receipt was recorded. This prototype is now review-only in History.",
      id: "history",
      label: "Review local retirement",
      tone: "muted",
    },
    lifecycle: "retired",
    projectionFreshness: `prototype-local retirement recorded / ${receiptRef}`,
    projectionVersion: appendPrototypeProjectionVersion(
      record.projectionVersion,
      "retired",
    ),
    tone: "muted",
  };
}

function appendPrototypeProjectionVersion(version: string, suffix: string) {
  return version.includes(`+${suffix}`) ? version : `${version}+${suffix}`;
}
