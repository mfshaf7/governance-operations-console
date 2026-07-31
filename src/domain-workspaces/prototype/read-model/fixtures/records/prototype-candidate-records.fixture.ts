import { prototypeSupportRowsFromInputs } from "../../../domain/support/prototype-support-profile-model.ts";
import type { PrototypeRecord } from "../../../domain/prototype-types.ts";

export const prototypeCandidateRecords: PrototypeRecord[] = [
  {
    baseline: {
      acceptedSummary: "",
      baselineStatement: "",
      baselineTitle: "",
      evidenceRefs: ["evidence-preview", "evidence-typecheck"],
      evidenceDisposition: "",
      excludedSummary: "",
      issueDisposition: "",
      lastPacketReceiptRef: null,
      missingItems: [
        "baseline promotion receipt",
        "final operator baseline decision",
      ],
      openIssueRefs: ["issue-baseline-decision", "issue-graduation-owner"],
      state: "needs-evidence",
    },
    candidate: {
      audience: {
        kind: "internal-user",
        label: "Workspace operator",
      },
      decision: "promote-candidate",
      lastReceiptRef:
        "local-receipts/prototype-governance-console-candidate.json",
      objective:
        "Candidate console prototype being rebuilt around structured Operation Workbench domains.",
      proof: {
        criterion:
          "Local preview, architecture guard, and focused typecheck evidence.",
        method: "technical-validation",
      },
      scope: {
        excluded: [
          "Platform runtime",
          "Production release",
          "Source graduation",
        ],
        included: [
          "Governance Operations Console workflows",
          "Prototype-local semantic proof",
        ],
      },
      state: "candidate",
    },
    currentMove: {
      actionLabel: "Open Baseline Promotion",
      detail:
        "Design and workflow proof still need Baseline Promotion before Movement request preparation.",
      id: "baseline-promotion",
      label: "Prepare baseline promotion",
      tone: "warn",
    },
    dataMode: "real-readonly",
    evidence: [
      {
        detail:
          "Candidate Promotion retained the accepted objective, audience, proof, and scope.",
        id: "local-receipts/prototype-governance-console-candidate.json",
        label: "Candidate Promotion receipt",
        status: "prototype-local",
        tone: "ok",
      },
      {
        detail: "Local preview is available for operator review only.",
        id: "evidence-preview",
        label: "Preview",
        status: "local proof available",
        tone: "ok",
      },
      {
        detail: "Static TypeScript proof for the console source.",
        id: "evidence-typecheck",
        label: "Typecheck",
        status: "expected proof path",
        tone: "info",
      },
    ],
    id: "prototype-governance-console",
    ingress: "proposal-routed",
    landing: {
      basePlatform: "nextjs-app",
      blockedItems: [],
      firstRequiredMove: "baseline-promotion",
      lastLandingReceiptRef:
        "local-receipts/prototype-landing-governance-console.json",
      previewNeed: "local-dev-server",
      requiredEvidence: [
        "operation workbench contract",
        "domain contracts",
        "architecture diagrams",
        "local preview proof",
      ],
      setupItems: [
        "docs/prototypes/governance-operations-console",
        "apps/governance-operations-console/src/domain-workspaces",
        "apps/governance-operations-console/scripts",
      ],
      securityTriggers: ["real-readonly registry projection"],
      sourceHome: "console-domain-module",
      state: "landed",
      supportProfile: "local-runtime",
      supportRows: prototypeSupportRowsFromInputs({
        dataMode: "real-readonly",
        mutationBoundary: "prototype-local",
        previewNeed: "local-dev-server",
        sourceContext:
          "Proposal-routed console prototype with local preview and real read-only registry projection.",
        sourceHome: "console-domain-module",
        supportProfile: "local-runtime",
        visibilityTier: "private-internal",
      }),
      validationPlan: [
        "architecture guard",
        "prototype studio registry validator",
        "focused typecheck",
      ],
    },
    lastMovementReceiptRef: null,
    lifecycle: "candidate",
    linkedRecords: [
      {
        label: "Governance Operations Console delivery initiative",
        level: "epic",
        ref: "openproject://work_packages/417",
        role: "delivery-initiative",
        system: "openproject",
        tone: "warn",
      },
      {
        label: "Workspace Prototype Studio architecture anchor",
        level: "epic",
        ref: "openproject://work_packages/681",
        role: "studio-anchor",
        system: "openproject",
        tone: "ok",
      },
      {
        label: "Governance Operations Console prototype candidate record",
        level: "user-story",
        parentRef: "openproject://work_packages/693",
        ref: "openproject://work_packages/694",
        role: "candidate-record",
        system: "openproject",
        tone: "ok",
      },
    ],
    movementRequest: {
      gateSnapshot: [
        {
          authority: "Workspace Prototype Studio",
          gateId: "source-authority",
          gateKind: "source authority",
          owner: "Prototype Studio",
          status: "ready",
          summary: "Prototype registry owns the current candidate record.",
          tone: "ok",
        },
        {
          authority: "Prototype baseline evidence",
          gateId: "prototype-baseline-evidence",
          gateKind: "prototype baseline evidence",
          owner: "Workspace Governance",
          requiredFix:
            "Record Baseline Promotion with the required local evidence.",
          status: "missing",
          summary:
            "Baseline Promotion is not ready for Movement request preparation.",
          tone: "warn",
        },
        {
          authority: "Repository control",
          gateId: "repository-source-custody",
          gateKind: "repository/source custody",
          owner: "Repository operation",
          status: "ready",
          summary: "Current source path is inside Workspace Prototype Studio.",
          tone: "ok",
        },
      ],
      lastMovementReceiptRef: null,
      movementType: "baseline",
      requestReason:
        "Request baseline movement only after Baseline Promotion is complete.",
      state: "not-prepared",
      targetHome: "Movement Control",
      targetLane: "baseline movement",
      targetOwner: "Movement reviewer",
    },
    mutationBoundary: "prototype-local",
    name: "Workspace Governance Operations Console",
    openIssues: [
      {
        id: "issue-baseline-decision",
        owner: "Workspace Governance",
        requiredFix:
          "Complete Prototype Control and review the Baseline Promotion decision.",
        status: "open",
        title: "Baseline decision not recorded",
        tone: "warn",
      },
      {
        id: "issue-graduation-owner",
        owner: "Workspace Governance",
        requiredFix:
          "Decide whether the durable home is Delivery ART, existing repo, or new repo.",
        status: "review",
        title: "Graduation owner not selected",
        tone: "info",
      },
    ],
    origin: "Proposal-routed prototype candidate",
    owner: "Workspace Governance",
    preview: {
      address: "http://127.0.0.1:3317",
      command: "npm run dev",
      healthcheckPath: "/",
      lastCheckLogRef: "local-logs/preview-start-012.log",
      lastCheckedAt: "2026-06-24 11:18 local",
      lastProofRef: "local-receipts/preview-start-012.json",
      launchAdapter: "node-npm",
      port: "3317",
      profileRef: "governance-console-local",
      profileSource: "prototypes.yaml/governance-operations-console.preview",
      profileState: "profile-configured",
      proofState: "proof-ready",
      runtimeState: "running",
      workingDirectory: "apps/governance-operations-console",
    },
    projectionFreshness: "current local fixture",
    projectionVersion: "prototype-v2",
    receipts: [
      {
        authority: "prototype-local",
        commandId: "record-candidate-promotion",
        commandName: "prototype.record-candidate-promotion",
        id: "local-receipts/prototype-governance-console-candidate.json",
        label: "Record Candidate Promotion",
        recordedAt: "2026-06-24 11:20 local",
        resultState: "recorded",
        schemaVersion: 1,
        summary:
          "Candidate Promotion recorded the accepted objective, audience, proof, and scope.",
        tone: "ok",
      },
    ],
    sourcePath: "apps/governance-operations-console",
    sourceRef: "prototypes.yaml/governance-operations-console",
    summary:
      "Candidate console prototype being rebuilt around structured Operation Workbench domains.",
    tone: "warn",
    visibilityTier: "private-internal",
  },
];
