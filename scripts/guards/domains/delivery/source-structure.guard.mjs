import {
  assertAppPathAbsent,
  assertAppFile,
  assertOmits,
  assertRepoIncludes,
  isFile,
  lineCount,
  listDir,
  pathExists,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const deliveryRoot = "src/domain-workspaces/delivery";
const catalogSurfaceRoot = `${deliveryRoot}/presentation/surfaces/catalog`;
const catalogWorkModelRoot = `${deliveryRoot}/work-model/catalog`;
const deliveryCommandRuntimeRoot = `${deliveryRoot}/local-runtime/commands`;
const executionBoardSurfaceRoot = `${deliveryRoot}/presentation/surfaces/execution-board`;
const executionBoardActionSessionRoot = `${executionBoardSurfaceRoot}/action-session`;
const executionWorkModelRoot = `${deliveryRoot}/work-model/execution`;
const catalogModelFiles = [
  `${catalogSurfaceRoot}/catalog-view-model.ts`,
  `${catalogSurfaceRoot}/catalog-display-model.ts`,
  `${catalogSurfaceRoot}/catalog-mutation-view-model.ts`,
  `${catalogWorkModelRoot}/catalog-selectors.ts`,
  `${catalogWorkModelRoot}/catalog-draft-model.ts`,
  `${catalogWorkModelRoot}/catalog-mutation-types.ts`,
  `${catalogWorkModelRoot}/catalog-mutation-model.ts`,
  `${catalogWorkModelRoot}/catalog-retirement-model.ts`,
  `${deliveryCommandRuntimeRoot}/catalog-mutation-runtime.ts`,
];
const executionBoardActionFiles = [
  `${executionBoardActionSessionRoot}/use-execution-action-session.ts`,
  `${executionBoardActionSessionRoot}/execution-action-view-model.ts`,
  `${executionBoardActionSessionRoot}/execution-action-modal.tsx`,
  `${executionWorkModelRoot}/execution-action-contracts.ts`,
  `${executionWorkModelRoot}/execution-action-eligibility.ts`,
  `${executionWorkModelRoot}/execution-action-intent.ts`,
  `${deliveryCommandRuntimeRoot}/execution-action-runtime.ts`,
];
const targetRootDirectories = new Set([
  "domain",
  "live-runtime",
  "local-runtime",
  "product-adapters",
  "presentation",
  "read-model",
  "server",
  "work-model",
]);
const bannedLegacyRootDirectories = new Set([
  "workspace-shell",
  "surfaces",
  "workflows",
  "shared",
]);

export const guard = {
  id: "delivery/source-structure",
  run() {
    const failures = [];

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/delivery.md",
      [
        "Delivery Source Architecture",
        "Delivery architecture baseline",
        "Engineering Model",
        "Source Structure",
        "read-model/",
        "work-model/",
        "product-adapters/",
        "local-runtime/",
        "presentation/",
        "Architecture Ratchet Rule",
        "Legacy root folders are not allowed",
        "only final Delivery architecture",
      ],
    );

    assertAppFile(failures, `${deliveryRoot}/index.ts`);
    assertAppFile(
      failures,
      `${deliveryRoot}/work-model/ingress/proposal-delivery-entry-packet.ts`,
    );
    for (const path of [
      `${deliveryRoot}/local-runtime/persistence/refinement-session-persistence.ts`,
      `${deliveryRoot}/local-runtime/persistence/work-design-session-persistence.ts`,
    ]) {
      assertAppFile(failures, path);
    }
    for (const path of catalogModelFiles) {
      assertAppFile(failures, path);
    }
    for (const path of executionBoardActionFiles) {
      assertAppFile(failures, path);
    }

    if (!pathExists(deliveryRoot)) {
      failures.push(`${deliveryRoot}: missing Delivery domain workspace`);
      return failures;
    }

    for (const entry of listDir(deliveryRoot)) {
      const entryPath = `${deliveryRoot}/${entry}`;

      if (isFile(entryPath)) {
        if (entry !== "index.ts") {
          failures.push(
            `${entryPath}: Delivery root must expose only index.ts; implementation belongs in a named ownership folder`,
          );
        }
        continue;
      }

      if (
        !targetRootDirectories.has(entry)
      ) {
        failures.push(
          `${entryPath}: Delivery root folder is not part of the source-derived ownership model`,
        );
      }

      if (bannedLegacyRootDirectories.has(entry)) {
        failures.push(`${entryPath}: legacy Delivery root folders are not allowed`);
      }
    }

    if (lineCount(`${catalogSurfaceRoot}/catalog-view-model.ts`) > 90) {
      failures.push(
        `${catalogSurfaceRoot}/catalog-view-model.ts: Catalog view model must remain a small public barrel over the split model files`,
      );
    }

    assertAppPathAbsent(
      failures,
      `${deliveryRoot}/presentation/shared/format/index.ts`,
      "single-function shared format helpers should be imported from the concrete file",
    );
    assertAppPathAbsent(
      failures,
      `${deliveryRoot}/presentation/workflows/shared/package-actions/index.ts`,
      "shared package-action internals should be imported from concrete files until a true package boundary is needed",
    );
    assertOmits(failures, `${deliveryRoot}/presentation/package-register/index.ts`, [
      "package-register-data",
      "package-register-selected-panel",
      "package-register-table",
      "package-register-types",
      "package-register-view-model",
    ]);
    assertOmits(failures, `${deliveryRoot}/presentation/workspace/index.ts`, [
      "workspace-modal",
      "workspace-config",
      "workspace-types",
    ]);
    assertOmits(
      failures,
      `${deliveryRoot}/presentation/workflows/work-design/index.ts`,
      [
        "WorkDesignFinalizedBriefEvidenceDialog",
        "export type { WorkDesignRegisterPackage",
      ],
    );
    assertAppPathAbsent(
      failures,
      `${executionBoardActionSessionRoot}/index.ts`,
      "Execution Board action-session files are local surface internals and should be imported directly",
    );

    for (const retiredPath of [
      `${executionBoardSurfaceRoot}/execution-action-contracts.ts`,
      `${executionBoardSurfaceRoot}/package-action-modal.tsx`,
      `${executionBoardActionSessionRoot}/execution-action-contracts.ts`,
      `${executionBoardActionSessionRoot}/execution-action-eligibility.ts`,
      `${executionBoardActionSessionRoot}/execution-action-intent.ts`,
      `${executionBoardActionSessionRoot}/execution-action-runtime.ts`,
      `${catalogSurfaceRoot}/catalog-draft-model.ts`,
      `${catalogSurfaceRoot}/catalog-mutation-model.ts`,
      `${catalogSurfaceRoot}/catalog-mutation-types.ts`,
      `${catalogSurfaceRoot}/catalog-runtime.ts`,
      `${catalogSurfaceRoot}/catalog-selectors.ts`,
    ]) {
      if (pathExists(retiredPath)) {
        failures.push(
          `${retiredPath}: Execution Board action session code belongs under action-session/`,
        );
      }
    }

    for (const absoluteFilePath of walkFiles(
      `${deliveryRoot}/presentation/workflows`,
      [".ts", ".tsx"],
    )) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      if (source.includes("window.localStorage") || source.includes("localStorage.")) {
        failures.push(
          `${filePath}: workflow presentation must use delivery/local-runtime/persistence for local session storage`,
        );
      }
    }

    return failures;
  },
};

export default guard;
