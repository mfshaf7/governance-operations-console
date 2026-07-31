import type { OperationTone } from "../../../../operation-contracts/operation-state.ts";

import type {
  PrototypeCurrentMove,
  PrototypeRecord,
} from "../../../domain/prototype-types.ts";

export type PrototypeBaselinePromotionStepId = "packet" | "decision";

export type PrototypeBaselinePromotionDecision =
  "approve-baseline" | "block-baseline" | "route-closeout";

export type PrototypeBaselinePromotionInput = {
  baselineStatement: string;
  baselineTitle: string;
  decision: PrototypeBaselinePromotionDecision;
  evidenceDisposition: string;
  issueDisposition: string;
};

export type PrototypeBaselinePromotionStep = {
  available: boolean;
  connectsToNext?: boolean;
  current: boolean;
  detail: string;
  id: PrototypeBaselinePromotionStepId;
  label: string;
  stateLabel: string;
  tone: OperationTone;
};

export type PrototypeBaselinePromotionMove = {
  description: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export type PrototypeBaselineEvidenceAssessment = {
  candidateReady: boolean;
  issuesClear: boolean;
  landingReady: boolean;
  missingRequirements: string[];
  previewReady: boolean;
  previewRequired: boolean;
  ready: boolean;
  retainedEvidenceReady: boolean;
};

export function prototypeBaselinePromotionActiveStep(
  record: PrototypeRecord,
): PrototypeBaselinePromotionStepId {
  if (record.currentMove.id === "baseline-promotion") {
    return "packet";
  }

  return "decision";
}

export function prototypeBaselinePromotionMove(
  record: PrototypeRecord,
): PrototypeBaselinePromotionMove {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      description:
        "This prototype is terminal. Baseline evidence is available for review only.",
      statusLabel: "Review",
      title: "Baseline Archived",
      tone: "muted",
    };
  }

  if (record.currentMove.id === "baseline-promotion") {
    return {
      description: record.currentMove.detail,
      statusLabel: "Current",
      title: record.currentMove.label,
      tone: record.currentMove.tone,
    };
  }

  if (record.baseline.state === "ready-for-movement") {
    return {
      description:
        "Baseline evidence is ready for Movement request preparation. Prototype still does not approve movement.",
      statusLabel: "Ready",
      title: "Baseline Ready",
      tone: "ok",
    };
  }

  if (record.baseline.state === "receipt-projected") {
    return {
      description:
        "A baseline receipt exists for this record. Review evidence before preparing movement.",
      statusLabel: "Recorded",
      title: "Baseline Receipt Recorded",
      tone: "ok",
    };
  }

  if (!prototypeBaselineCurrentEvidenceReady(record)) {
    return {
      description:
        "Current baseline evidence is not complete enough for local review.",
      statusLabel: "Evidence",
      title: "Baseline Needs Evidence",
      tone: "warn",
    };
  }

  return {
    description:
      "Review current evidence, boundary posture, and disposition before recording Baseline Promotion.",
    statusLabel: "Draft",
    title: "Baseline Draft",
    tone: "warn",
  };
}

export function prototypeBaselinePromotionWorkflowSteps(
  record: PrototypeRecord,
): PrototypeBaselinePromotionStep[] {
  const evidenceAssessment = prototypeBaselineEvidenceAssessment(record);
  const activeStep = prototypeBaselinePromotionActiveStep(record);
  const briefTone = prototypeBaselineBriefTone(record);
  const designTone = prototypeBaselineDesignTone(record);
  const evidenceTone = prototypeBaselineEvidenceTone(record);
  const boundaryTone = prototypeBaselineBoundaryTone(record);
  const issueTone = prototypeBaselineGapsTone(record);
  const decisionTone = prototypeBaselineStateTone(record);
  const packetTone: OperationTone = [
    briefTone,
    designTone,
    evidenceTone,
    boundaryTone,
    issueTone,
  ].includes("danger")
    ? "danger"
    : [briefTone, designTone, evidenceTone, boundaryTone, issueTone].includes(
          "warn",
        )
      ? "warn"
      : "ok";

  return [
    {
      available: true,
      connectsToNext: true,
      current: activeStep === "packet",
      detail: evidenceAssessment.ready
        ? `${record.baseline.evidenceRefs.length} retained evidence ref${record.baseline.evidenceRefs.length === 1 ? "" : "s"} / required proof clear`
        : `${evidenceAssessment.missingRequirements.length} evidence requirement${evidenceAssessment.missingRequirements.length === 1 ? "" : "s"} missing`,
      id: "packet",
      label: "Packet",
      stateLabel: packetTone === "ok" ? "Ready" : "Review",
      tone: packetTone,
    },
    {
      available: true,
      connectsToNext: false,
      current: activeStep === "decision",
      detail:
        record.baseline.lastPacketReceiptRef ??
        "Review packet before recording.",
      id: "decision",
      label: "Review and Apply",
      stateLabel: prototypeBaselinePromotionDecisionStateLabel(record),
      tone: decisionTone,
    },
  ];
}

export function prototypeBaselinePromotionActionState(record: PrototypeRecord) {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      label: "Review only",
      tone: "muted" as OperationTone,
    };
  }

  if (!prototypeBaselineCurrentEvidenceReady(record)) {
    return {
      label: "Needs evidence",
      tone: "warn" as OperationTone,
    };
  }

  return {
    label: "Local record",
    tone: prototypeBaselineStateTone(record),
  };
}

export function prototypeBaselinePromotionStateLabel(record: PrototypeRecord) {
  switch (record.baseline.state) {
    case "blocked":
      return "Blocked";
    case "drafting":
      return "Draft";
    case "needs-evidence":
      return "Needs evidence";
    case "not-started":
      return "Not started";
    case "ready-for-movement":
      return "Ready";
    case "receipt-projected":
      return "Recorded";
    case "returned":
      return "Returned";
  }
}

function prototypeBaselinePromotionDecisionStateLabel(record: PrototypeRecord) {
  if (record.baseline.state === "receipt-projected") {
    return "Recorded";
  }

  if (
    record.baseline.state === "blocked" ||
    record.baseline.state === "returned"
  ) {
    return "Blocked";
  }

  return prototypeBaselineCurrentEvidenceReady(record)
    ? "Review"
    : "Needs evidence";
}

export function prototypeRecordAfterBaselinePromotion(
  record: PrototypeRecord,
  receiptRef: string,
  input: PrototypeBaselinePromotionInput,
): PrototypeRecord {
  if (
    record.lifecycle === "retired" ||
    record.lifecycle === "graduated" ||
    record.baseline.state === "receipt-projected" ||
    !prototypeBaselinePromotionInputComplete(input) ||
    !canRecordPrototypeBaselinePromotion(record, input.decision)
  ) {
    return record;
  }

  const baseline = prototypeBaselinePacketFromInput(record, receiptRef, input);

  if (input.decision === "block-baseline") {
    const blocker = prototypeBaselineDecisionBlocker(record, input);

    return {
      ...record,
      baseline: {
        ...baseline,
        openIssueRefs: Array.from(
          new Set([...baseline.openIssueRefs, blocker.id]),
        ),
        state: "blocked",
      },
      currentMove: {
        actionLabel: "Open Baseline Promotion",
        detail:
          "Baseline Promotion is blocked locally. Resolve the required fix before movement preparation.",
        id: "baseline-promotion",
        label: "Resolve baseline blocker",
        tone: "danger",
      },
      projectionFreshness: "prototype-local baseline blocked",
      projectionVersion: appendPrototypeProjectionVersion(
        record.projectionVersion,
        "baseline-blocked",
      ),
      openIssues: [
        ...record.openIssues.filter((issue) => issue.id !== blocker.id),
        blocker,
      ],
    };
  }

  if (input.decision === "route-closeout") {
    return {
      ...record,
      baseline,
      currentMove: {
        actionLabel: "Open Closeout",
        detail:
          "Baseline Promotion concluded this prototype should stop. Review closeout impact before retirement.",
        id: "closeout-retirement",
        label: "Review closeout",
        tone: "warn",
      },
      projectionFreshness: "prototype-local baseline closeout routed",
      projectionVersion: appendPrototypeProjectionVersion(
        record.projectionVersion,
        "baseline-closeout",
      ),
    };
  }

  const packetReady =
    prototypeBaselineCurrentEvidenceReady(record) &&
    record.baseline.state !== "blocked" &&
    record.baseline.state !== "returned" &&
    !record.openIssues.some((issue) => issue.status === "blocked");

  if (!packetReady) {
    return record;
  }

  const nextMove: PrototypeCurrentMove = {
    actionLabel: "Open Movement Request",
    detail:
      "Baseline Promotion is locally recorded. Translate it into Movement Control request fields.",
    id: "movement-request",
    label: "Prepare movement request",
    tone: "warn",
  };

  return {
    ...record,
    baseline: {
      ...baseline,
      missingItems: [],
      state: "ready-for-movement",
    },
    currentMove: nextMove,
    movementRequest: {
      ...record.movementRequest,
      gateSnapshot: record.movementRequest.gateSnapshot.map((gate) =>
        gate.gateKind === "prototype baseline evidence"
          ? {
              ...gate,
              requiredFix: undefined,
              status: "ready" as const,
              summary: "Prototype Baseline Promotion is recorded locally.",
              tone: "ok" as const,
            }
          : gate,
      ),
      state: "draft-ready",
    },
    lifecycle: "baseline-approved",
    projectionFreshness: "prototype-local baseline ready",
    projectionVersion: appendPrototypeProjectionVersion(
      record.projectionVersion,
      "packet",
    ),
  };
}

function prototypeBaselineDecisionBlocker(
  record: PrototypeRecord,
  input: PrototypeBaselinePromotionInput,
): PrototypeRecord["openIssues"][number] {
  return {
    id: `${record.id}-baseline-decision-blocker`,
    owner: record.owner,
    requiredFix: input.issueDisposition.trim(),
    status: "blocked",
    title: "Baseline Promotion Blocked",
    tone: "danger",
  };
}

export function prototypeBaselinePromotionInputComplete(
  input: PrototypeBaselinePromotionInput,
) {
  return Boolean(
    input.baselineStatement.trim() &&
    input.baselineTitle.trim() &&
    input.evidenceDisposition.trim() &&
    input.issueDisposition.trim(),
  );
}

function prototypeBaselinePacketFromInput(
  record: PrototypeRecord,
  receiptRef: string,
  input: PrototypeBaselinePromotionInput,
): PrototypeRecord["baseline"] {
  return {
    ...record.baseline,
    acceptedSummary:
      record.candidate.scope.included.join("; ") || record.summary,
    baselineStatement: input.baselineStatement.trim(),
    baselineTitle: input.baselineTitle.trim(),
    evidenceDisposition: input.evidenceDisposition.trim(),
    excludedSummary:
      record.candidate.scope.excluded.join("; ") ||
      "Movement approval, platform runtime, security acceptance, production release, and source graduation are excluded.",
    issueDisposition: input.issueDisposition.trim(),
    lastPacketReceiptRef: receiptRef,
  };
}

function prototypeBaselineBriefTone(record: PrototypeRecord): OperationTone {
  return record.summary && record.owner && record.lifecycle === "candidate"
    ? "ok"
    : "warn";
}

function prototypeBaselineDesignTone(record: PrototypeRecord): OperationTone {
  const assessment = prototypeBaselineEvidenceAssessment(record);

  return assessment.candidateReady && assessment.landingReady ? "ok" : "warn";
}

function prototypeBaselineBoundaryTone(record: PrototypeRecord): OperationTone {
  if (
    record.dataMode === "real-mutable" ||
    record.mutationBoundary === "real-system"
  ) {
    return "danger";
  }

  if (
    record.visibilityTier === "client-review" ||
    record.visibilityTier === "public-demo"
  ) {
    return "warn";
  }

  return "ok";
}

function prototypeBaselineEvidenceTone(record: PrototypeRecord): OperationTone {
  const assessment = prototypeBaselineEvidenceAssessment(record);

  if (!assessment.retainedEvidenceReady || !assessment.previewReady) {
    return "warn";
  }

  const baselineEvidence = record.baseline.evidenceRefs.map((ref) =>
    record.evidence.find((item) => item.id === ref),
  );

  if (baselineEvidence.some((item) => !item)) {
    return "warn";
  }

  if (baselineEvidence.some((item) => item?.tone === "danger")) {
    return "danger";
  }

  if (baselineEvidence.some((item) => item?.tone === "warn")) {
    return "warn";
  }

  return "ok";
}

function prototypeBaselineGapsTone(record: PrototypeRecord): OperationTone {
  if (
    record.openIssues.some((issue) => issue.status === "blocked") ||
    record.baseline.state === "blocked"
  ) {
    return "danger";
  }

  return "ok";
}

function prototypeBaselineStateTone(record: PrototypeRecord): OperationTone {
  switch (record.baseline.state) {
    case "blocked":
    case "returned":
      return "danger";
    case "ready-for-movement":
    case "receipt-projected":
      return "ok";
    case "drafting":
    case "needs-evidence":
      return "warn";
    case "not-started":
      return "muted";
  }
}

export function canRecordPrototypeBaselinePromotion(
  record: PrototypeRecord,
  decision: PrototypeBaselinePromotionDecision,
) {
  if (record.baseline.state === "receipt-projected") {
    return false;
  }

  if (
    record.landing.state !== "landed" ||
    !record.landing.lastLandingReceiptRef ||
    record.candidate.state !== "candidate" ||
    record.candidate.decision !== "promote-candidate" ||
    !record.candidate.lastReceiptRef
  ) {
    return false;
  }

  if (decision === "block-baseline" || decision === "route-closeout") {
    return true;
  }

  return (
    prototypeBaselineCurrentEvidenceReady(record) &&
    record.baseline.state !== "blocked" &&
    record.baseline.state !== "returned" &&
    !record.openIssues.some((issue) => issue.status === "blocked")
  );
}

function appendPrototypeProjectionVersion(version: string, suffix: string) {
  return version.includes(`+${suffix}`) ? version : `${version}+${suffix}`;
}

export function prototypeBaselineEvidenceAssessment(
  record: PrototypeRecord,
): PrototypeBaselineEvidenceAssessment {
  const candidateReady = Boolean(
    record.candidate.state === "candidate" &&
    record.candidate.decision === "promote-candidate" &&
    record.candidate.audience.kind !== "unassigned" &&
    record.candidate.audience.label.trim() &&
    record.candidate.objective.trim() &&
    record.candidate.proof.criterion.trim() &&
    record.candidate.scope.included.length > 0,
  );
  const landingReady = Boolean(
    record.landing.state === "landed" && record.landing.lastLandingReceiptRef,
  );
  const retainedEvidence = record.baseline.evidenceRefs.map((ref) =>
    record.evidence.find((item) => item.id === ref),
  );
  const retainedEvidenceReady = Boolean(
    retainedEvidence.length > 0 &&
    retainedEvidence.every(
      (item) => item && item.tone !== "danger" && item.tone !== "warn",
    ),
  );
  const previewRequired = record.landing.previewNeed !== "none";
  const previewReady = Boolean(
    !previewRequired ||
    (record.preview.proofState === "proof-ready" &&
      record.preview.lastProofRef),
  );
  const issuesClear = !record.openIssues.some(
    (issue) => issue.status === "blocked",
  );
  const missingRequirements = [
    !candidateReady ? "candidate posture" : null,
    !landingReady ? "Landing receipt" : null,
    !retainedEvidenceReady ? "retained evidence" : null,
    !previewReady ? "current preview proof" : null,
    !issuesClear ? "blocking issue resolution" : null,
  ].filter((requirement): requirement is string => Boolean(requirement));

  return {
    candidateReady,
    issuesClear,
    landingReady,
    missingRequirements,
    previewReady,
    previewRequired,
    ready: missingRequirements.length === 0,
    retainedEvidenceReady,
  };
}

export function prototypeBaselineCurrentEvidenceReady(record: PrototypeRecord) {
  return prototypeBaselineEvidenceAssessment(record).ready;
}
