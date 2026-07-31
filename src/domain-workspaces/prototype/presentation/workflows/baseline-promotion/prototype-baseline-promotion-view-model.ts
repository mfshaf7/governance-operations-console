import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeBaselinePromotionDecision,
  PrototypeBaselinePromotionInput,
} from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import { prototypeBaselineEvidenceAssessment } from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import {
  prototypeDataModeLabel,
  prototypeMutationBoundaryLabel,
  prototypeVisibilityLabel,
} from "../../shared/prototype-record-display-model.ts";

export type PrototypeBaselinePromotionDraft = {
  advisorDraft: string;
  advisorPrompt: string;
  baselineStatement: string;
  baselineTitle: string;
  decision: PrototypeBaselinePromotionDecision;
  evidenceDisposition: string;
  issueDisposition: string;
};

export type PrototypeBaselineChecklistRow = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export const baselineDecisionOptions = [
  { id: "approve-baseline", label: "Approve baseline", tone: "ok" },
  { id: "block-baseline", label: "Block baseline", tone: "danger" },
  { id: "route-closeout", label: "Route closeout", tone: "warn" },
] satisfies Array<{
  id: PrototypeBaselinePromotionDecision;
  label: string;
  tone: "danger" | "ok" | "warn";
}>;

export function baselinePromotionDraftFromRecord(
  record: PrototypeRecord | null,
): PrototypeBaselinePromotionDraft {
  return {
    advisorDraft: "",
    advisorPrompt: "",
    baselineStatement:
      record?.baseline.baselineStatement ||
      (record
        ? `${record.name} is accepted as a Prototype Studio baseline for local workflow, visual, and boundary proof only.`
        : ""),
    baselineTitle:
      record?.baseline.baselineTitle ||
      (record ? `${record.name} baseline` : ""),
    decision: "approve-baseline",
    evidenceDisposition:
      record?.baseline.evidenceDisposition ||
      (record && record.baseline.evidenceRefs.length === 0
        ? "Attach current preview, validation, design-review, or operator-review evidence before applying this baseline."
        : "Current retained evidence and required preview proof are accepted for this local baseline packet."),
    issueDisposition:
      record?.baseline.issueDisposition ||
      (record && record.openIssues.some((issue) => issue.status === "blocked")
        ? "Blocked items must be resolved or explicitly recorded as the baseline outcome."
        : "Known follow-up items stay visible outside this step unless the operator chooses to block this baseline."),
  };
}

export function baselinePromotionInputFromDraft(
  draft: PrototypeBaselinePromotionDraft,
): PrototypeBaselinePromotionInput {
  return {
    baselineStatement: draft.baselineStatement,
    baselineTitle: draft.baselineTitle,
    decision: draft.decision,
    evidenceDisposition: draft.evidenceDisposition,
    issueDisposition: draft.issueDisposition,
  };
}

export function baselinePromotionDraftComplete(
  draft: PrototypeBaselinePromotionDraft,
) {
  return Boolean(
    draft.baselineStatement.trim() &&
    draft.baselineTitle.trim() &&
    draft.evidenceDisposition.trim() &&
    draft.issueDisposition.trim(),
  );
}

export function baselinePromotionDraftDirty(
  draft: PrototypeBaselinePromotionDraft,
  sourceDraft: PrototypeBaselinePromotionDraft,
) {
  return (
    draft.advisorDraft !== sourceDraft.advisorDraft ||
    draft.advisorPrompt !== sourceDraft.advisorPrompt ||
    draft.baselineStatement !== sourceDraft.baselineStatement ||
    draft.baselineTitle !== sourceDraft.baselineTitle ||
    draft.decision !== sourceDraft.decision ||
    draft.evidenceDisposition !== sourceDraft.evidenceDisposition ||
    draft.issueDisposition !== sourceDraft.issueDisposition
  );
}

export function baselineReadyTone(ready: boolean): TerasTone {
  return ready ? "ok" : "warn";
}

export function baselineDraftStatus(ready: boolean) {
  return {
    label: ready ? "Ready" : "Needs fields",
    tone: baselineReadyTone(ready),
  };
}

export function baselineFieldCheckRow({
  id,
  index,
  label,
  missingDetail,
  ready,
  readyDetail,
}: {
  id: string;
  index: string;
  label: string;
  missingDetail: string;
  ready: boolean;
  readyDetail: string;
}) {
  return {
    dataTone: baselineReadyTone(ready),
    detail: ready ? readyDetail : missingDetail,
    id,
    indexLabel: index,
    label,
    status: ready ? "ready" : "needed",
    statusTone: baselineReadyTone(ready),
  };
}

export function baselineEvidenceChecklistRows(
  record: PrototypeRecord,
): PrototypeBaselineChecklistRow[] {
  const assessment = prototypeBaselineEvidenceAssessment(record);
  const evidenceById = new Map(
    record.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const retainedEvidenceRows: PrototypeBaselineChecklistRow[] =
    record.baseline.evidenceRefs.map((ref) => {
      const evidence = evidenceById.get(ref);

      if (evidence) {
        return {
          detail: evidence.detail,
          id: evidence.id,
          label: evidence.label,
          status: evidence.status,
          tone: evidence.tone,
        };
      }

      return {
        detail:
          "Referenced by the baseline packet, but no retained evidence item is available.",
        id: ref,
        label: ref,
        status: "missing ref",
        tone: "warn" as const,
      };
    });
  const prerequisiteRows: PrototypeBaselineChecklistRow[] = [
    {
      detail: assessment.candidateReady
        ? (record.candidate.lastReceiptRef ??
          "Candidate posture is supplied by the source projection.")
        : "Candidate Promotion must provide objective, audience, proof, and accepted scope.",
      id: "baseline-candidate-posture",
      label: "Candidate posture",
      status: assessment.candidateReady ? "ready" : "missing",
      tone: assessment.candidateReady ? "ok" : "warn",
    },
    {
      detail:
        record.landing.lastLandingReceiptRef ??
        "A completed Landing receipt is required.",
      id: "baseline-landing-receipt",
      label: "Landing receipt",
      status: assessment.landingReady ? "ready" : "missing",
      tone: assessment.landingReady ? "ok" : "warn",
    },
    {
      detail: assessment.previewRequired
        ? (record.preview.lastProofRef ?? "Current preview proof is required.")
        : "This prototype does not require preview proof.",
      id: "baseline-preview-proof",
      label: "Preview proof",
      status: assessment.previewRequired
        ? assessment.previewReady
          ? "ready"
          : "missing"
        : "not required",
      tone: assessment.previewReady ? "ok" : "warn",
    },
  ];
  const rows = [...prerequisiteRows, ...retainedEvidenceRows];

  return rows.length > 0
    ? rows
    : [
        {
          detail:
            "Attach preview, validation, design-review, or operator-review evidence before Baseline Promotion.",
          id: "baseline-evidence-empty",
          label: "No baseline evidence",
          status: "needed",
          tone: "warn" as const,
        },
      ];
}

export function baselineBoundaryTone(record: PrototypeRecord): TerasTone {
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

export function baselineCurrentEvidenceTone(
  record: PrototypeRecord,
): TerasTone {
  const assessment = prototypeBaselineEvidenceAssessment(record);

  if (!assessment.ready) {
    return "warn";
  }

  const evidenceById = new Map(
    record.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const retainedEvidence = record.baseline.evidenceRefs.map((ref) =>
    evidenceById.get(ref),
  );

  if (retainedEvidence.some((item) => !item)) {
    return "warn";
  }

  if (retainedEvidence.some((item) => item?.tone === "danger")) {
    return "danger";
  }

  if (retainedEvidence.some((item) => item?.tone === "warn")) {
    return "warn";
  }

  return "ok";
}

export function baselineBoundaryCompactDetail(record: PrototypeRecord) {
  return [
    record.visibilityTier === "private-internal"
      ? "Internal"
      : prototypeVisibilityLabel(record.visibilityTier),
    record.dataMode === "real-readonly"
      ? "Read-only"
      : prototypeDataModeLabel(record.dataMode),
    record.mutationBoundary === "prototype-local"
      ? "Local"
      : prototypeMutationBoundaryLabel(record.mutationBoundary),
  ].join(" / ");
}

export function baselineDecisionTone(
  decision: PrototypeBaselinePromotionDecision,
) {
  switch (decision) {
    case "approve-baseline":
      return "ok" as const;
    case "block-baseline":
      return "danger" as const;
    case "route-closeout":
      return "warn" as const;
  }
}

export function baselineDecisionActionLabel(
  decision: PrototypeBaselinePromotionDecision,
) {
  switch (decision) {
    case "approve-baseline":
      return "Approve Baseline";
    case "block-baseline":
      return "Block Baseline";
    case "route-closeout":
      return "Route Closeout";
  }
}

export function baselinePromotionAdvisorTranscript({
  draft,
  draftComplete,
  record,
}: {
  draft: PrototypeBaselinePromotionDraft;
  draftComplete: boolean;
  record: PrototypeRecord;
}) {
  return [
    {
      id: `${record.id}-baseline-advisor-boundary`,
      role: "advisor" as const,
      text: `Locked to ${record.id}. I can challenge baseline statement, evidence, workflow coverage, boundary facts, and issue disposition. I do not approve Movement, platform runtime, security posture, or source graduation.`,
    },
    {
      id: `${record.id}-baseline-advisor-readiness`,
      role: "advisor" as const,
      text: draftComplete
        ? "Draft has the required Baseline Promotion fields."
        : "Draft still needs required Baseline Promotion fields.",
    },
    ...(draft.advisorDraft.trim()
      ? [
          {
            id: `${record.id}-baseline-advisor-draft`,
            role: "advisor" as const,
            text: draft.advisorDraft,
          },
        ]
      : []),
  ];
}

export function baselinePromotionAdvisorDraft(
  record: PrototypeRecord,
  draft: PrototypeBaselinePromotionDraft,
  prompt: string,
) {
  const missingFields = [
    ["baseline title", draft.baselineTitle],
    ["baseline statement", draft.baselineStatement],
    ["evidence disposition", draft.evidenceDisposition],
    ["issue disposition", draft.issueDisposition],
  ]
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);

  return [
    `Advisor review for ${record.id}:`,
    `- Baseline decision: ${baselineDecisionActionLabel(draft.decision)}.`,
    `- Current evidence: ${record.baseline.evidenceRefs.length} retained refs; ${prototypeBaselineEvidenceAssessment(record).missingRequirements.length} missing requirements.`,
    `- Boundary posture: ${prototypeVisibilityLabel(record.visibilityTier)} / ${prototypeDataModeLabel(record.dataMode)} / ${prototypeMutationBoundaryLabel(record.mutationBoundary)}.`,
    missingFields.length > 0
      ? `- Missing draft fields: ${missingFields.join(", ")}.`
      : "- Required draft fields are present.",
    "- Reminder: Baseline Promotion records local Prototype Studio acceptance only.",
    `- Operator ask: ${prompt}`,
  ].join("\n");
}
