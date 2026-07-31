import type { PrototypeRecord } from "../../domain/prototype-types.ts";
import {
  prototypeBasePlatformLaunchAdapter,
  prototypeBasePlatformPreviewCommand,
  prototypeSetupItemsForProfile,
} from "../../domain/support/prototype-setup-profile-model.ts";
import { prototypeSupportRowsFromInputs } from "../../domain/support/prototype-support-profile-model.ts";
import {
  prototypeLandingRequiredEvidence,
  prototypeLandingSecurityTriggers,
  prototypeLandingValidationPlan,
  type PrototypeLandingDraft,
} from "../workflows/landing/prototype-landing-model.ts";
import type { PrototypeRequestDraft } from "./prototype-request-types.ts";

export function prototypeRecordFromRequestDraft(
  draft: PrototypeRequestDraft,
  index: number,
  stableRecordId?: string,
): PrototypeRecord {
  const name = draft.name.trim();
  const owner = draft.owner.trim();
  const sourceContext = draft.sourceContext.trim();
  const prototypeObjective = draft.prototypeObjective.trim();
  const slug = prototypeRequestSlug(name || `prototype-${index + 1}`);
  const recordId =
    stableRecordId ??
    `prototype-local-${slug}-${String(index + 1).padStart(2, "0")}`;
  const sourceRef = `prototype-local://${slug}`;
  const supportRows = prototypeSupportRowsFromInputs({
    dataMode: draft.dataMode,
    mutationBoundary: draft.mutationBoundary,
    previewNeed: draft.previewNeed,
    sourceContext: draft.sourceContext,
    sourceHome: draft.sourceHome,
    supportProfile: draft.supportProfile,
    visibilityTier: draft.visibilityTier,
  });
  const landingDraft = prototypeLandingDraftFromRequest(draft, supportRows);

  return {
    baseline: {
      acceptedSummary: "",
      baselineStatement: "",
      baselineTitle: "",
      evidenceRefs: sourceContext ? ["prototype-source-context"] : [],
      evidenceDisposition: "",
      excludedSummary: "",
      issueDisposition: "",
      lastPacketReceiptRef: null,
      missingItems: [
        "landing receipt",
        "source boundary",
        "preview profile",
        "baseline evidence",
        "movement target",
      ],
      openIssueRefs: ["issue-shape-request"],
      state: "not-started",
    },
    candidate: {
      audience: {
        kind: "unassigned",
        label: "",
      },
      decision: null,
      lastReceiptRef: null,
      objective: prototypeObjective,
      proof: {
        criterion: "",
        method: "unassigned",
      },
      scope: {
        excluded: [],
        included: [],
      },
      state: "not-started",
    },
    currentMove: {
      actionLabel: "Open Landing",
      detail:
        "Direct prototype requests must land before candidate promotion, preview, baseline, or movement preparation.",
      id: "landing",
      label: "Land prototype request",
      tone: "warn",
    },
    dataMode: draft.dataMode,
    evidence: sourceContext
      ? [
          {
            detail: sourceContext,
            id: "prototype-source-context",
            label: "Source context",
            status: "captured locally",
            tone: "info",
          },
        ]
      : [],
    id: recordId,
    ingress: "local-entry",
    landing: {
      basePlatform: draft.basePlatform,
      blockedItems: prototypeLandingBlockedItems(draft),
      firstRequiredMove: "candidate-promotion",
      lastLandingReceiptRef: null,
      previewNeed: draft.previewNeed,
      requiredEvidence: prototypeLandingRequiredEvidence(landingDraft, {
        sourceContextAvailable: Boolean(sourceContext),
      }),
      setupItems: prototypeLandingSetupItems(draft, supportRows),
      securityTriggers: prototypeLandingSecurityTriggers(landingDraft),
      sourceHome: draft.sourceHome,
      state: "captured",
      supportProfile: draft.supportProfile,
      supportRows,
      validationPlan: prototypeLandingValidationPlan(landingDraft),
    },
    lastMovementReceiptRef: null,
    lifecycle: "exploring",
    linkedRecords: [],
    movementRequest: {
      gateSnapshot: [
        {
          authority: "Workspace Prototype Studio",
          gateId: "source-authority",
          gateKind: "source authority",
          owner: "Prototype Studio",
          status: "ready",
          summary: "Direct local entry is allowed for private incubation.",
          tone: "ok",
        },
        {
          authority: "Prototype baseline evidence",
          gateId: "prototype-baseline-evidence",
          gateKind: "prototype baseline evidence",
          owner: "Workspace Governance",
          requiredFix:
            "Complete Candidate Promotion and record Baseline Promotion evidence.",
          status: "missing",
          summary: "Baseline Promotion has not started.",
          tone: "warn",
        },
      ],
      lastMovementReceiptRef: null,
      movementType: "baseline",
      requestReason:
        "No movement request until the direct prototype request has completed Candidate Promotion.",
      state: "not-prepared",
      targetHome: "Movement Control",
      targetLane: "baseline movement",
      targetOwner: "Movement reviewer",
    },
    mutationBoundary: draft.mutationBoundary,
    name,
    openIssues: [
      {
        id: "issue-shape-request",
        owner,
        requiredFix:
          "Complete landing classification and setup plan before Candidate Promotion.",
        status: "open",
        title: "Prototype request needs landing",
        tone: "warn",
      },
    ],
    origin: "Direct Prototype request",
    owner,
    preview: {
      address: "not launched",
      command: prototypeBasePlatformPreviewCommand(draft.basePlatform),
      healthcheckPath: "/",
      lastCheckLogRef: null,
      lastCheckedAt: null,
      lastProofRef: null,
      launchAdapter: prototypeBasePlatformLaunchAdapter(
        draft.basePlatform,
        draft.previewNeed,
      ),
      port: "not reserved",
      profileRef: `${slug}-preview-pending`,
      profileSource: "prototype-local request",
      profileState: "no-profile",
      proofState: "not-started",
      runtimeState: "stopped",
      workingDirectory: prototypePreviewWorkingDirectory(draft, slug),
    },
    projectionFreshness: "prototype-local request",
    projectionVersion: "prototype-local-draft",
    receipts: [],
    sourcePath: "prototype request",
    sourceRef,
    summary: prototypeObjective,
    tone: "info",
    visibilityTier: draft.visibilityTier,
  };
}

function prototypeLandingDraftFromRequest(
  draft: PrototypeRequestDraft,
  supportRows: ReturnType<typeof prototypeSupportRowsFromInputs>,
): PrototypeLandingDraft {
  return {
    basePlatform: draft.basePlatform,
    dataMode: draft.dataMode,
    mutationBoundary: draft.mutationBoundary,
    name: draft.name,
    owner: draft.owner,
    previewNeed: draft.previewNeed,
    sourceHome: draft.sourceHome,
    summary: draft.prototypeObjective,
    supportProfile: draft.supportProfile,
    supportRows,
    visibilityTier: draft.visibilityTier,
  };
}

function prototypeLandingSetupItems(
  draft: PrototypeRequestDraft,
  supportRows: ReturnType<typeof prototypeSupportRowsFromInputs>,
) {
  return prototypeSetupItemsForProfile({
    basePlatform: draft.basePlatform,
    sourceHome: draft.sourceHome,
    supportRows,
  });
}

function prototypeLandingBlockedItems(draft: PrototypeRequestDraft) {
  const blockers: string[] = [];

  if (
    draft.visibilityTier === "client-review" ||
    draft.visibilityTier === "public-demo"
  ) {
    blockers.push("client-safe review path");
  }

  if (draft.dataMode === "real-readonly") {
    blockers.push("real read-only data evidence");
  }

  if (draft.dataMode === "real-mutable") {
    blockers.push("real mutable workflow is not allowed before graduation");
  }

  if (draft.mutationBoundary === "real-system") {
    blockers.push(
      "real-system mutation requires graduation or governed delivery",
    );
  }

  return blockers;
}

function prototypeRequestSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "prototype-request";
}

function prototypePreviewWorkingDirectory(
  draft: PrototypeRequestDraft,
  slug: string,
) {
  switch (draft.sourceHome) {
    case "app-folder":
      return `apps/${slug}`;
    case "console-domain-module":
      return `apps/governance-operations-console/src/domain-workspaces/${slug}`;
    case "docs-only":
      return `docs/prototypes/${slug}`;
    case "existing-source":
    case "future-owner-repo":
      return "not assigned";
    case "new-prototype-folder":
      return `prototypes/${slug}`;
  }
}
