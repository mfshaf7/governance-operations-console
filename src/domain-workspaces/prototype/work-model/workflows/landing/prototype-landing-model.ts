import type { OperationTone } from "../../../../operation-contracts/operation-state.ts";

import type {
  PrototypeBasePlatform,
  PrototypeCurrentMove,
  PrototypeDataMode,
  PrototypeLandingState,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeRecord,
  PrototypeSourceHome,
  PrototypeSupportProfile,
  PrototypeSupportRow,
  PrototypeVisibilityTier,
} from "../../../domain/prototype-types.ts";
import {
  prototypeBasePlatformLabel,
  prototypeBasePlatformLaunchAdapter,
  prototypeBasePlatformPreviewCommand,
  prototypeSetupItemsForProfile,
} from "../../../domain/support/prototype-setup-profile-model.ts";
import {
  prototypeSupportProfileLabel,
  prototypeSupportStateLabel,
} from "../../../domain/support/prototype-support-profile-model.ts";

export type PrototypeLandingDraft = {
  basePlatform: PrototypeBasePlatform;
  dataMode: PrototypeDataMode;
  mutationBoundary: PrototypeMutationBoundary;
  name: string;
  owner: string;
  previewNeed: PrototypePreviewNeed;
  sourceHome: PrototypeSourceHome;
  summary: string;
  supportProfile: PrototypeSupportProfile;
  supportRows: PrototypeSupportRow[];
  visibilityTier: PrototypeVisibilityTier;
};

export type PrototypeLandingCommandInput = {
  draft: PrototypeLandingDraft;
  simulationDraftKey: string;
  simulationReceiptId: string;
};

export type PrototypeLandingPlan = ReturnType<
  typeof prototypeLandingPlanFromDraft
>;

export function prototypeLandingDraftKey(draft: PrototypeLandingDraft) {
  return [
    draft.basePlatform,
    draft.dataMode,
    draft.mutationBoundary,
    draft.name.trim(),
    draft.owner.trim(),
    draft.previewNeed,
    draft.sourceHome,
    draft.summary.trim(),
    draft.supportProfile,
    draft.visibilityTier,
    draft.supportRows.map((row) => `${row.id}:${row.state}`).join("|"),
  ].join("|");
}

export type PrototypeLandingStepId = "entry-support" | "setup-plan" | "result";

export type PrototypeLandingStep = {
  available: boolean;
  current: boolean;
  detail: string;
  id: PrototypeLandingStepId;
  label: string;
  stateLabel: string;
  tone: OperationTone;
};

export type PrototypeLandingMove = {
  description: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
};

export function prototypeLandingActiveStep(
  record: PrototypeRecord,
): PrototypeLandingStepId {
  if (record.landing.state === "blocked" || record.landing.state === "landed") {
    return "result";
  }

  return "entry-support";
}

export function prototypeLandingMove(
  record: PrototypeRecord,
): PrototypeLandingMove {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return {
      description:
        "This prototype is terminal. Landing is available for review only.",
      statusLabel: "Review",
      title: "Landing Archived",
      tone: "muted",
    };
  }

  if (record.landing.state === "landed") {
    return {
      description:
        "Support profile, source home, preview need, and setup plan are already recorded.",
      statusLabel: "Done",
      title: "Landing Recorded",
      tone: "ok",
    };
  }

  if (
    record.landing.state === "blocked" ||
    prototypeLandingHasBlockingSupport(record.landing.supportRows) ||
    record.landing.blockedItems.length > 0
  ) {
    return {
      description:
        "Landing is blocked until the required support or recovery item is resolved.",
      statusLabel: "Blocked",
      title: "Landing Blocked",
      tone: "warn",
    };
  }

  return {
    description:
      "Review support needs and create the Prototype Studio shape before candidate promotion starts.",
    statusLabel: "Current",
    title: "Land Prototype Request",
    tone: "warn",
  };
}

export function prototypeLandingWorkflowSteps(
  record: PrototypeRecord,
): PrototypeLandingStep[] {
  const activeStep = prototypeLandingActiveStep(record);
  const setupTone = prototypeLandingSetupTone(record.landing.basePlatform);
  const resultTone = prototypeLandingResultTone(record);
  const openSupportRows = record.landing.supportRows.filter(
    (row) => row.state === "needed" || row.state === "unknown",
  );
  const blockedSupportRows = record.landing.supportRows.filter(
    (row) => row.state === "blocked",
  );
  const resultBlockerCount =
    record.landing.blockedItems.length > 0
      ? record.landing.blockedItems.length
      : blockedSupportRows.length;

  return [
    {
      available: true,
      current: activeStep === "entry-support",
      detail: `${prototypeSupportProfileLabel(record.landing.supportProfile)} / ${openSupportRows.length} open`,
      id: "entry-support",
      label: "Landing Profile",
      stateLabel:
        blockedSupportRows.length > 0
          ? "Blocked"
          : record.landing.state === "captured"
            ? "Captured"
            : "Recorded",
      tone:
        blockedSupportRows.length > 0
          ? "warn"
          : record.landing.state === "captured"
            ? "warn"
            : "ok",
    },
    {
      available: true,
      current: activeStep === "setup-plan",
      detail: `${prototypeBasePlatformLabel(record.landing.basePlatform)} / ${record.landing.supportRows.length} support row${record.landing.supportRows.length === 1 ? "" : "s"}`,
      id: "setup-plan",
      label: "Setup Plan",
      stateLabel: record.landing.state === "landed" ? "Done" : "Draft",
      tone: setupTone,
    },
    {
      available: true,
      current: activeStep === "result",
      detail:
        record.landing.state === "landed"
          ? "Landing recorded"
          : resultBlockerCount > 0
            ? `${resultBlockerCount} blocker${resultBlockerCount === 1 ? "" : "s"}`
            : "Ready to record",
      id: "result",
      label: "Landing Run",
      stateLabel:
        record.landing.state === "landed"
          ? "Done"
          : record.landing.state === "blocked"
            ? "Blocked"
            : "Review",
      tone: resultTone,
    },
  ];
}

export function prototypeLandingActionState(
  record: PrototypeRecord,
  supportRows: PrototypeSupportRow[] = record.landing.supportRows,
) {
  if (record.landing.state === "landed") {
    return {
      label: "Review only",
      tone: "muted" as OperationTone,
    };
  }

  if (
    prototypeLandingHasBlockingSupport(supportRows) ||
    record.landing.blockedItems.length > 0
  ) {
    return {
      label: "Blocked landing",
      tone: "warn" as OperationTone,
    };
  }

  return {
    label: "Local record",
    tone: "warn" as OperationTone,
  };
}

export function prototypeRecordAfterLanding(
  record: PrototypeRecord,
  draft: PrototypeLandingDraft = prototypeLandingDraftFromRecord(record),
  receiptRef: string | null = null,
): PrototypeRecord {
  if (record.landing.state === "landed") {
    return record;
  }

  const plan = prototypeLandingPlanFromDraft(record, draft);
  const nextMove: PrototypeCurrentMove = plan.hasLandingBlockers
    ? {
        actionLabel: "Open Landing",
        detail:
          "Landing recorded a blocked result. Resolve blocked support or recovery items before Candidate Promotion starts.",
        id: "landing",
        label: "Resolve landing blockers",
        tone: "warn",
      }
    : {
        actionLabel: "Open Candidate Promotion",
        detail:
          "Landing is recorded locally. Run Candidate Promotion to confirm scope, source boundary, and open issues before preview or baseline work.",
        id: "candidate-promotion",
        label: "Prepare candidate promotion",
        tone: "info",
      };

  return {
    ...record,
    baseline: plan.hasLandingBlockers
      ? record.baseline
      : {
          ...record.baseline,
          missingItems: record.baseline.missingItems.filter((item) =>
            prototypeMissingItemRemainsAfterLanding(item, draft),
          ),
          openIssueRefs: record.baseline.openIssueRefs.filter(
            (issueRef) => !prototypeLandingIngressIssueId(issueRef),
          ),
        },
    dataMode: draft.dataMode,
    currentMove: nextMove,
    landing: {
      ...record.landing,
      basePlatform: draft.basePlatform,
      blockedItems: plan.blockedItems,
      firstRequiredMove: plan.hasLandingBlockers
        ? "landing"
        : "candidate-promotion",
      lastLandingReceiptRef: receiptRef ?? record.landing.lastLandingReceiptRef,
      previewNeed: draft.previewNeed,
      requiredEvidence: plan.requiredEvidence,
      securityTriggers: plan.securityTriggers,
      setupItems: plan.setupItems,
      sourceHome: draft.sourceHome,
      supportProfile: draft.supportProfile,
      supportRows: draft.supportRows,
      state: plan.hasLandingBlockers ? "blocked" : "landed",
      validationPlan: plan.validationPlan,
    },
    mutationBoundary: draft.mutationBoundary,
    name: draft.name.trim() || record.name,
    owner: plan.owner,
    openIssues: plan.hasLandingBlockers
      ? record.openIssues
      : record.openIssues.filter(
          (issue) => !prototypeLandingIngressIssueId(issue.id),
        ),
    preview: {
      ...record.preview,
      command: plan.previewCommand,
      launchAdapter: plan.previewLaunchAdapter,
    },
    projectionFreshness: plan.hasLandingBlockers
      ? "prototype-local landing blocked"
      : "prototype-local landing recorded",
    projectionVersion: `${record.projectionVersion}+landing`,
    summary: draft.summary.trim() || record.summary,
    visibilityTier: draft.visibilityTier,
  };
}

export function prototypeLandingPlanFromDraft(
  record: PrototypeRecord,
  draft: PrototypeLandingDraft,
) {
  const requiredFieldBlockers = prototypeLandingRequiredFieldBlockers(draft);
  const supportBlockers = draft.supportRows
    .filter((row) => row.state === "blocked")
    .map((row) => `${row.label}: ${row.detail}`);
  const blockedItems = Array.from(
    new Set([...requiredFieldBlockers, ...supportBlockers]),
  );

  return {
    basePlatform: draft.basePlatform,
    blockedItems,
    hasLandingBlockers: blockedItems.length > 0,
    owner: draft.owner.trim() || record.owner,
    previewCommand: prototypeBasePlatformPreviewCommand(draft.basePlatform),
    previewNeed: draft.previewNeed,
    previewLaunchAdapter: prototypeBasePlatformLaunchAdapter(
      draft.basePlatform,
      draft.previewNeed,
    ),
    requiredEvidence: prototypeLandingRequiredEvidence(draft, {
      sourceContextAvailable: prototypeLandingSourceContextAvailable(record),
    }),
    requiredFieldBlockers,
    securityTriggers: prototypeLandingSecurityTriggers(draft),
    setupItems: prototypeSetupItemsForProfile({
      basePlatform: draft.basePlatform,
      sourceHome: draft.sourceHome,
      supportRows: draft.supportRows,
    }),
    sourceHome: draft.sourceHome,
    validationPlan: prototypeLandingValidationPlan(draft),
  };
}

function prototypeLandingIngressIssueId(issueId: string) {
  return (
    issueId === "issue-shape-request" || issueId.endsWith("-landing-issue")
  );
}

function prototypeMissingItemRemainsAfterLanding(
  item: string,
  draft: PrototypeLandingDraft,
) {
  const normalizedItem = item.trim().toLowerCase();

  if (
    normalizedItem === "landing receipt" ||
    normalizedItem === "source boundary"
  ) {
    return false;
  }

  if (
    draft.previewNeed === "none" &&
    (normalizedItem === "preview profile" || normalizedItem === "preview proof")
  ) {
    return false;
  }

  return true;
}

export function prototypeLandingRequiredEvidence(
  draft: PrototypeLandingDraft,
  { sourceContextAvailable }: { sourceContextAvailable: boolean },
) {
  const evidence = [
    "prototype objective",
    "owner decision",
    "landing support profile",
  ];

  if (sourceContextAvailable) {
    evidence.unshift("source context");
  } else {
    evidence.unshift("source context decision");
  }

  evidence.push(
    draft.basePlatform === "custom-unassigned"
      ? "base platform decision pending"
      : "base platform decision",
  );

  if (draft.previewNeed !== "none") {
    evidence.push("preview path decision");
  }

  if (
    draft.supportRows.some(
      (row) => row.id === "interface" && row.state !== "not-needed",
    )
  ) {
    evidence.push("interface support decision");
  }

  if (
    draft.visibilityTier === "client-review" ||
    draft.visibilityTier === "public-demo"
  ) {
    evidence.push("client-safe data decision");
  }

  return evidence;
}

export function prototypeLandingValidationPlan(draft: PrototypeLandingDraft) {
  const plan = [
    "prototype registry validator",
    "landing support profile review",
    "setup profile review",
  ];

  if (draft.previewNeed !== "none") {
    plan.push("focused preview check");
  }

  if (
    draft.supportRows.some(
      (row) => row.id === "interface" && row.state !== "not-needed",
    )
  ) {
    plan.push("manual visual inspection");
  }

  if (
    draft.supportRows.some(
      (row) =>
        (row.id === "runtime" || row.id === "integration") &&
        row.state !== "not-needed",
    )
  ) {
    plan.push("local runtime or adapter smoke");
  }

  return plan;
}

export function prototypeLandingSecurityTriggers(draft: PrototypeLandingDraft) {
  const triggers: string[] = [];

  if (
    draft.visibilityTier === "client-review" ||
    draft.visibilityTier === "public-demo"
  ) {
    triggers.push("client or public visibility");
  }

  if (draft.dataMode === "real-readonly" || draft.dataMode === "real-mutable") {
    triggers.push("real data");
  }

  if (
    draft.mutationBoundary === "external-sandbox" ||
    draft.mutationBoundary === "real-system"
  ) {
    triggers.push("external or real mutation");
  }

  return triggers;
}

function prototypeLandingSourceContextAvailable(record: PrototypeRecord) {
  return Boolean(
    record.sourceRef.trim() ||
    record.evidence.some((evidence) => evidence.id.includes("source")),
  );
}

export function prototypeLandingDraftFromRecord(
  record: PrototypeRecord,
): PrototypeLandingDraft {
  return {
    basePlatform: record.landing.basePlatform,
    dataMode: record.dataMode,
    mutationBoundary: record.mutationBoundary,
    name: record.name,
    owner: record.owner,
    previewNeed: record.landing.previewNeed,
    sourceHome: record.landing.sourceHome,
    summary: record.summary,
    supportProfile: record.landing.supportProfile,
    supportRows: record.landing.supportRows,
    visibilityTier: record.visibilityTier,
  };
}

function prototypeLandingRequiredFieldBlockers(draft: PrototypeLandingDraft) {
  const blockers: string[] = [];

  if (draft.basePlatform === "custom-unassigned") {
    blockers.push("base platform");
  }

  if (!draft.name.trim()) {
    blockers.push("prototype name");
  }

  if (!draft.owner.trim()) {
    blockers.push("owner");
  }

  if (!draft.summary.trim()) {
    blockers.push("prototype objective");
  }

  return blockers;
}

export function prototypeLandingStateLabel(value: PrototypeLandingState) {
  switch (value) {
    case "blocked":
      return "Blocked";
    case "captured":
      return "Captured";
    case "drafting":
      return "Drafting";
    case "landed":
      return "Landed";
  }
}

export function prototypeSourceHomeLabel(value: PrototypeSourceHome) {
  switch (value) {
    case "app-folder":
      return "App folder";
    case "console-domain-module":
      return "Console domain module";
    case "docs-only":
      return "Docs only";
    case "existing-source":
      return "Existing source";
    case "future-owner-repo":
      return "Future owner repo";
    case "new-prototype-folder":
      return "New prototype folder";
  }
}

export function prototypeLandingSupportRowsSummary(
  rows: PrototypeSupportRow[],
) {
  const blocked = rows.filter((row) => row.state === "blocked").length;
  const needed = rows.filter(
    (row) => row.state === "needed" || row.state === "unknown",
  ).length;

  if (blocked > 0) {
    return `${blocked} blocked / ${needed} open`;
  }

  return `${needed} open support item${needed === 1 ? "" : "s"}`;
}

export function prototypeLandingSupportSummary(record: PrototypeRecord) {
  return prototypeLandingSupportRowsSummary(record.landing.supportRows);
}

export function prototypeLandingSupportStateSummary(record: PrototypeRecord) {
  return record.landing.supportRows
    .map((row) => `${row.label}: ${prototypeSupportStateLabel(row.state)}`)
    .join(" / ");
}

export function prototypeLandingSetupTone(
  basePlatform: PrototypeBasePlatform,
): OperationTone {
  return basePlatform === "custom-unassigned" ? "warn" : "ok";
}

export function prototypePreviewNeedLabel(value: PrototypePreviewNeed) {
  switch (value) {
    case "future-dev-integration":
      return "Future dev-integration";
    case "local-backend-stub":
      return "Local API";
    case "local-dev-server":
      return "Local dev server";
    case "none":
      return "No preview";
    case "prototype-devint":
      return "Prototype dev-integration";
    case "static-review":
      return "Static review";
  }
}

function prototypeLandingHasBlockingSupport(rows: PrototypeSupportRow[]) {
  return rows.some((row) => row.state === "blocked");
}

function prototypeLandingResultTone(record: PrototypeRecord): OperationTone {
  if (
    record.landing.state === "blocked" ||
    prototypeLandingHasBlockingSupport(record.landing.supportRows) ||
    record.landing.blockedItems.length > 0
  ) {
    return "warn";
  }

  if (record.landing.securityTriggers.length > 0) {
    return "info";
  }

  return "ok";
}
