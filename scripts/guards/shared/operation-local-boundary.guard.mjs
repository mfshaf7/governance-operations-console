import {
  readAppFile,
  walkFiles,
  relativeAppPath,
} from "../guard-lib.mjs";

const operationRoots = [
  "src/domain-workspaces/operation-projections",
  "src/domain-workspaces/delivery",
  "src/domain-workspaces/proposal",
  "src/domain-workspaces/repository",
  "src/domain-workspaces/prototype",
  "src/domain-workspaces/portfolio",
  "src/domain-workspaces/orchestration",
  "src/domain-workspaces/model-operations",
];

const focusedForbiddenTerms = new Map([
  [
    "src/domain-workspaces/delivery/presentation/workspace/workspace-controller.tsx",
    [
      "consumedAt: new Date().toISOString()",
      "consumedBy: \"Workspace delivery operator via local preview\"",
      "setLocalConsumedIntakeRecords",
      "setLocalWorkDesignApplyRecords",
    ],
  ],
  [
    "src/domain-workspaces/delivery/presentation/workflows/work-design/session-controller/use-work-design-session-controller.ts",
    [
      "receiptId: `WDS-APPLY-",
      "appliedBy: \"Workspace delivery operator via local preview\"",
    ],
  ],
  [
    "src/domain-workspaces/proposal/presentation/surface/proposal-control-surface.tsx",
    [
      "createCapturedProposalScenario",
      "function proposalTimestamp()",
      "setCapturedProposals",
    ],
  ],
  [
    "src/domain-workspaces/prototype/presentation/surface/prototype-control-surface.tsx",
    [
      "prototypeRecordFromRequestDraft",
      "new Date().toISOString().slice(0, 16)",
      "setLocalRecords",
    ],
  ],
  [
    "src/domain-workspaces/prototype/presentation/surface/use-prototype-control-state.ts",
    [
      "setLocalReceipts",
      "useState<Record<string, PrototypeLocalReceipt[]>",
    ],
  ],
  [
    "src/domain-workspaces/proposal/local-runtime/proposal-runtime.ts",
    ["proposal-capture-draft-v1"],
  ],
  [
    "src/domain-workspaces/repository/local-runtime/repository-runtime.ts",
    ["prototype-local-repository-projection"],
  ],
  [
    "src/domain-workspaces/delivery/local-runtime/commands/catalog-mutation-runtime.ts",
    ["prototype-local-catalog-values"],
  ],
  [
    "src/domain-workspaces/delivery/work-model/catalog/catalog-mutation-model.ts",
    ["Date.now()"],
  ],
]);

const focusedRequiredTerms = new Map([
  [
    "src/domain-workspaces/operation-runtime/operation-packet-invariants.ts",
    [
      "createLocalOperationCrossDomainPacket",
      "createLocalOperationPacketCustody",
      "assertOperationPacketCustody",
    ],
  ],
  [
    "src/domain-workspaces/operation-runtime/operation-runtime-types.ts",
    ["requiredCapability: OperationRuntimeCapability"],
  ],
  [
    "src/domain-workspaces/operation-runtime/operation-runtime-invariants.ts",
    ["createLocalOperationProjectionVersion", 'requiredCapability: "canSubmit"'],
  ],
  [
    "src/domain-workspaces/operation-integrations/prototype-movement-request-projection.ts",
    [
      "createLocalOperationCrossDomainPacket",
      "createLocalOperationPacketCustody",
      'state: "dispatched"',
      'targetDomain: "delivery"',
    ],
  ],
  [
    "src/domain-workspaces/portfolio/local-runtime/product-portfolio-runtime.ts",
    [
      "createLocalOperationRuntimeAdapter",
      "submitProductPortfolioPublicationDecision",
      "submitProductPortfolioListingCommand",
    ],
  ],
]);

export const guard = {
  id: "shared/operation-local-boundary",
  run() {
    const failures = [];

    for (const root of operationRoots) {
      for (const file of walkFiles(root, [".ts", ".tsx"])) {
        const relativePath = relativeAppPath(file);
        const source = readAppFile(relativePath);

        if (
          !relativePath.includes("/operation-runtime/") &&
          !relativePath.includes("/local-runtime/") &&
          (source.includes("window.localStorage") ||
            source.includes("localStorage.") ||
            source.includes("window.sessionStorage") ||
            source.includes("sessionStorage."))
        ) {
          failures.push(
            `${relativePath}: operation presentation/domain code must use an operation runtime storage adapter instead of browser storage directly`,
          );
        }

        if (
          relativePath.includes("/presentation/") &&
          source.includes("createLocalOperationRuntimeAdapter")
        ) {
          failures.push(
            `${relativePath}: presentation may submit through a runtime adapter but must not construct one`,
          );
        }

        if (
          (relativePath.endsWith("-runtime.ts") ||
            relativePath.endsWith("-projection.ts") ||
            relativePath.includes("/local-runtime/")) &&
          source.includes("useSyncExternalStore")
        ) {
          failures.push(
            `${relativePath}: runtime/model files must expose projection subscribe/snapshot functions; React subscription hooks belong in presentation/controller state`,
          );
        }
      }
    }

    for (const [relativePath, forbiddenTerms] of focusedForbiddenTerms) {
      const source = readAppFile(relativePath);

      for (const term of forbiddenTerms) {
        if (source.includes(term)) {
          failures.push(
            `${relativePath}: local/backend boundary drift; move "${term}" behind an operation runtime helper`,
          );
        }
      }
    }

    for (const [relativePath, requiredTerms] of focusedRequiredTerms) {
      const source = readAppFile(relativePath);

      for (const term of requiredTerms) {
        if (!source.includes(term)) {
          failures.push(
            `${relativePath}: operation runtime contract is missing "${term}"`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
