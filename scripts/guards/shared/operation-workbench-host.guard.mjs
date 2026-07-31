import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
  readAppFile,
} from "../guard-lib.mjs";

const pagePath = "src/app/page.tsx";
const hostPath =
  "src/operation-workbench/operation-workbench-host.tsx";
const registryPath =
  "src/operation-workbench/operation-workbench-domain-registry.ts";
const selectorPath =
  "src/operation-workbench/operation-workbench-selector-model.ts";
const selectorPresentationPath =
  "src/operation-workbench/operation-workbench-selector.tsx";

const domains = [
  {
    contractPath:
      "src/domain-workspaces/proposal/presentation/workspace/workspace-contract.ts",
    domain: "proposal",
    indexPath: "src/domain-workspaces/proposal/index.ts",
    workspacePath:
      "src/domain-workspaces/proposal/presentation/workspace/workspace.tsx",
    workspaceToken: "ProposalWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/repository/presentation/workspace/workspace-contract.ts",
    domain: "repository",
    indexPath: "src/domain-workspaces/repository/index.ts",
    workspacePath:
      "src/domain-workspaces/repository/presentation/workspace/workspace.tsx",
    workspaceToken: "RepositoryWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/model-operations/presentation/workspace/workspace-contract.ts",
    domain: "model-operations",
    indexPath: "src/domain-workspaces/model-operations/index.ts",
    workspacePath:
      "src/domain-workspaces/model-operations/presentation/workspace/workspace.tsx",
    workspaceToken: "ModelOperationsWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/delivery/presentation/workspace/workspace-contract.ts",
    domain: "delivery",
    indexPath: "src/domain-workspaces/delivery/index.ts",
    workspacePath:
      "src/domain-workspaces/delivery/presentation/workspace/workspace-modal.tsx",
    workspaceToken: "DeliveryWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/prototype/presentation/workspace/workspace-contract.ts",
    domain: "prototype",
    indexPath: "src/domain-workspaces/prototype/index.ts",
    workspacePath:
      "src/domain-workspaces/prototype/presentation/workspace/workspace.tsx",
    workspaceToken: "PrototypeWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/portfolio/presentation/workspace/workspace-contract.ts",
    domain: "portfolio",
    indexPath: "src/domain-workspaces/portfolio/index.ts",
    surfaceAttributesPath:
      "src/domain-workspaces/portfolio/presentation/workspace/product-portfolio-workspace-shell.tsx",
    workspacePath:
      "src/domain-workspaces/portfolio/presentation/workspace/workspace.tsx",
    workspaceToken: "PortfolioWorkspace",
  },
  {
    contractPath:
      "src/domain-workspaces/orchestration/presentation/workspace/workspace-contract.ts",
    domain: "orchestration",
    indexPath: "src/domain-workspaces/orchestration/index.ts",
    workspacePath:
      "src/domain-workspaces/orchestration/presentation/workspace/workspace.tsx",
    workspaceToken: "OrchestrationWorkspace",
  },
];

export const guard = {
  id: "shared/operation-workbench-host",
  run() {
    const failures = [];

    for (const path of [
      pagePath,
      hostPath,
      registryPath,
      selectorPath,
      selectorPresentationPath,
      "src/operation-workbench/operation-workbench.tsx",
      "src/operation-workbench/operation-workbench-contract.ts",
    ]) {
      assertAppFile(failures, path);
    }

    assertRepoIncludes(
      failures,
      "docs/product/operation-workbench-contract.md",
      [
        "## Whole-Workbench Host Contract",
        "one typed registry",
        "seven real",
        "routing is exhaustive",
        "portal-rendered modal surface",
        "Whole-Workbench proof requires",
      ],
    );

    assertIncludes(failures, registryPath, [
      "operationWorkbenchDomainRegistry",
      "operationWorkbenchDomainIds",
      "operationWorkbenchPathLabels",
      "getOperationWorkbenchDomainId",
      "Unknown Operation Workbench path label",
    ]);
    assertIncludes(failures, selectorPath, [
      "operationWorkbenchDomainRegistry.map",
      "selectorMetadata[entry.domain]",
      "OperationWorkbenchSelectorEntry",
    ]);
    assertOmits(failures, selectorPath, ["process:"]);

    assertIncludes(failures, hostPath, [
      "function OperationWorkbenchHost",
      "selected.domain",
      "assertUnreachableOperationWorkbenchDomain(domain)",
    ]);
    assertIncludes(failures, selectorPresentationPath, [
      "operationWorkbenchSelectorEntries.map",
      "xl:grid-cols-7",
    ]);
    assertOmits(failures, pagePath, [
      "OperationWorkbenchHost",
      "OperationWorkbenchSelector",
      "OperationDeskFocus",
      "UndevelopedOperationDeskFocus",
      "No workflow mounted.",
      "DeliveryWorkspaceController",
      "getPrototypeWorkspaceReadModel",
      "if (path.label ===",
    ]);
    assertIncludes(failures, pagePath, [
      "GovernanceConsoleShell",
    ]);
    assertOmits(failures, "src/app/globals.css", [
      "operation-desk-empty-content",
      "operation-desk-empty-overview",
      "operation-desk-empty-surface",
    ]);

    const hostSource = readAppFile(hostPath);
    const wrapperCount = hostSource.match(
      /<OperationWorkbench contract=\{contract\}>/g,
    )?.length ?? 0;
    if (wrapperCount !== domains.length) {
      failures.push(
        `${hostPath}: expected ${domains.length} exhaustive host wrappers, found ${wrapperCount}`,
      );
    }

    for (const domain of domains) {
      for (const path of [
        domain.contractPath,
        domain.indexPath,
        domain.workspacePath,
      ]) {
        assertAppFile(failures, path);
      }

      assertIncludes(failures, registryPath, [
        `domain: "${domain.domain}"`,
      ]);
      assertIncludes(failures, hostPath, [
        `case "${domain.domain}":`,
        `<${domain.workspaceToken}`,
      ]);
      assertIncludes(failures, domain.indexPath, [
        domain.workspaceToken,
        "OperationWorkbenchContract",
      ]);
      assertIncludes(failures, domain.contractPath, [
        `domain: "${domain.domain}"`,
        "operation-workbench/operation-workbench-contract",
      ]);
      assertOmits(failures, domain.contractPath, [
        "Movement Control owns",
      ]);
      assertIncludes(
        failures,
        domain.surfaceAttributesPath ?? domain.workspacePath,
        [
        "getOperationWorkbenchSurfaceAttributes",
        ],
      );
    }

    assertOmits(failures, "src/domain-workspaces/delivery/index.ts", [
      "DeliveryWorkspaceController",
    ]);
    assertIncludes(failures, "src/domain-workspaces/prototype/index.ts", [
      "prototypeActivitySource",
    ]);
    assertOmits(failures, "src/domain-workspaces/prototype/index.ts", [
      "filterPrototypeRecords",
      "getPrototypeWorkspaceReadModel",
    ]);

    return failures;
  },
};

export default guard;
