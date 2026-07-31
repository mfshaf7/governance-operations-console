import {
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoFile,
  readRepoFile,
} from "../guard-lib.mjs";

const authorityContract =
  "docs/product/authority-decision-contract.md";

const activeDocs = [
  "docs/product/README.md",
  "docs/product/architecture/README.md",
  "docs/product/architecture/system-model.yaml",
  "docs/product/architecture/views/01-system-context.md",
  "docs/product/architecture/views/02-operator-surfaces.md",
  "docs/product/architecture/views/03-authority-map.md",
  "docs/product/architecture/views/04-lifecycle.md",
  "docs/product/architecture/views/05-handoffs.md",
  "docs/product/architecture/views/06-runtime-release.md",
  "docs/product/architecture/views/07-capability-maturity.md",
  "docs/product/backlog.md",
  "docs/product/brief.md",
  "docs/product/design-profile.md",
  "docs/product/implementation-audit.md",
  "docs/product/operation-workbench-contract.md",
  "docs/product/orchestration-boundary-contract.md",
  "docs/product/orchestration-use-case-matrix.md",
  "docs/product/system-design.md",
  "docs/product/domain-contracts/README.md",
  "docs/product/domain-contracts/model-operations.md",
  "docs/product/domain-contracts/orchestration.md",
  "docs/product/domain-contracts/portfolio.md",
  "docs/product/domain-contracts/prototype.md",
  "docs/product/surface-contracts/lifecycle-transitions.md",
];

const staleDomainTerms = [
  "Risk / Exception",
  "Risk/Exception",
  "risk-exception",
];

export const guard = {
  id: "shared/authority-decision-boundary",
  run() {
    const failures = [];

    assertRepoFile(failures, authorityContract);
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/risk-exception",
      "authority decisions are not an Operation Workbench domain",
    );
    assertAppPathAbsent(
      failures,
      "src/movement-control",
      "Lifecycle Transitions replaced the historical Movement Control surface",
    );

    assertIncludes(
      failures,
      "src/operation-workbench/operation-workbench-selector.tsx",
      ["xl:grid-cols-7"],
    );
    assertOmits(failures, "src/app/page.tsx", staleDomainTerms);
    assertOmits(
      failures,
      "src/operation-workbench/operation-workbench-selector-model.ts",
      staleDomainTerms,
    );
    assertOmits(failures, "src/domain-workspaces/index.ts", ["risk-exception"]);
    assertOmits(
      failures,
      "src/lifecycle-transitions/presentation/workspace/lifecycle-transitions-workspace.tsx",
      staleDomainTerms,
    );

    if (failures.length === 0) {
      const contract = readRepoFile(authorityContract);
      for (const term of [
        "Authority Decision Request",
        "Authority Decision Receipt",
        "The request is not approval.",
        "The originating domain must validate authority",
        "Do not add a generic Risk / Exception register",
      ]) {
        if (!contract.includes(term)) {
          failures.push(`${authorityContract}: missing required token "${term}"`);
        }
      }
    }

    for (const path of activeDocs) {
      const source = readRepoFile(path);
      for (const term of staleDomainTerms) {
        if (source.includes(term)) {
          failures.push(`${path}: must not retain generic domain token "${term}"`);
        }
      }
    }

    return failures;
  },
};

export default guard;
