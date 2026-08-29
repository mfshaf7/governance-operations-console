import {
  assertAppFile,
  importSpecifiers,
  isDirectory,
  isFile,
  listDir,
  pathExists,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

function operationDomain({ domain, optionalLayers = [], requiredLayers }) {
  return {
    domain,
    requiredRoots: new Set(["index.ts", ...requiredLayers]),
    allowedRoots: new Set(["index.ts", ...requiredLayers, ...optionalLayers]),
  };
}

const completedDomains = [
  operationDomain({
    domain: "delivery",
    optionalLayers: ["live-runtime", "server"],
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "product-adapters",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "proposal",
    optionalLayers: ["live-runtime", "server"],
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "repository",
    optionalLayers: ["live-runtime", "server"],
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "prototype",
    optionalLayers: ["live-runtime", "server"],
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "portfolio",
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "orchestration",
    requiredLayers: [
      "domain",
      "local-runtime",
      "presentation",
      "read-model",
      "work-model",
    ],
  }),
  operationDomain({
    domain: "model-operations",
    optionalLayers: ["local-runtime"],
    requiredLayers: ["presentation", "read-model", "work-model"],
  }),
];

const allowedIndexPaths = new Set([
  "src/domain-workspaces/delivery/index.ts",
  "src/domain-workspaces/delivery/local-runtime/index.ts",
  "src/domain-workspaces/delivery/presentation/package-register/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/refinement/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/shared/blocker-recovery/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/work-design/artifacts/context-brief/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/work-design/embedded-products/build-tree/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/work-design/embedded-products/context-board/index.ts",
  "src/domain-workspaces/delivery/presentation/workflows/work-design/index.ts",
  "src/domain-workspaces/delivery/presentation/workspace/index.ts",
  "src/domain-workspaces/delivery/product-adapters/build-tree/index.ts",
  "src/domain-workspaces/delivery/product-adapters/context-board/index.ts",
  "src/domain-workspaces/delivery/product-adapters/control-board/index.ts",
  "src/domain-workspaces/delivery/read-model/index.ts",
  "src/domain-workspaces/proposal/index.ts",
  "src/domain-workspaces/proposal/presentation/workspace/index.ts",
  "src/domain-workspaces/portfolio/index.ts",
  "src/domain-workspaces/portfolio/presentation/workspace/index.ts",
  "src/domain-workspaces/prototype/index.ts",
  "src/domain-workspaces/prototype/presentation/workspace/index.ts",
  "src/domain-workspaces/repository/index.ts",
  "src/domain-workspaces/repository/presentation/workspace/index.ts",
  "src/domain-workspaces/orchestration/index.ts",
  "src/domain-workspaces/orchestration/presentation/workspace/index.ts",
  "src/domain-workspaces/model-operations/index.ts",
  "src/domain-workspaces/model-operations/presentation/workspace/index.ts",
]);

function hasRawStyling(source) {
  return (
    source.includes(".module.css") ||
    source.includes("styles.") ||
    source.includes("className=") ||
    source.includes("style={{")
  );
}

function isAllowedProductAppStyling(relativePath, source) {
  return (
    relativePath.startsWith(
      "src/domain-workspaces/delivery/presentation/workflows/work-design/embedded-products/",
    ) && source.includes("@/product-apps/")
  );
}

function assertAppFileOrDirectory(failures, path) {
  if (path.endsWith("index.ts")) {
    assertAppFile(failures, path);
    return;
  }

  if (!pathExists(path) || !isDirectory(path)) {
    failures.push(`${path}: missing required operation source layer`);
  }
}

export const guard = {
  id: "shared/operation-source-grammar",
  run() {
    const failures = [];

    for (const { domain, requiredRoots, allowedRoots } of completedDomains) {
      const domainRoot = `src/domain-workspaces/${domain}`;

      if (!pathExists(domainRoot)) {
        failures.push(`${domainRoot}: missing completed operation domain`);
        continue;
      }

      for (const requiredRoot of requiredRoots) {
        assertAppFileOrDirectory(failures, `${domainRoot}/${requiredRoot}`);
      }

      for (const publicWorkspaceFile of [
        "presentation/workspace/index.ts",
        "presentation/workspace/workspace-contract.ts",
        "presentation/workspace/workspace.tsx",
      ]) {
        assertAppFile(failures, `${domainRoot}/${publicWorkspaceFile}`);
      }

      for (const entry of listDir(domainRoot)) {
        const entryPath = `${domainRoot}/${entry}`;

        if (!allowedRoots.has(entry)) {
          failures.push(
            `${entryPath}: completed operation domain root must use the approved source grammar`,
          );
        }

        if (isFile(entryPath) && entry !== "index.ts") {
          failures.push(
            `${entryPath}: operation domain root must expose only index.ts; implementation belongs under an ownership layer`,
          );
        }
      }

      for (const file of walkFiles(domainRoot, [".ts", ".tsx"])) {
        const relativePath = relativeAppPath(file);
        const source = readAppFile(relativePath);

        if (
          relativePath.endsWith("/index.ts") &&
          !allowedIndexPaths.has(relativePath)
        ) {
          failures.push(
            `${relativePath}: index.ts is allowed only at recorded public boundaries`,
          );
        }

        if (
          hasRawStyling(source) &&
          !isAllowedProductAppStyling(relativePath, source)
        ) {
          failures.push(
            `${relativePath}: operation domains must use Teras primitives or product-app adapters instead of raw styling chrome`,
          );
        }

        for (const specifier of importSpecifiers(source)) {
          if (specifier.startsWith(".") && !/\.tsx?$/.test(specifier)) {
            failures.push(
              `${relativePath}: relative operation source imports must use exact .ts or .tsx specifiers for direct Node execution`,
            );
          }

          if (
            specifier.startsWith("@/") &&
            /\/index(?:\.tsx?)?$/.test(specifier)
          ) {
            failures.push(
              `${relativePath}: import an aliased public index boundary through its owning directory`,
            );
          }
        }
      }
    }

    return failures;
  },
};

export default guard;
