import {
  assertAppFile,
  assertAppPathAbsent,
  assertRepoIncludes,
  importSpecifiers,
  isFile,
  listDir,
  pathExists,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const modelOperationsRoot = "src/domain-workspaces/model-operations";
const modelOperationsContract =
  "docs/product/domain-contracts/model-operations.md";
const allowedRootEntries = new Set([
  "index.ts",
  "presentation",
  "read-model",
  "work-model",
]);

export const guard = {
  id: "model-operations/source-structure",
  run() {
    const failures = [];

    assertRepoIncludes(failures, modelOperationsContract, [
      "Surface mode: Compact Control Mode.",
      "Model Operations Control",
      "Model Profile Dashboard",
      "The Console has no durable Model Operations business database.",
      "dashboards/",
      "model-profile/",
      "completed current-shape reference",
    ]);

    for (const requiredPath of [
      `${modelOperationsRoot}/index.ts`,
      `${modelOperationsRoot}/presentation/workspace/index.ts`,
      `${modelOperationsRoot}/presentation/workspace/workspace.tsx`,
      `${modelOperationsRoot}/presentation/workspace/workspace-contract.ts`,
      `${modelOperationsRoot}/presentation/surface/model-operations-control-surface.tsx`,
      `${modelOperationsRoot}/presentation/surface/model-operations-control-overview-panel.tsx`,
      `${modelOperationsRoot}/presentation/surface/model-operations-control-view-model.ts`,
      `${modelOperationsRoot}/presentation/surface/model-profile-register-table.tsx`,
      `${modelOperationsRoot}/presentation/surface/use-model-operations-control-controller.ts`,
      `${modelOperationsRoot}/presentation/dashboards/model-profile/model-profile-dashboard.tsx`,
      `${modelOperationsRoot}/presentation/dashboards/model-profile/model-profile-dashboard-view-model.ts`,
      `${modelOperationsRoot}/presentation/dialogs/local-runtime/local-exception-runtime-dialog.tsx`,
      `${modelOperationsRoot}/presentation/dialogs/profile-inspector/model-profile-inspector-dialog.tsx`,
      `${modelOperationsRoot}/presentation/dialogs/profile-inspector/model-profile-inspector-view-model.ts`,
      `${modelOperationsRoot}/presentation/dialogs/request-support/model-profile-request-support-dialog.tsx`,
      `${modelOperationsRoot}/presentation/dialogs/request-support/model-profile-request-support-view-model.ts`,
      `${modelOperationsRoot}/presentation/shared/model-profile-display-model.ts`,
      `${modelOperationsRoot}/read-model/model-operations-read-model.ts`,
      `${modelOperationsRoot}/read-model/types/model-operations-types.ts`,
      `${modelOperationsRoot}/read-model/selectors/model-profile-selectors.ts`,
      `${modelOperationsRoot}/read-model/fixtures/model-profile-records.fixture.ts`,
      `${modelOperationsRoot}/read-model/fixtures/model-operations-workspace.fixture.ts`,
      `${modelOperationsRoot}/read-model/fixtures/model-operations-workspace-status.fixture.ts`,
      `${modelOperationsRoot}/work-model/profile-requests/model-profile-request-capability.ts`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    if (!pathExists(modelOperationsRoot)) {
      failures.push(`${modelOperationsRoot}: missing Model Operations domain`);
      return failures;
    }

    for (const entry of listDir(modelOperationsRoot)) {
      const entryPath = `${modelOperationsRoot}/${entry}`;

      if (!allowedRootEntries.has(entry)) {
        failures.push(
          `${entryPath}: Model Operations root entry is not part of the approved ownership grammar`,
        );
      }

      if (isFile(entryPath) && entry !== "index.ts") {
        failures.push(
          `${entryPath}: Model Operations implementation belongs under an ownership layer`,
        );
      }
    }

    for (const retiredPath of [
      "src/model-operations",
      `${modelOperationsRoot}/presentation/dashboard`,
      `${modelOperationsRoot}/presentation/dialogs/local-exception-runtime-dialog.tsx`,
      `${modelOperationsRoot}/presentation/dialogs/model-profile-inspector-dialog.tsx`,
      `${modelOperationsRoot}/presentation/dialogs/model-profile-request-support-dialog.tsx`,
      `${modelOperationsRoot}/presentation/surface/model-profile-view-model.ts`,
      `${modelOperationsRoot}/read-model/index.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        retiredPath,
        "Model Operations must keep the normalized ownership structure",
      );
    }

    for (const absoluteFilePath of walkFiles(
      `${modelOperationsRoot}/presentation`,
      [".ts", ".tsx"],
    )) {
      const relativePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(relativePath);

      if (
        relativePath.endsWith(".tsx") &&
        (source.includes("items={[") || source.includes("facts={["))
      ) {
        failures.push(
          `${relativePath}: presentation must consume typed metadata projections instead of constructing metadata arrays in JSX`,
        );
      }

      if (
        (relativePath.includes("/dashboards/") ||
          relativePath.includes("/dialogs/")) &&
        importSpecifiers(source).some((specifier) =>
          specifier.includes("/surface/") || specifier.startsWith("../../surface")
        )
      ) {
        failures.push(
          `${relativePath}: dashboard and dialog code must not depend on surface-owned presentation modules`,
        );
      }
    }

    return failures;
  },
};

export default guard;
