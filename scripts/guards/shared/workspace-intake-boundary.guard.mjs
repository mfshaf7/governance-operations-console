import {
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoFile,
  assertRepoIncludes,
  readRepoFile,
  repoPathExists,
} from "../guard-lib.mjs";

const modelPath =
  "docs/product/architecture/system-model.yaml";
const lifecycleView =
  "docs/product/architecture/views/04-lifecycle.md";
const handoffView =
  "docs/product/architecture/views/05-handoffs.md";
const classificationDefinition =
  "docs/product/orchestration-definitions/workspace-entrant-classification.md";
const promotionDefinition =
  "docs/product/orchestration-definitions/workspace-entrant-promotion.md";

const staleTerms = [
  "workspace-product-intake",
  "Workspace Product Intake",
  "workspace-product-admission",
  "delivery-to-product-intake",
  "product-intake-to-portfolio",
];

const activeDocs = [
  "docs/product/architecture/system-model.yaml",
  "docs/product/architecture/views/01-system-context.md",
  "docs/product/architecture/views/02-operator-surfaces.md",
  "docs/product/architecture/views/03-authority-map.md",
  lifecycleView,
  handoffView,
  "docs/product/architecture/views/07-capability-maturity.md",
  "docs/product/operation-workbench-contract.md",
  "docs/product/orchestration-boundary-contract.md",
  "docs/product/orchestration-use-case-matrix.md",
  "docs/product/domain-contracts/portfolio.md",
  "docs/product/surface-contracts/lifecycle-transitions.md",
  classificationDefinition,
  promotionDefinition,
];

export const guard = {
  id: "shared/workspace-intake-boundary",
  run() {
    const failures = [];

    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/workspace-product-intake",
      "Workspace Intake is an embedded authority workflow, not a Workbench domain",
    );
    if (
      repoPathExists(
        "docs/product/domain-contracts/workspace-product-intake.md",
      )
    ) {
      failures.push(
        "domain-contracts/workspace-product-intake.md: obsolete standalone domain contract must remain absent",
      );
    }

    for (const path of [
      "src/operation-workbench/operation-workbench-domain-registry.ts",
      "src/operation-workbench/operation-workbench-host.tsx",
      "src/operation-workbench/operation-workbench-selector-model.ts",
    ]) {
      assertOmits(failures, path, staleTerms);
    }

    assertIncludes(
      failures,
      "src/operation-workbench/operation-workbench-selector.tsx",
      ["xl:grid-cols-7"],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/portfolio/work-model/publication/product-publication-requirements.ts",
      [
        '"active-product-inventory"',
        "workspace-governance://products/",
      ],
    );
    assertOmits(
      failures,
      "src/domain-workspaces/portfolio/work-model/publication/product-publication-requirements.ts",
      staleTerms,
    );

    for (const path of [classificationDefinition, promotionDefinition]) {
      assertRepoFile(failures, path);
    }
    assertRepoIncludes(failures, classificationDefinition, [
      "Definition id: `workspace.entrant.classify`",
      "Classification: `synchronous`",
      "workspace-governance/contracts/intake-register.yaml",
      "Classification is not active registration.",
      "no standalone Product Intake operation",
    ]);
    assertRepoIncludes(failures, promotionDefinition, [
      "Definition id: `workspace.entrant.promote`",
      "Classification: `durable-candidate`",
      "workspace-governance/contracts/repos.yaml",
      "workspace-governance/contracts/products.yaml",
      "workspace-governance/contracts/components.yaml",
      "must never overlap",
    ]);

    assertRepoIncludes(failures, modelPath, [
      "workspace-intake:",
      "kind: authority-workflow",
      "workspace-active-inventory:",
      "workspace-governance/contracts/intake-register.yaml",
      "workspace-governance/contracts/repos.yaml",
      "workspace-governance/contracts/products.yaml",
      "workspace-governance/contracts/components.yaml",
      "repository-to-workspace-intake:",
      "prototype-to-workspace-intake:",
      "delivery-to-workspace-intake:",
      "workspace-intake-to-active-inventory:",
      "active-product-to-portfolio:",
    ]);
    assertRepoIncludes(
      failures,
      "docs/product/architecture/views/01-system-context.md",
      ["Operation Workbench<br/>7 operation domains"],
    );
    assertRepoIncludes(failures, lifecycleView, [
      "Workspace Intake classification",
      "Active inventory promotion",
      "active real product",
    ]);
    assertRepoIncludes(failures, handoffView, [
      "Classification and promotion are separate workflows and receipts.",
      "Workspace Intake classification",
      "Active inventory promotion",
    ]);

    for (const path of activeDocs) {
      const source = readRepoFile(path);
      for (const term of staleTerms) {
        if (source.includes(term)) {
          failures.push(`${path}: must not retain stale token "${term}"`);
        }
      }
    }

    return failures;
  },
};

export default guard;
