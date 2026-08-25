import {
  assertRepoIncludes,
  pathExists,
  relativeAppPath,
  readRepoFile,
  walkFiles,
} from "../../guard-lib.mjs";

const contractPath =
  "docs/product/domain-contracts/delivery-source-tree.contract";
const deliveryRoot = "src/domain-workspaces/delivery";
const finalRootDirectories = new Set([
  "domain",
  "live-runtime",
  "local-runtime",
  "presentation",
  "product-adapters",
  "read-model",
  "server",
  "work-model",
]);
const legacyTopLevelRoots = new Set([
  "shared",
  "surfaces",
  "workflows",
  "workspace-shell",
]);

function parseSection(source, sectionName) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `[${sectionName}]`);

  if (start < 0) {
    return null;
  }

  const values = [];

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      break;
    }

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    values.push(trimmed);
  }

  return values;
}

function parentDirectories(filePath) {
  const parts = filePath.split("/");
  const parents = [];

  for (let index = 1; index < parts.length; index += 1) {
    parents.push(parts.slice(0, index).join("/"));
  }

  return parents;
}

export const guard = {
  id: "delivery/source-tree-contract",
  run() {
    const failures = [];

    assertRepoIncludes(failures, contractPath, [
      "status: canonical-path-baseline",
      "No exceptions are allowed in the final Delivery source tree path model",
      "This contract proves path ownership",
      "Normalization rules",
      "Architecture baseline decisions",
      "Prefer human readability over path-only DRY naming",
      "Avoid generic major-component names",
      "Comparable Delivery areas must use the same extraction grammar",
      "A config/control surface must make selection, current values, mutation draft",
      "`work-model/` owns domain command contracts, validation, transitions, and",
      "`index.ts` is allowed only at true public boundaries",
      "[directories]",
      "[files]",
      "presentation/package-register",
      "presentation/workflows/work-design/artifacts/context-brief",
      "presentation/workflows/work-design/embedded-products/context-board",
      "presentation/workflows/work-design/embedded-products/build-tree",
      "presentation/workflows/refinement/steps/metadata-draft",
      "presentation/workflows/refinement/steps/metadata-draft/refinement-metadata-draft-step.tsx",
      "presentation/workflows/refinement/steps/readiness-review",
      "presentation/workflows/refinement/steps/apply-refinement",
      "presentation/workflows/refinement/session/dialogs",
      "presentation/workflows/refinement/support/blocker-recovery",
      "presentation/workflows/work-design/steps/context",
      "presentation/workflows/work-design/steps/build-tree",
      "presentation/workflows/work-design/session/dialogs",
      "presentation/workflows/work-design/support/blocker-recovery",
      "presentation/workflows/work-design/view-model/work-design-apply-model.ts",
      "presentation/workflows/work-design/view-model/work-design-history-model.ts",
    ]);

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/delivery.md",
      [
        "delivery-source-tree.contract",
        "canonical full source-tree contract",
        "Normalization Baseline Decisions",
      ],
    );

    const source = readRepoFile(contractPath);
    const directories = parseSection(source, "directories");
    const files = parseSection(source, "files");

    if (!directories) {
      failures.push(`${contractPath}: missing [directories] section`);
      return failures;
    }

    if (!files) {
      failures.push(`${contractPath}: missing [files] section`);
      return failures;
    }

    const directorySet = new Set(directories);
    const fileSet = new Set(files);

    if (directorySet.size !== directories.length) {
      failures.push(`${contractPath}: duplicate directory entries are not allowed`);
    }

    if (fileSet.size !== files.length) {
      failures.push(`${contractPath}: duplicate file entries are not allowed`);
    }

    for (const sectionEntry of [...directories, ...files]) {
      if (
        sectionEntry.includes("*") ||
        sectionEntry.includes("...") ||
        sectionEntry.endsWith("/")
      ) {
        failures.push(
          `${contractPath}: "${sectionEntry}" is a placeholder or glob, not a strict path`,
        );
      }
    }

    for (const directory of directories) {
      const topLevel = directory.split("/")[0];

      if (!finalRootDirectories.has(topLevel)) {
        failures.push(
          `${contractPath}: directory "${directory}" is outside final Delivery roots`,
        );
      }

      if (legacyTopLevelRoots.has(topLevel)) {
        failures.push(
          `${contractPath}: legacy root "${topLevel}" must not appear in final source tree`,
        );
      }
    }

    for (const filePath of files) {
      if (filePath === "index.ts") {
        continue;
      }

      const topLevel = filePath.split("/")[0];

      if (!finalRootDirectories.has(topLevel)) {
        failures.push(
          `${contractPath}: file "${filePath}" is outside final Delivery roots`,
        );
      }

      if (legacyTopLevelRoots.has(topLevel)) {
        failures.push(
          `${contractPath}: legacy root "${topLevel}" must not appear in final source tree`,
        );
      }

      for (const parent of parentDirectories(filePath)) {
        if (!directorySet.has(parent)) {
          failures.push(
            `${contractPath}: file "${filePath}" is missing declared parent directory "${parent}"`,
          );
        }
      }

      if (
        filePath.startsWith("presentation/") &&
        /\/(surface|view|modal)\.(ts|tsx)$/.test(filePath)
      ) {
        failures.push(
          `${contractPath}: "${filePath}" is too generic for a major presentation file`,
        );
      }

      if (!pathExists(`${deliveryRoot}/${filePath}`)) {
        failures.push(
          `${contractPath}: declared file "${filePath}" is not present in the live Delivery source tree`,
        );
      }
    }

    const liveFiles = walkFiles(deliveryRoot, [".ts", ".tsx", ".css"]).map(
      (filePath) =>
        relativeAppPath(filePath)
          .replace(`${deliveryRoot}/`, ""),
    );

    for (const liveFile of liveFiles) {
      if (!fileSet.has(liveFile)) {
        failures.push(
          `${deliveryRoot}/${liveFile}: live Delivery source file is missing from ${contractPath}`,
        );
      }
    }

    for (const requiredFile of [
      "presentation/package-register/package-workflow-router.tsx",
      "presentation/workspace/workspace-modal.tsx",
      "domain/delivery-package.ts",
      "read-model/delivery-read-model.ts",
      "read-model/projections/root-projection.ts",
      "read-model/selectors/workflow-package-selectors.ts",
      "product-adapters/context-board/work-design-context-board-rendering.ts",
      "local-runtime/persistence/work-design-session-persistence.ts",
      "local-runtime/persistence/refinement-session-persistence.ts",
      "local-runtime/projections/delivery-effective-projection.ts",
    ]) {
      if (!fileSet.has(requiredFile)) {
        failures.push(`${contractPath}: missing required final file "${requiredFile}"`);
      }
    }

    return failures;
  },
};

export default guard;
