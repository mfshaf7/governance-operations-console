import { prototypeSupportRowsFromInputs } from "../../../domain/support/prototype-support-profile-model.ts";
import type { PrototypeRecord } from "../../../domain/prototype-types.ts";

export const prototypeBaselineApprovedRecords: PrototypeRecord[] = [
  {
    baseline: {
      acceptedSummary:
        "Movement Request fixture accepted for local workflow inspection.",
      baselineStatement:
        "The synthetic Movement Request fixture is accepted as a Prototype Studio baseline.",
      baselineTitle: "Movement Request Fixture baseline",
      evidenceRefs: [
        "movement-fixture-baseline-packet",
        "movement-fixture-preview-proof",
        "movement-fixture-design-review",
      ],
      evidenceDisposition:
        "Synthetic baseline, preview, and design evidence are retained for this fixture.",
      excludedSummary:
        "Movement approval and durable runtime authority remain excluded.",
      issueDisposition: "No open issue is retained for the fixture.",
      lastPacketReceiptRef:
        "local-receipts/prototype-movement-fixture-baseline.json",
      missingItems: [],
      openIssueRefs: [],
      state: "ready-for-movement",
    },
    candidate: {
      audience: {
        kind: "internal-user",
        label: "Prototype operator",
      },
      decision: "promote-candidate",
      lastReceiptRef: null,
      objective:
        "Exercise a truthful Movement Request from a baseline-approved prototype.",
      proof: {
        criterion: "Baseline packet, preview proof, and design review.",
        method: "technical-validation",
      },
      scope: {
        excluded: ["Movement approval", "Durable runtime authority"],
        included: ["Synthetic Prototype Movement Request workflow inspection"],
      },
      state: "candidate",
    },
    currentMove: {
      actionLabel: "Open Movement Request",
      detail:
        "Baseline Promotion is locally recorded. Translate it into Movement Control request fields.",
      id: "movement-request",
      label: "Prepare movement request",
      tone: "warn",
    },
    dataMode: "synthetic",
    evidence: [
      {
        detail:
          "Prototype-local Baseline Promotion receipt exists for Movement Request inspection.",
        id: "movement-fixture-baseline-packet",
        label: "Baseline packet",
        status: "ready for movement",
        tone: "ok",
      },
      {
        detail:
          "Static preview proof is recorded for this synthetic movement fixture.",
        id: "movement-fixture-preview-proof",
        label: "Preview proof",
        status: "proof ready",
        tone: "ok",
      },
      {
        detail:
          "Design and workflow review are complete enough to prepare a Movement Control request.",
        id: "movement-fixture-design-review",
        label: "Design review",
        status: "accepted locally",
        tone: "ok",
      },
    ],
    id: "prototype-movement-request-fixture",
    ingress: "local-entry",
    landing: {
      basePlatform: "vite-react",
      blockedItems: [],
      firstRequiredMove: "movement-request",
      lastLandingReceiptRef:
        "local-receipts/prototype-movement-fixture-landing.json",
      previewNeed: "static-review",
      requiredEvidence: [
        "baseline packet",
        "preview proof",
        "design review",
        "movement target",
      ],
      setupItems: [
        "docs/prototypes/movement-request-fixture",
        "synthetic baseline packet",
        "static review notes",
      ],
      securityTriggers: [],
      sourceHome: "new-prototype-folder",
      state: "landed",
      supportProfile: "interactive-prototype",
      supportRows: prototypeSupportRowsFromInputs({
        dataMode: "synthetic",
        mutationBoundary: "prototype-local",
        previewNeed: "static-review",
        sourceContext:
          "Baseline-approved local fixture for inspecting Movement Request without creating a fake movement receipt.",
        sourceHome: "new-prototype-folder",
        supportProfile: "interactive-prototype",
        visibilityTier: "operator-review",
      }),
      validationPlan: [
        "movement request smoke",
        "manual wizard inspection",
        "synthetic fixture review",
      ],
    },
    lastMovementReceiptRef: null,
    lifecycle: "baseline-approved",
    linkedRecords: [],
    movementRequest: {
      gateSnapshot: [
        {
          authority: "Workspace Prototype Studio",
          gateId: "movement-fixture-source-authority",
          gateKind: "source authority",
          owner: "Prototype Studio",
          status: "ready",
          summary:
            "The baseline-approved fixture is owned by Prototype Studio.",
          tone: "ok",
        },
        {
          authority: "Prototype baseline evidence",
          gateId: "movement-fixture-baseline-evidence",
          gateKind: "prototype baseline evidence",
          owner: "Prototype Studio",
          status: "ready",
          summary: "Baseline Promotion evidence is ready for Movement Control.",
          tone: "ok",
        },
        {
          authority: "Repository control",
          gateId: "movement-fixture-repository-custody",
          gateKind: "repository/source custody",
          owner: "Repository operation",
          status: "not-required",
          summary:
            "No repository custody repair is needed before preparing this request.",
          tone: "muted",
        },
      ],
      lastMovementReceiptRef: null,
      movementType: "baseline",
      requestReason:
        "Move the approved baseline into Movement Control for custody and graduation routing.",
      state: "draft-ready",
      targetHome: "Movement Control",
      targetLane: "baseline movement",
      targetOwner: "Movement reviewer",
    },
    mutationBoundary: "prototype-local",
    name: "Movement Request Fixture",
    openIssues: [],
    origin: "Baseline-approved local prototype fixture",
    owner: "Prototype Studio",
    preview: {
      address: "static review",
      command: "manual static review",
      healthcheckPath: "/",
      lastCheckLogRef: "local-logs/prototype-movement-fixture-preview.log",
      lastCheckedAt: "2026-06-27 12:15 local",
      lastProofRef: "local-receipts/prototype-movement-fixture-preview.json",
      launchAdapter: "static-server",
      port: "not required",
      profileRef: "movement-fixture-static-review",
      profileSource: "prototype-local fixture",
      profileState: "profile-configured",
      proofState: "proof-ready",
      runtimeState: "running",
      workingDirectory: "docs/prototypes/movement-request-fixture",
    },
    projectionFreshness: "current local fixture",
    projectionVersion: "prototype-movement-fixture-v1",
    receipts: [
      {
        authority: "source-projected",
        commandId: "record-baseline-promotion",
        commandName: "prototype.record-baseline-promotion",
        id: "local-receipts/prototype-movement-fixture-baseline.json",
        label: "Record Baseline Promotion",
        recordedAt: "2026-06-27 12:15",
        resultState: "recorded",
        schemaVersion: 1,
        summary:
          "Prototype-local baseline fixture recorded for Movement Request inspection.",
        tone: "ok",
      },
    ],
    sourcePath: "docs/prototypes/movement-request-fixture",
    sourceRef: "prototype-local://movement-request-fixture",
    summary:
      "Baseline-approved prototype fixture ready to inspect Movement Request.",
    tone: "warn",
    visibilityTier: "operator-review",
  },
  {
    baseline: {
      acceptedSummary:
        "Returned Movement fixture accepted for correction-path inspection.",
      baselineStatement:
        "The returned Movement fixture retains its accepted local baseline while its request is corrected.",
      baselineTitle: "Returned Movement Fixture baseline",
      evidenceRefs: [
        "returned-fixture-baseline-packet",
        "returned-fixture-return-note",
        "returned-fixture-preview-proof",
      ],
      evidenceDisposition:
        "Baseline and preview evidence remain valid while the Movement request is corrected.",
      excludedSummary: "Movement approval remains outside Prototype authority.",
      issueDisposition:
        "The returned rationale is retained as correction evidence.",
      lastPacketReceiptRef:
        "local-receipts/prototype-returned-movement-baseline.json",
      missingItems: [],
      openIssueRefs: [],
      state: "ready-for-movement",
    },
    candidate: {
      audience: {
        kind: "internal-user",
        label: "Prototype operator",
      },
      decision: "promote-candidate",
      lastReceiptRef: null,
      objective: "Exercise correction of a returned Movement request.",
      proof: {
        criterion:
          "Baseline packet, preview proof, and corrected Movement rationale.",
        method: "technical-validation",
      },
      scope: {
        excluded: ["Movement outcome approval"],
        included: [
          "Synthetic returned Movement correction workflow inspection",
        ],
      },
      state: "candidate",
    },
    currentMove: {
      actionLabel: "Open Movement Request",
      detail:
        "Movement Control returned the previous request. Prepare a corrected request with the retained return reason.",
      id: "movement-request",
      label: "Correct returned movement",
      tone: "warn",
    },
    dataMode: "synthetic",
    evidence: [
      {
        detail:
          "Prototype-local Baseline Promotion receipt is still valid for correction.",
        id: "returned-fixture-baseline-packet",
        label: "Baseline packet",
        status: "ready for correction",
        tone: "ok",
      },
      {
        detail:
          "Movement Control returned the request because its reason did not explain the durable-delivery need or expected governed outcome.",
        id: "returned-fixture-return-note",
        label: "Return note",
        status: "needs correction",
        tone: "warn",
      },
      {
        detail:
          "Static preview proof remains available while the movement packet is corrected.",
        id: "returned-fixture-preview-proof",
        label: "Preview proof",
        status: "proof ready",
        tone: "ok",
      },
    ],
    id: "prototype-returned-movement-fixture",
    ingress: "local-entry",
    landing: {
      basePlatform: "vite-react",
      blockedItems: [],
      firstRequiredMove: "movement-request",
      lastLandingReceiptRef:
        "local-receipts/prototype-returned-movement-landing.json",
      previewNeed: "static-review",
      requiredEvidence: [
        "baseline packet",
        "return reason",
        "corrected request rationale",
        "expected governed outcome",
      ],
      setupItems: [
        "docs/prototypes/returned-movement-fixture",
        "synthetic returned Movement receipt",
        "corrected Movement request draft",
      ],
      securityTriggers: [],
      sourceHome: "new-prototype-folder",
      state: "landed",
      supportProfile: "interactive-prototype",
      supportRows: prototypeSupportRowsFromInputs({
        dataMode: "synthetic",
        mutationBoundary: "prototype-local",
        previewNeed: "static-review",
        sourceContext:
          "Returned Movement scenario fixture with a previous Movement receipt and a required correction path.",
        sourceHome: "new-prototype-folder",
        supportProfile: "interactive-prototype",
        visibilityTier: "operator-review",
      }),
      validationPlan: [
        "returned movement correction smoke",
        "manual wizard inspection",
        "synthetic fixture review",
      ],
    },
    lastMovementReceiptRef:
      "movement-receipts/prototype-returned-movement-001.json",
    lifecycle: "baseline-approved",
    linkedRecords: [],
    movementRequest: {
      gateSnapshot: [
        {
          authority: "Workspace Prototype Studio",
          gateId: "returned-fixture-source-authority",
          gateKind: "source authority",
          owner: "Prototype Studio",
          status: "ready",
          summary:
            "Prototype Studio still owns the source while the request is corrected.",
          tone: "ok",
        },
        {
          authority: "Movement Control",
          gateId: "returned-fixture-return-reason",
          gateKind: "returned request reason",
          owner: "Movement reviewer",
          requiredFix:
            "Explain which durable-delivery need justifies movement and what governed outcome is expected.",
          status: "review",
          summary:
            "Previous Movement result is retained as return evidence, not as terminal completion.",
          tone: "warn",
        },
        {
          authority: "Prototype baseline evidence",
          gateId: "returned-fixture-baseline-evidence",
          gateKind: "prototype baseline evidence",
          owner: "Prototype Studio",
          status: "ready",
          summary:
            "Baseline evidence remains ready for a corrected Movement request.",
          tone: "ok",
        },
      ],
      lastMovementReceiptRef:
        "movement-receipts/prototype-returned-movement-001.json",
      movementType: "baseline",
      requestReason:
        "Move this baseline-approved prototype into governed delivery.",
      state: "returned",
      targetHome: "Movement Control",
      targetLane: "movement correction",
      targetOwner: "Movement reviewer",
    },
    mutationBoundary: "prototype-local",
    name: "Returned Movement Fixture",
    openIssues: [],
    origin: "Returned Movement Control scenario fixture",
    owner: "Prototype Studio",
    preview: {
      address: "static review",
      command: "manual static review",
      healthcheckPath: "/",
      lastCheckLogRef: "local-logs/prototype-returned-movement-preview.log",
      lastCheckedAt: "2026-06-27 12:35 local",
      lastProofRef: "local-receipts/prototype-returned-movement-preview.json",
      launchAdapter: "static-server",
      port: "not required",
      profileRef: "returned-movement-static-review",
      profileSource: "prototype-local fixture",
      profileState: "profile-configured",
      proofState: "proof-ready",
      runtimeState: "running",
      workingDirectory: "docs/prototypes/returned-movement-fixture",
    },
    projectionFreshness: "returned movement fixture",
    projectionVersion: "prototype-returned-movement-v1",
    receipts: [
      {
        authority: "source-projected",
        commandId: "record-baseline-promotion",
        commandName: "prototype.record-baseline-promotion",
        id: "local-receipts/prototype-returned-movement-baseline.json",
        label: "Record Baseline Promotion",
        recordedAt: "2026-06-27 12:20",
        resultState: "recorded",
        schemaVersion: 1,
        summary:
          "Prototype-local baseline fixture recorded before Movement request return.",
        tone: "ok",
      },
      {
        authority: "source-projected",
        commandId: "prepare-movement-request",
        commandName: "prototype.prepare-movement-request",
        id: "movement-receipts/prototype-returned-movement-001.json",
        label: "Prepare Movement Request",
        recordedAt: "2026-06-27 12:30",
        resultState: "review-only",
        schemaVersion: 1,
        summary:
          "Movement Control returned the previous request for corrected rationale.",
        tone: "warn",
      },
    ],
    sourcePath: "docs/prototypes/returned-movement-fixture",
    sourceRef: "prototype-local://returned-movement-fixture",
    summary:
      "Baseline-approved prototype fixture with a returned Movement request ready for correction.",
    tone: "warn",
    visibilityTier: "operator-review",
  },
];
