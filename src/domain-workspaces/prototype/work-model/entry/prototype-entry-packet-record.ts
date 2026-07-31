import type {
  PrototypeRecord,
  PrototypeSupportAreaId,
} from "../../domain/prototype-types.ts";
import {
  prototypeBasePlatformLaunchAdapter,
  prototypeBasePlatformPreviewCommand,
  prototypeSetupItemsForProfile,
} from "../../domain/support/prototype-setup-profile-model.ts";
import {
  prototypeSupportRowsFromInputs,
  prototypeSupportRowWithState,
} from "../../domain/support/prototype-support-profile-model.ts";
import type {
  PrototypeEntryPacketMissingField,
  PrototypeEntryPacketProjection,
} from "./prototype-entry-packet-types.ts";
import { assertOperationPacketCustody } from "../../../operation-runtime/operation-packet-invariants.ts";

export function prototypeRecordFromEntryPacket(
  projection: PrototypeEntryPacketProjection,
  index: number,
): PrototypeRecord {
  const { custody, packet: envelope } = projection;
  assertOperationPacketCustody({ custody, packet: envelope });

  if (envelope.targetDomain !== "prototype") {
    throw new Error(
      `Prototype entry cannot project packet ${envelope.packetId} for ${envelope.targetDomain}.`,
    );
  }

  const packet = envelope.payload;
  const receivedAt = custody.recordedAt;
  const suggestedPrototypeName = packet.suggestedPrototypeName?.trim();
  const displayName =
    suggestedPrototypeName || `Prototype entry from ${packet.entryId}`;
  const slug = prototypeEntrySlug(suggestedPrototypeName || packet.entryId);
  const recordId = `prototype-entry-${slug}`;
  const supportRows = prototypeEntrySupportRows(packet);
  const setupItems = prototypeSetupItemsForProfile({
    basePlatform: packet.basePlatform,
    sourceHome: packet.sourceHome,
    supportRows,
  });
  const sourceCustodyGate = prototypeEntrySourceCustodyGate(packet);
  const missingItems = prototypeEntryMissingItemLabels(packet.missingFields);
  const blockedItems =
    missingItems.length > 0
      ? [`Complete Landing fields: ${missingItems.join(", ")}`]
      : [];

  return {
    baseline: {
      acceptedSummary: "",
      baselineStatement: "",
      baselineTitle: "",
      evidenceRefs: packet.evidence.map(
        (_, evidenceIndex) => `${recordId}-entry-evidence-${evidenceIndex + 1}`,
      ),
      evidenceDisposition: "",
      excludedSummary: "",
      issueDisposition: "",
      lastPacketReceiptRef: null,
      missingItems: [
        "landing receipt",
        "candidate promotion receipt",
        "preview proof",
        "baseline evidence",
      ],
      openIssueRefs: [`${recordId}-landing-issue`],
      state: "not-started",
    },
    candidate: {
      audience: {
        kind: "unassigned",
        label: "",
      },
      decision: null,
      lastReceiptRef: null,
      objective: packet.summary,
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
        "Proposal handoff created a Prototype Entry Packet. Landing must normalize the missing support and setup fields before candidate work starts.",
      id: "landing",
      label: "Land proposal-routed entry",
      tone: "warn",
    },
    dataMode: packet.dataMode,
    evidence: packet.evidence.map((evidence, evidenceIndex) => ({
      detail: evidence.detail,
      id: `${recordId}-entry-evidence-${evidenceIndex + 1}`,
      label: evidence.label,
      status: "entry packet",
      tone: evidence.tone,
    })),
    id: recordId,
    ingress: packet.ingress,
    landing: {
      basePlatform: packet.basePlatform,
      blockedItems,
      firstRequiredMove: "candidate-promotion",
      lastLandingReceiptRef: null,
      previewNeed: packet.previewNeed,
      requiredEvidence: [
        "proposal route packet",
        "handoff notes",
        "landing support profile",
        "source home decision",
        "preview path decision",
      ],
      setupItems,
      securityTriggers: prototypeEntrySecurityTriggers(packet),
      sourceHome: packet.sourceHome,
      state: "captured",
      supportProfile: packet.supportProfile,
      supportRows,
      validationPlan: prototypeEntryValidationPlan(packet),
    },
    lastMovementReceiptRef: null,
    lifecycle: "exploring",
    linkedRecords: [
      {
        label: packet.sourceTitle,
        level: "proposal",
        ref: packet.sourceRef,
        role: "prototype-entry-source",
        system: "workspace-proposals",
        tone: "info",
      },
    ],
    movementRequest: {
      gateSnapshot: [
        {
          authority: "Workspace Proposals",
          gateId: "proposal-handoff",
          gateKind: "proposal handoff",
          owner: "Workspace Proposals",
          status: "ready",
          summary: "Proposal recorded a local Prototype handoff packet.",
          tone: "ok",
        },
        {
          ...sourceCustodyGate,
        },
        {
          authority: "Prototype baseline evidence",
          gateId: "prototype-baseline-evidence",
          gateKind: "prototype baseline evidence",
          owner: "Workspace Governance",
          requiredFix:
            "Complete Landing, Candidate Promotion, preview proof, and Baseline Promotion.",
          status: "missing",
          summary: "Prototype Baseline Promotion has not been recorded.",
          tone: "warn",
        },
      ],
      lastMovementReceiptRef: null,
      movementType: "baseline",
      requestReason:
        "Movement is unavailable until Landing, Candidate Promotion, Preview Runtime, and Baseline Promotion complete.",
      state: "not-prepared",
      targetHome: "Movement Control",
      targetLane: "baseline movement",
      targetOwner: "Movement reviewer",
    },
    mutationBoundary: packet.mutationBoundary,
    name: displayName,
    openIssues: [
      {
        id: `${recordId}-landing-issue`,
        owner: "Prototype Studio",
        requiredFix:
          missingItems.length > 0
            ? `Complete Landing fields: ${missingItems.join(", ")}.`
            : "Run Landing before Candidate Promotion starts.",
        status: "open",
        title:
          missingItems.length > 0
            ? "Proposal handoff needs Landing completion"
            : "Proposal-routed entry needs Landing receipt",
        tone: "warn",
      },
    ],
    origin: "Proposal handoff",
    owner: packet.owner,
    preview: {
      address: "not launched",
      command: prototypeBasePlatformPreviewCommand(packet.basePlatform),
      healthcheckPath: "/",
      lastCheckLogRef: null,
      lastCheckedAt: null,
      lastProofRef: null,
      launchAdapter: prototypeBasePlatformLaunchAdapter(
        packet.basePlatform,
        packet.previewNeed,
      ),
      port: "not reserved",
      profileRef: `${slug}-preview-pending`,
      profileSource: "proposal entry packet",
      profileState: "no-profile",
      proofState: "not-started",
      runtimeState: "stopped",
      workingDirectory: prototypeEntryWorkingDirectory(packet, index),
    },
    projectionFreshness: `proposal handoff packet / ${custody.state} / ${receivedAt}`,
    projectionVersion: `prototype-entry:${envelope.packetId}:${custody.state}:${envelope.sourceVersion}`,
    receipts: [
      {
        authority: "source-projected",
        commandId: "proposal-handoff",
        commandName: "proposal.handoff.apply",
        id: `local-receipts/${recordId}-proposal-entry.json`,
        label: "Proposal Handoff",
        recordedAt: receivedAt,
        resultState: "recorded",
        schemaVersion: 1,
        summary: "Proposal handoff produced a Prototype Entry Packet.",
        tone: "info",
      },
    ],
    sourcePath: "proposal handoff",
    sourceRef: packet.sourceCustody.repo_ref ?? packet.sourceRef,
    summary: packet.summary,
    tone: "warn",
    visibilityTier: packet.visibilityTier,
  };
}

type ProjectedPrototypeEntryPacketPayload =
  PrototypeEntryPacketProjection["packet"]["payload"];

function prototypeEntrySourceCustodyGate(
  packet: ProjectedPrototypeEntryPacketPayload,
): PrototypeRecord["movementRequest"]["gateSnapshot"][number] {
  const gateState = packet.sourceCustody.repository_gate_state;
  const ready = gateState === "resolved";
  const notRequired = gateState === "not-required";

  return {
    authority:
      packet.sourceCustody.classification === "non-source-work"
        ? "Workspace Prototype Studio"
        : "Workspace Governance",
    gateId: "repository-source-custody",
    gateKind: "repository/source custody",
    owner: packet.sourceCustody.owner,
    requiredFix:
      ready || notRequired
        ? undefined
        : "Resolve repository or source custody before movement.",
    status: ready ? "ready" : notRequired ? "not-required" : "missing",
    summary: packet.sourceCustody.rationale,
    tone: ready || notRequired ? "ok" : "warn",
  };
}

function prototypeEntrySupportRows(
  packet: ProjectedPrototypeEntryPacketPayload,
) {
  const rows = prototypeSupportRowsFromInputs({
    dataMode: packet.dataMode,
    mutationBoundary: packet.mutationBoundary,
    previewNeed: packet.previewNeed,
    sourceContext: packet.sourceContext,
    sourceHome: packet.sourceHome,
    supportProfile: packet.supportProfile,
    visibilityTier: packet.visibilityTier,
  });
  const unknownAreas = prototypeEntryUnknownSupportAreas(packet.missingFields);

  return rows.map((row) =>
    unknownAreas.has(row.id)
      ? prototypeSupportRowWithState(
          {
            ...row,
            summary: "Needs Landing input",
            detail:
              "Proposal handoff did not carry enough detail for this support area.",
          },
          "unknown",
        )
      : row,
  );
}

function prototypeEntryUnknownSupportAreas(
  missingFields: readonly PrototypeEntryPacketMissingField[],
) {
  const areas = new Set<PrototypeSupportAreaId>();

  for (const field of missingFields) {
    switch (field) {
      case "base-platform":
        areas.add("tooling");
        break;
      case "data-mode":
        areas.add("data");
        break;
      case "mutation-boundary":
        areas.add("integration");
        break;
      case "preview-need":
        areas.add("runtime");
        break;
      case "prototype-name":
        areas.add("source");
        areas.add("evidence");
        break;
      case "source-home":
        areas.add("studio-home");
        break;
      case "support-profile":
        areas.add("interface");
        areas.add("evidence");
        break;
      case "visibility-tier":
        areas.add("visibility");
        break;
    }
  }

  return areas;
}

function prototypeEntryMissingItemLabels(
  missingFields: readonly PrototypeEntryPacketMissingField[],
) {
  return missingFields.map((field) => {
    switch (field) {
      case "base-platform":
        return "base platform";
      case "data-mode":
        return "data mode";
      case "mutation-boundary":
        return "mutation boundary";
      case "preview-need":
        return "preview need";
      case "prototype-name":
        return "prototype name";
      case "source-home":
        return "source home";
      case "support-profile":
        return "support profile";
      case "visibility-tier":
        return "visibility tier";
    }
  });
}

function prototypeEntrySecurityTriggers(
  packet: ProjectedPrototypeEntryPacketPayload,
) {
  const triggers: string[] = [];

  if (
    packet.visibilityTier === "client-review" ||
    packet.visibilityTier === "public-demo"
  ) {
    triggers.push("client or public visibility");
  }

  if (
    packet.dataMode === "real-readonly" ||
    packet.dataMode === "real-mutable"
  ) {
    triggers.push("real data");
  }

  if (
    packet.mutationBoundary === "external-sandbox" ||
    packet.mutationBoundary === "real-system"
  ) {
    triggers.push("external or real mutation");
  }

  return triggers;
}

function prototypeEntryValidationPlan(
  packet: ProjectedPrototypeEntryPacketPayload,
) {
  const plan = [
    "prototype registry validator",
    "landing support profile review",
  ];

  if (packet.previewNeed !== "none") {
    plan.push("focused preview check");
  }

  if (packet.missingFields.length > 0) {
    plan.push("missing landing field review");
  }

  return plan;
}

function prototypeEntryWorkingDirectory(
  packet: ProjectedPrototypeEntryPacketPayload,
  index: number,
) {
  const slug = prototypeEntrySlug(
    packet.suggestedPrototypeName || `proposal-entry-${index + 1}`,
  );

  switch (packet.sourceHome) {
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

function prototypeEntrySlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "proposal-entry";
}
