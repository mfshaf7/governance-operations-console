import type { OperationTone } from "../../../../operation-contracts/operation-state.ts";

import type {
  PrototypeCandidateAudienceKind,
  PrototypeCandidateDecision,
  PrototypeCandidateProofMethod,
  PrototypeCurrentMove,
  PrototypeRecord,
} from "../../../domain/prototype-types.ts";

export type PrototypeCandidatePromotionStepId = "interview" | "review";

export type PrototypeCandidatePromotionDecision = PrototypeCandidateDecision;

export const prototypeCandidatePromotionFieldLimits = {
  audienceLabel: 96,
  objective: 240,
  proofCriterion: 180,
  scopeItem: 120,
  scopeItems: 4,
} as const;

export type PrototypeCandidatePromotionInput = {
  audience: {
    kind: PrototypeCandidateAudienceKind;
    label: string;
  };
  decision: PrototypeCandidatePromotionDecision;
  objective: string;
  proof: {
    criterion: string;
    method: PrototypeCandidateProofMethod;
  };
  scope: {
    excluded: string[];
    included: string[];
  };
};

export type PrototypeCandidatePromotionStep = {
  available: boolean;
  connectsToNext?: boolean;
  current: boolean;
  detail: string;
  id: PrototypeCandidatePromotionStepId;
  label: string;
  stateLabel: string;
  tone: OperationTone;
};

export type PrototypeCandidatePromotionMove = {
  description: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export function prototypeCandidatePromotionActiveStep(
  record: PrototypeRecord,
): PrototypeCandidatePromotionStepId {
  if (record.lifecycle === "retired") {
    return "review";
  }

  if (record.currentMove.id === "candidate-promotion") {
    return "interview";
  }

  return "review";
}

export function prototypeCandidatePromotionMove(
  record: PrototypeRecord,
): PrototypeCandidatePromotionMove {
  if (record.lifecycle === "retired") {
    return {
      description:
        "This prototype is retired. Candidate Promotion stays available for review only.",
      statusLabel: "Review",
      title: "Record Archived",
      tone: "muted",
    };
  }

  if (record.currentMove.id === "candidate-promotion") {
    return {
      description: record.currentMove.detail,
      statusLabel: "Current",
      title: record.currentMove.label,
      tone: record.currentMove.tone,
    };
  }

  if (record.openIssues.length > 0) {
    return {
      description:
        "The candidate brief is usable, but open fixes still affect later Baseline Promotion work.",
      statusLabel: "Open",
      title: "Review Open Fixes",
      tone: record.openIssues.some((issue) => issue.status === "blocked")
        ? "danger"
        : "warn",
    };
  }

  return {
    description:
      "Identity, source, owner, visibility, data mode, and mutation boundary are clear enough for the next workflow.",
    statusLabel: "Done",
    title: "Candidate Review Ready",
    tone: "ok",
  };
}

export function prototypeCandidatePromotionWorkflowSteps(
  record: PrototypeRecord,
): PrototypeCandidatePromotionStep[] {
  const activeStep = prototypeCandidatePromotionActiveStep(record);
  const issueTone = prototypeRecordIssueTone(record);
  const boundaryReady = prototypeRecordFactsReady(record);
  const reviewTone =
    record.openIssues.length > 0 ? issueTone : boundaryReady ? "ok" : "warn";

  return [
    {
      available: true,
      connectsToNext: true,
      current: activeStep === "interview",
      detail: record.summary || "Objective and proof still need review.",
      id: "interview",
      label: "Interview",
      stateLabel: record.summary ? "Ready" : "Open",
      tone: record.summary ? "ok" : "warn",
    },
    {
      available: record.lifecycle !== "retired",
      connectsToNext: false,
      current: activeStep === "review",
      detail: boundaryReady
        ? `${record.visibilityTier} / ${record.dataMode} / ${record.mutationBoundary}`
        : "Boundary review needed before apply.",
      id: "review",
      label: "Review and Apply",
      stateLabel:
        record.currentMove.id === "candidate-promotion" ? "Current" : "Done",
      tone:
        record.currentMove.id === "candidate-promotion"
          ? record.currentMove.tone
          : reviewTone,
    },
  ];
}

export function prototypeCandidatePromotionActionState(
  record: PrototypeRecord,
) {
  if (record.lifecycle === "retired") {
    return {
      label: "Locked",
      tone: "muted" as OperationTone,
    };
  }

  if (record.currentMove.id === "candidate-promotion") {
    return {
      label: "Local save",
      tone: record.currentMove.tone,
    };
  }

  return {
    label: "Review save",
    tone: "info" as OperationTone,
  };
}

export function prototypeRecordAfterCandidatePromotion(
  record: PrototypeRecord,
  receiptRef: string,
  input: PrototypeCandidatePromotionInput,
): PrototypeRecord {
  if (
    record.lifecycle === "retired" ||
    record.lifecycle === "graduated" ||
    record.landing.state !== "landed" ||
    !record.landing.lastLandingReceiptRef ||
    !prototypeCandidatePromotionInputComplete(input) ||
    (input.decision === "block-promotion" &&
      !record.openIssues.some((issue) => issue.status === "blocked")) ||
    (input.decision === "promote-candidate" &&
      (!prototypeRecordFactsReady(record) ||
        record.openIssues.some((issue) => issue.status === "blocked")))
  ) {
    return record;
  }

  const candidate = {
    audience: {
      kind: input.audience.kind,
      label: input.audience.label.trim(),
    },
    decision: input.decision,
    lastReceiptRef: receiptRef,
    objective: input.objective.trim(),
    proof: {
      criterion: input.proof.criterion.trim(),
      method: input.proof.method,
    },
    scope: {
      excluded: normalizeCandidateScopeItems(input.scope.excluded),
      included: normalizeCandidateScopeItems(input.scope.included),
    },
    state: candidateStateForDecision(input.decision),
  } satisfies PrototypeRecord["candidate"];

  if (input.decision === "block-promotion") {
    return {
      ...record,
      candidate,
      currentMove: {
        actionLabel: "Open Candidate Promotion",
        detail:
          "Candidate Promotion is blocked locally. Review the required fix before promotion.",
        id: "candidate-promotion",
        label: "Resolve candidate blocker",
        tone: "danger",
      },
      projectionFreshness: "prototype-local candidate promotion blocked",
      projectionVersion: `${record.projectionVersion}+candidate-review`,
      summary: candidate.objective || record.summary,
    };
  }

  if (input.decision === "route-closeout") {
    return {
      ...record,
      candidate,
      currentMove: {
        actionLabel: "Open Closeout",
        detail:
          "Candidate Promotion concluded this prototype is no longer worth pursuing. Review closeout impact before retirement.",
        id: "closeout-retirement",
        label: "Review closeout",
        tone: "warn",
      },
      projectionFreshness: "prototype-local candidate closeout routed",
      projectionVersion: `${record.projectionVersion}+candidate-closeout`,
      summary: candidate.objective || record.summary,
    };
  }

  return {
    ...record,
    baseline: {
      ...record.baseline,
      evidenceRefs: Array.from(
        new Set([...record.baseline.evidenceRefs, receiptRef]),
      ),
      missingItems: record.baseline.missingItems.filter(
        (item) => item.trim().toLowerCase() !== "candidate promotion receipt",
      ),
      state: "needs-evidence",
    },
    candidate,
    currentMove: prototypeCandidatePromotionNextMove(record),
    evidence: upsertCandidateReceiptEvidence(record, receiptRef),
    lifecycle: "candidate",
    projectionFreshness: "prototype-local candidate promotion recorded",
    projectionVersion: `${record.projectionVersion}+candidate`,
    summary: candidate.objective || record.summary,
  };
}

export function prototypeCandidatePromotionInputComplete(
  input: PrototypeCandidatePromotionInput,
) {
  const excludedScope = normalizeCandidateScopeItems(input.scope.excluded);
  const includedScope = normalizeCandidateScopeItems(input.scope.included);

  return Boolean(
    input.audience.kind !== "unassigned" &&
    candidateTextWithinLimit(
      input.audience.label,
      prototypeCandidatePromotionFieldLimits.audienceLabel,
    ) &&
    candidateTextWithinLimit(
      input.objective,
      prototypeCandidatePromotionFieldLimits.objective,
    ) &&
    candidateTextWithinLimit(
      input.proof.criterion,
      prototypeCandidatePromotionFieldLimits.proofCriterion,
    ) &&
    input.proof.method !== "unassigned" &&
    candidateScopeWithinLimits(excludedScope) &&
    candidateScopeWithinLimits(includedScope),
  );
}

function upsertCandidateReceiptEvidence(
  record: PrototypeRecord,
  receiptRef: string,
) {
  const evidence = {
    detail:
      "Candidate Promotion retained the objective, intended audience, success proof, included and excluded scope, and operator decision.",
    id: receiptRef,
    label: "Candidate Promotion receipt",
    status: "prototype-local",
    tone: "ok" as const,
  };

  return record.evidence.some((item) => item.id === receiptRef)
    ? record.evidence.map((item) => (item.id === receiptRef ? evidence : item))
    : [...record.evidence, evidence];
}

function normalizeCandidateScopeItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function candidateScopeWithinLimits(items: string[]) {
  return Boolean(
    items.length > 0 &&
    items.length <= prototypeCandidatePromotionFieldLimits.scopeItems &&
    items.every(
      (item) => item.length <= prototypeCandidatePromotionFieldLimits.scopeItem,
    ),
  );
}

function candidateTextWithinLimit(value: string, maxLength: number) {
  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= maxLength;
}

function candidateStateForDecision(
  decision: PrototypeCandidatePromotionDecision,
): PrototypeRecord["candidate"]["state"] {
  switch (decision) {
    case "block-promotion":
      return "blocked";
    case "promote-candidate":
      return "candidate";
    case "route-closeout":
      return "closeout-routed";
  }
}

function prototypeCandidatePromotionNextMove(
  record: PrototypeRecord,
): PrototypeCurrentMove {
  if (
    record.preview.profileState !== "profile-configured" ||
    record.preview.proofState !== "proof-ready"
  ) {
    return {
      actionLabel: "Open Preview Runtime",
      detail:
        "Candidate Promotion is recorded. Confirm preview profile and local proof before Baseline Promotion.",
      id: "preview-proof",
      label: "Prepare preview proof",
      tone: "warn",
    };
  }

  return {
    actionLabel: "Open Baseline Promotion",
    detail:
      "Candidate Promotion is recorded. Review baseline evidence before Movement request preparation.",
    id: "baseline-promotion",
    label: "Prepare baseline promotion",
    tone: "warn",
  };
}

function prototypeRecordFactsReady(record: PrototypeRecord) {
  return Boolean(
    record.owner &&
    record.sourcePath &&
    record.sourceRef &&
    record.visibilityTier &&
    record.dataMode &&
    record.mutationBoundary,
  );
}

function prototypeRecordIssueTone(record: PrototypeRecord): OperationTone {
  if (record.openIssues.some((issue) => issue.status === "blocked")) {
    return "danger";
  }

  if (record.openIssues.length > 0) {
    return "warn";
  }

  return "ok";
}
