import type { TerasTone } from "@/teras";

import type {
  PrototypeCandidateAudienceKind,
  PrototypeCandidateProofMethod,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeCandidatePromotionInputComplete,
  type PrototypeCandidatePromotionDecision,
  type PrototypeCandidatePromotionInput,
} from "../../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import {
  prototypeDataModeLabel,
  prototypeMutationBoundaryLabel,
  prototypeVisibilityLabel,
} from "../../shared/prototype-record-display-model.ts";

export type PrototypeCandidatePromotionDraft = {
  advisorDraft: string;
  advisorPrompt: string;
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

export type PrototypeCandidateChecklistRow = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export const candidateDecisionOptions = [
  { id: "promote-candidate", label: "Promote to candidate", tone: "info" },
  { id: "block-promotion", label: "Block promotion", tone: "danger" },
  { id: "route-closeout", label: "Route to closeout", tone: "warn" },
] satisfies Array<{
  id: PrototypeCandidatePromotionDecision;
  label: string;
  tone: "danger" | "info" | "warn";
}>;

export const candidateAudienceOptions = [
  { label: "Select audience", value: "unassigned" },
  { label: "Self", value: "self" },
  { label: "Internal user", value: "internal-user" },
  { label: "Client reviewer", value: "client-reviewer" },
  { label: "External user", value: "external-user" },
] satisfies Array<{
  label: string;
  value: PrototypeCandidateAudienceKind;
}>;

export const candidateProofMethodOptions = [
  { label: "Select proof method", value: "unassigned" },
  { label: "Operator review", value: "operator-review" },
  { label: "Demonstration", value: "demonstration" },
  { label: "Technical validation", value: "technical-validation" },
  { label: "User feedback", value: "user-feedback" },
] satisfies Array<{
  label: string;
  value: PrototypeCandidateProofMethod;
}>;

export function candidatePromotionDraftFromRecord(
  record: PrototypeRecord | null,
): PrototypeCandidatePromotionDraft {
  return {
    advisorDraft: "",
    advisorPrompt: "",
    audience: {
      kind: record?.candidate.audience.kind ?? "unassigned",
      label: record?.candidate.audience.label ?? "",
    },
    decision: "promote-candidate",
    objective: record?.candidate.objective || record?.summary || "",
    proof: {
      criterion: record?.candidate.proof.criterion ?? "",
      method: record?.candidate.proof.method ?? "unassigned",
    },
    scope: {
      excluded: editableCandidateScopeItems(record?.candidate.scope.excluded),
      included: editableCandidateScopeItems(record?.candidate.scope.included),
    },
  };
}

export function candidatePromotionInputFromDraft(
  draft: PrototypeCandidatePromotionDraft,
): PrototypeCandidatePromotionInput {
  return {
    audience: {
      kind: draft.audience.kind,
      label: draft.audience.label,
    },
    decision: draft.decision,
    objective: draft.objective,
    proof: {
      criterion: draft.proof.criterion,
      method: draft.proof.method,
    },
    scope: {
      excluded: [...draft.scope.excluded],
      included: [...draft.scope.included],
    },
  };
}

export function candidatePromotionDraftComplete(
  draft: PrototypeCandidatePromotionDraft,
) {
  return prototypeCandidatePromotionInputComplete(
    candidatePromotionInputFromDraft(draft),
  );
}

export function candidatePromotionDraftDirty(
  draft: PrototypeCandidatePromotionDraft,
  sourceDraft: PrototypeCandidatePromotionDraft,
) {
  return (
    draft.advisorDraft !== sourceDraft.advisorDraft ||
    draft.advisorPrompt !== sourceDraft.advisorPrompt ||
    draft.audience.kind !== sourceDraft.audience.kind ||
    draft.audience.label !== sourceDraft.audience.label ||
    draft.decision !== sourceDraft.decision ||
    draft.objective !== sourceDraft.objective ||
    draft.proof.criterion !== sourceDraft.proof.criterion ||
    draft.proof.method !== sourceDraft.proof.method ||
    !candidateScopeItemsEqual(
      draft.scope.excluded,
      sourceDraft.scope.excluded,
    ) ||
    !candidateScopeItemsEqual(draft.scope.included, sourceDraft.scope.included)
  );
}

export function candidatePromotionReadyTone(ready: boolean): TerasTone {
  return ready ? "ok" : "warn";
}

export function candidatePromotionDraftStatus(ready: boolean) {
  return {
    label: ready ? "Ready" : "Needs fields",
    tone: candidatePromotionReadyTone(ready),
  };
}

export function candidatePromotionReviewStatus({
  actionLabel,
  issueTone,
  reviewReady,
}: {
  actionLabel: string;
  issueTone: TerasTone;
  reviewReady: boolean;
}) {
  return {
    label: reviewReady ? actionLabel : "Needs review",
    tone: reviewReady ? ("ok" as const) : issueTone,
  };
}

export function candidatePromotionFieldRow({
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
    dataTone: candidatePromotionReadyTone(ready),
    detail: ready ? readyDetail : missingDetail,
    id,
    indexLabel: index,
    label,
    status: ready ? "ready" : "needed",
    statusTone: candidatePromotionReadyTone(ready),
  };
}

export function candidatePromotionBoundaryReady(record: PrototypeRecord) {
  return Boolean(
    record.owner &&
    record.sourcePath &&
    record.sourceRef &&
    record.visibilityTier &&
    record.dataMode &&
    record.mutationBoundary,
  );
}

export function candidatePromotionBoundaryDetail(record: PrototypeRecord) {
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

export function candidatePromotionIssueProjection(record: PrototypeRecord) {
  const blockedIssue = record.openIssues.some(
    (issue) => issue.status === "blocked",
  );

  return {
    blockedIssue,
    detail: blockedIssue
      ? "Blocked issue present."
      : record.openIssues.length > 0
        ? `${record.openIssues.length} open issue${record.openIssues.length === 1 ? "" : "s"} visible.`
        : "No open issue.",
    tone: blockedIssue
      ? ("danger" as const)
      : record.openIssues.length > 0
        ? ("warn" as const)
        : ("ok" as const),
  };
}

export function candidatePromotionReviewTone({
  blockedIssue,
  reviewReady,
}: {
  blockedIssue: boolean;
  reviewReady: boolean;
}) {
  if (reviewReady) {
    return "ok" as const;
  }

  if (blockedIssue) {
    return "danger" as const;
  }

  return "warn" as const;
}

export function candidatePromotionDecisionTone(
  decision: PrototypeCandidatePromotionDecision,
) {
  switch (decision) {
    case "block-promotion":
      return "danger" as const;
    case "route-closeout":
      return "warn" as const;
    case "promote-candidate":
      return "info" as const;
  }
}

export function candidatePromotionDecisionActionLabel(
  decision: PrototypeCandidatePromotionDecision,
) {
  switch (decision) {
    case "block-promotion":
      return "Block Promotion";
    case "promote-candidate":
      return "Record Candidate Promotion";
    case "route-closeout":
      return "Route To Closeout";
  }
}

export function candidateReviewRows(
  draft: PrototypeCandidatePromotionDraft,
  record: PrototypeRecord,
): PrototypeCandidateChecklistRow[] {
  const rows: PrototypeCandidateChecklistRow[] = [
    {
      detail: draft.objective || "Objective missing.",
      id: "candidate-objective",
      label: "Objective",
      status: draft.objective.trim() ? "packet" : "needed",
      tone: draft.objective.trim() ? "info" : "warn",
    },
    {
      detail:
        draft.audience.kind !== "unassigned" && draft.audience.label.trim()
          ? `${draft.audience.label} / ${candidateAudienceLabel(draft.audience.kind)}`
          : "Intended audience missing.",
      id: "candidate-audience",
      label: "Audience",
      status:
        draft.audience.kind !== "unassigned" && draft.audience.label.trim()
          ? "packet"
          : "needed",
      tone:
        draft.audience.kind !== "unassigned" && draft.audience.label.trim()
          ? "info"
          : "warn",
    },
    {
      detail:
        draft.proof.method !== "unassigned" && draft.proof.criterion.trim()
          ? `${draft.proof.criterion} / ${candidateProofMethodLabel(draft.proof.method)}`
          : "Success proof missing.",
      id: "candidate-proof",
      label: "Proof",
      status:
        draft.proof.method !== "unassigned" && draft.proof.criterion.trim()
          ? "packet"
          : "needed",
      tone:
        draft.proof.method !== "unassigned" && draft.proof.criterion.trim()
          ? "info"
          : "warn",
    },
    {
      detail: candidateScopeItemsReady(draft.scope.included)
        ? candidateScopeSummary(draft.scope.included)
        : "Included scope missing.",
      id: "candidate-scope",
      label: "Included",
      status: candidateScopeItemsReady(draft.scope.included)
        ? "packet"
        : "needed",
      tone: candidateScopeItemsReady(draft.scope.included) ? "info" : "warn",
    },
    {
      detail: candidateScopeItemsReady(draft.scope.excluded)
        ? candidateScopeSummary(draft.scope.excluded)
        : "Excluded scope missing.",
      id: "candidate-exclusions",
      label: "Excluded",
      status: candidateScopeItemsReady(draft.scope.excluded)
        ? "packet"
        : "needed",
      tone: candidateScopeItemsReady(draft.scope.excluded) ? "info" : "warn",
    },
    {
      detail: candidatePromotionBoundaryDetail(record),
      id: "candidate-boundary",
      label: "Boundary",
      status: candidatePromotionBoundaryReady(record) ? "clear" : "review",
      tone: candidatePromotionBoundaryReady(record) ? "ok" : "warn",
    },
  ];

  return record.openIssues.length > 0
    ? [
        ...rows,
        ...record.openIssues.map((issue) => ({
          detail: issue.requiredFix,
          id: issue.id,
          label: issue.title,
          status: issue.status,
          tone: issue.tone,
        })),
      ]
    : [
        ...rows,
        {
          detail: "No Candidate Promotion issue is listed.",
          id: "candidate-issues-clear",
          label: "Issues",
          status: "clear",
          tone: "ok" as const,
        },
      ];
}

export function candidatePromotionAdvisorTranscript({
  draft,
  draftComplete,
  record,
}: {
  draft: PrototypeCandidatePromotionDraft;
  draftComplete: boolean;
  record: PrototypeRecord;
}) {
  const openIssueText =
    record.openIssues.length > 0
      ? `${record.openIssues.length} open issue${record.openIssues.length === 1 ? "" : "s"} must stay visible.`
      : "No open issue is listed for this candidate review.";

  return [
    {
      id: `${record.id}-candidate-advisor-boundary`,
      role: "advisor" as const,
      text: `Locked to ${record.id}. I can challenge objective, scope, evidence, ownership, and boundary readiness. I do not approve baseline, Movement, platform runtime, security posture, or production path.`,
    },
    {
      id: `${record.id}-candidate-advisor-readiness`,
      role: "advisor" as const,
      text: `${draftComplete ? "Draft has the required fields." : "Draft still needs required fields."} ${openIssueText}`,
    },
    ...(draft.advisorDraft.trim()
      ? [
          {
            id: `${record.id}-candidate-advisor-draft`,
            role: "advisor" as const,
            text: draft.advisorDraft,
          },
        ]
      : []),
  ];
}

export function candidatePromotionAdvisorDraft(
  record: PrototypeRecord,
  draft: PrototypeCandidatePromotionDraft,
  prompt: string,
) {
  const missingFields = [
    ["objective", draft.objective],
    [
      "intended audience",
      draft.audience.kind === "unassigned" ? "" : draft.audience.label,
    ],
    [
      "success proof",
      draft.proof.method === "unassigned" ? "" : draft.proof.criterion,
    ],
    [
      "included scope",
      candidateScopeItemsReady(draft.scope.included) ? "ready" : "",
    ],
    [
      "excluded scope",
      candidateScopeItemsReady(draft.scope.excluded) ? "ready" : "",
    ],
  ]
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);

  return [
    `Advisor review for ${record.id}:`,
    `- Candidate decision: ${candidatePromotionDecisionActionLabel(draft.decision)}.`,
    `- Boundary posture: ${prototypeVisibilityLabel(record.visibilityTier)} / ${prototypeDataModeLabel(record.dataMode)} / ${prototypeMutationBoundaryLabel(record.mutationBoundary)}.`,
    `- Open issues: ${record.openIssues.length > 0 ? record.openIssues.map((issue) => issue.title).join(", ") : "none listed"}.`,
    missingFields.length > 0
      ? `- Missing draft fields: ${missingFields.join(", ")}.`
      : "- Required draft fields are present.",
    "- Reminder: Candidate Promotion only records local prototype acceptance.",
    `- Operator ask: ${prompt}`,
  ].join("\n");
}

export function candidateAudienceLabel(kind: PrototypeCandidateAudienceKind) {
  return (
    candidateAudienceOptions.find((option) => option.value === kind)?.label ??
    "Unassigned"
  );
}

export function candidateProofMethodLabel(
  method: PrototypeCandidateProofMethod,
) {
  return (
    candidateProofMethodOptions.find((option) => option.value === method)
      ?.label ?? "Unassigned"
  );
}

export function candidateScopeItemsReady(items: string[]) {
  return items.some((item) => item.trim().length > 0);
}

function editableCandidateScopeItems(items: string[] | undefined) {
  return items && items.length > 0 ? [...items] : [""];
}

function candidateScopeItemsEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function candidateScopeSummary(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join("; ");
}
