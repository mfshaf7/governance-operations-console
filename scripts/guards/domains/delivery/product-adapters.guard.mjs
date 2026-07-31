import {
  assertAppFile,
  assertAppPathAbsent,
  assertRepoIncludes,
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

export const guard = {
  id: "delivery/product-adapters",
  run() {
    const failures = [];
    const allowedPresentationAdapterSpecifiers = new Set([
      "../../presentation/workflows/work-design/artifacts/context-brief",
      "../../presentation/workflows/work-design/model/work-design-model",
    ]);

    assertRepoIncludes(
      failures,
      "docs/product/product-app-boundaries.md",
      [
        "delivery/product-adapters",
        "Allowed dependency direction",
        "product-apps/context-board",
        "product-apps/build-tree",
      ],
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/context-board/index.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/context-board/work-design-context-board-starters.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/context-board/work-design-context-board-core.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/context-board/work-design-context-board-rendering.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/context-board/work-design-context-board-templates.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/build-tree/index.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/build-tree/work-design-tree-model.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/build-tree/work-design-build-tree-advisor.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/product-adapters/build-tree/work-design-build-tree-scaffold.ts",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/adapters/work-design-context-board-starters.ts",
      "Delivery-owned product-app adapters belong under delivery/product-adapters",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/context-board/board.ts",
      "Work Design Context Board core aliases belong under delivery/product-adapters/context-board",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/context-board/board-rendering.ts",
      "Work Design Context Board rendering adapters belong under delivery/product-adapters/context-board",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/context-board/board-templates.ts",
      "Work Design Context Board template adapters belong under delivery/product-adapters/context-board",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/build-tree/work-design-tree-model.ts",
      "Delivery-owned Build Tree model adapters belong under delivery/product-adapters/build-tree",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/build-tree/work-design-build-tree-advisor.ts",
      "Delivery-owned Build Tree advisor adapters belong under delivery/product-adapters/build-tree",
    );
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/workflows/work-design/build-tree/work-design-build-tree-scaffold.ts",
      "Delivery-owned Build Tree scaffold adapters belong under delivery/product-adapters/build-tree",
    );

    for (const file of walkFiles("src/product-apps", [".ts", ".tsx"])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const specifier of importSpecifiers(source)) {
        if (specifier.includes("domain-workspaces/delivery")) {
          failures.push(
            `${relativePath}: product app code must not import Delivery internals via "${specifier}"`,
          );
        }
      }
    }

    for (const file of walkFiles("src/domain-workspaces/delivery/product-adapters", [
      ".ts",
      ".tsx",
    ])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const specifier of importSpecifiers(source)) {
        if (
          (specifier.includes("/presentation/") &&
            !allowedPresentationAdapterSpecifiers.has(specifier)) ||
          specifier.includes("/surfaces/") ||
          specifier.includes("/view-model/") ||
          specifier.includes("/workspace-shell/")
        ) {
          failures.push(
            `${relativePath}: product adapters must not import presentation, surface, view-model, or workspace shell code through "${specifier}" outside the bounded Work Design model/context-brief compatibility edge`,
          );
        }

        if (
          specifier.includes("/workflows/") &&
          !allowedPresentationAdapterSpecifiers.has(specifier)
        ) {
          failures.push(
            `${relativePath}: product adapters may only use the bounded Work Design model/context-brief compatibility imports, not workflow internals through "${specifier}"`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
