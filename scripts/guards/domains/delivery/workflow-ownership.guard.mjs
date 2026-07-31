import {
  assertAppPathAbsent,
  assertAppFile,
  assertRepoIncludes,
  importSpecifiers,
  isFile,
  listDir,
  readAppFile,
  relativeAppPath,
  resolvedRelativeImportPath,
  walkFiles,
} from "../../guard-lib.mjs";

const workflowRoot = "src/domain-workspaces/delivery/presentation/workflows";
const allowedWorkflowRoots = new Set(["refinement", "shared", "work-design"]);
const allowedRefinementStepRoots = new Set([
  "apply-refinement",
  "history",
  "metadata-draft",
  "readiness-review",
]);
const embeddedProductPublicBoundaries = new Set([
  `${workflowRoot}/work-design/embedded-products/build-tree/index.ts`,
  `${workflowRoot}/work-design/embedded-products/context-board/index.ts`,
]);
const embeddedProductRoots = [
  `${workflowRoot}/work-design/embedded-products/build-tree`,
  `${workflowRoot}/work-design/embedded-products/context-board`,
];

export const guard = {
  id: "delivery/workflow-ownership",
  run() {
    const failures = [];

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/delivery.md",
      [
        "Workflow Rule",
        "Work Design and Refinement",
        "model, view model, session state",
        "session controller",
        "Routeable Work Design and Refinement step entrypoints",
        "Durable workflow outputs live under `artifacts/`",
      ],
    );

    for (const requiredPath of [
      `src/domain-workspaces/delivery/local-runtime/persistence/refinement-session-persistence.ts`,
      `src/domain-workspaces/delivery/local-runtime/persistence/work-design-session-persistence.ts`,
      `${workflowRoot}/work-design/artifacts/context-brief/index.ts`,
      `${workflowRoot}/work-design/model/work-design-model.ts`,
      `${workflowRoot}/work-design/view-model/work-design-apply-model.ts`,
      `${workflowRoot}/work-design/view-model/work-design-history-model.ts`,
      `${workflowRoot}/work-design/session/work-design-session-modal.tsx`,
      `${workflowRoot}/work-design/session/work-design-session-step-router.tsx`,
      `${workflowRoot}/work-design/session/dialogs/work-design-close-guard-dialog.tsx`,
      `${workflowRoot}/work-design/session-controller/use-work-design-session-controller.ts`,
      `${workflowRoot}/work-design/steps/build-tree/work-design-build-tree-step.tsx`,
      `${workflowRoot}/work-design/steps/context/work-design-context-step.tsx`,
      `${workflowRoot}/work-design/support/blocker-recovery/work-design-blocker-model.ts`,
      `${workflowRoot}/refinement/model/refinement-model.ts`,
      `${workflowRoot}/refinement/view-model/refinement-step-model.ts`,
      `${workflowRoot}/refinement/session/refinement-session-modal.tsx`,
      `${workflowRoot}/refinement/session/refinement-step-router.tsx`,
      `${workflowRoot}/refinement/session-controller/use-refinement-session-controller.ts`,
      `${workflowRoot}/refinement/steps/apply-refinement/refinement-apply-view.tsx`,
      `${workflowRoot}/refinement/steps/history/refinement-history-view.tsx`,
      `${workflowRoot}/refinement/steps/metadata-draft/refinement-metadata-draft-step.tsx`,
      `${workflowRoot}/refinement/steps/metadata-draft/refinement-metadata-workbench-view.tsx`,
      `${workflowRoot}/refinement/steps/readiness-review/refinement-readiness-review-view.tsx`,
      `${workflowRoot}/refinement/support/blocker-recovery/refinement-blocker-model.ts`,
      `${workflowRoot}/refinement/support/blocker-recovery/refinement-blocker-recovery-dialog.tsx`,
      `${workflowRoot}/shared/blocker-recovery/index.ts`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    for (const entry of listDir(workflowRoot)) {
      const entryPath = `${workflowRoot}/${entry}`;

      if (isFile(entryPath)) {
        failures.push(
          `${entryPath}: workflow root must contain named workflow ownership folders only`,
        );
        continue;
      }

      if (!allowedWorkflowRoots.has(entry)) {
        failures.push(
          `${entryPath}: Delivery workflow folder is not registered in the source-derived workflow ownership model`,
        );
      }
    }

    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/dialogs`,
      "Work Design dialogs must live with their owner, such as session/dialogs, step folders, artifacts, or embedded products",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/context-brief`,
      "Work Design context brief is a workflow artifact and must live under artifacts/context-brief",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/blocker-recovery`,
      "Work Design blocker recovery is local workflow support and must live under support/blocker-recovery",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/structured-tree`,
      "Work Design structured tree rendering is owned by product-apps/build-tree, not a workflow-local structured-tree folder",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/refinement/blocker-recovery`,
      "Refinement blocker recovery is local workflow support and must live under support/blocker-recovery",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/refinement/session/refinement-session-dialogs.tsx`,
      "Refinement session guard dialogs must live under session/dialogs",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/refinement/view-model/refinement-blocker-model.ts`,
      "Refinement blocker model is blocker-recovery support, not workflow-wide view-model",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/steps/apply-draft/work-design-apply-model.ts`,
      "Work Design apply projection helpers consumed by view-model belong under view-model/",
    );
    assertAppPathAbsent(
      failures,
      `${workflowRoot}/work-design/steps/history/work-design-history-model.ts`,
      "Work Design history projection helpers consumed by view-model belong under view-model/",
    );
    for (const internalBarrelPath of [
      `${workflowRoot}/work-design/model/index.ts`,
      `${workflowRoot}/work-design/session/index.ts`,
      `${workflowRoot}/work-design/session/dialogs/index.ts`,
      `${workflowRoot}/work-design/session-controller/index.ts`,
      `${workflowRoot}/work-design/steps/apply-draft/index.ts`,
      `${workflowRoot}/work-design/steps/build-tree/index.ts`,
      `${workflowRoot}/work-design/steps/context/index.ts`,
      `${workflowRoot}/work-design/steps/history/index.ts`,
      `${workflowRoot}/work-design/steps/review-draft/index.ts`,
      `${workflowRoot}/work-design/view-model/index.ts`,
      `${workflowRoot}/shared/package-actions/index.ts`,
      `${workflowRoot}/refinement/model/index.ts`,
      `${workflowRoot}/refinement/session/index.ts`,
      `${workflowRoot}/refinement/session/dialogs/index.ts`,
      `${workflowRoot}/refinement/session-controller/index.ts`,
      `${workflowRoot}/refinement/steps/apply-refinement/index.ts`,
      `${workflowRoot}/refinement/steps/history/index.ts`,
      `${workflowRoot}/refinement/steps/metadata-draft/index.ts`,
      `${workflowRoot}/refinement/steps/readiness-review/index.ts`,
      `${workflowRoot}/refinement/support/blocker-recovery/index.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        internalBarrelPath,
        "Delivery workflows must not keep internal convenience barrels; import concrete owner files unless the folder is a public workflow, shared, artifact, or embedded-product boundary",
      );
    }

    for (const entry of listDir(`${workflowRoot}/refinement/steps`)) {
      const entryPath = `${workflowRoot}/refinement/steps/${entry}`;

      if (isFile(entryPath)) {
        failures.push(
          `${entryPath}: Refinement visible workflow steps must live in named step folders, matching Work Design readability rules`,
        );
        continue;
      }

      if (!allowedRefinementStepRoots.has(entry)) {
        failures.push(
          `${entryPath}: Refinement step folder is not registered in the source-derived workflow ownership model`,
        );
      }
    }

    for (const workflowSupportRoot of [
      `${workflowRoot}/work-design/session`,
      `${workflowRoot}/work-design/session-controller`,
    ]) {
      for (const absoluteFilePath of walkFiles(workflowSupportRoot, [
        ".ts",
        ".tsx",
      ])) {
        const filePath = relativeAppPath(absoluteFilePath);
        const source = readAppFile(filePath);

        for (const specifier of importSpecifiers(source)) {
          const resolvedPath = resolvedRelativeImportPath(filePath, specifier);

          if (
            resolvedPath &&
            embeddedProductRoots.some((root) =>
              resolvedPath.startsWith(`${root}/`),
            ) &&
            !embeddedProductPublicBoundaries.has(resolvedPath)
          ) {
            failures.push(
              `${filePath}: Work Design session orchestration may import embedded product public APIs, but not embedded-product internals`,
            );
          }
        }
      }
    }

    for (const barrelPath of [
      `${workflowRoot}/work-design/embedded-products/context-board/index.ts`,
      `${workflowRoot}/work-design/embedded-products/build-tree/index.ts`,
    ]) {
      const source = readAppFile(barrelPath);

      if (source.includes("product-adapters/")) {
        failures.push(
          `${barrelPath}: Work Design embedded-product public APIs must expose routeable surfaces only; import adapter helpers directly from product-adapters at the use site`,
        );
      }
    }

    for (const absoluteFilePath of walkFiles(
      `${workflowRoot}/work-design/view-model`,
      [".ts"],
    )) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      if (source.includes("../steps/")) {
        failures.push(
          `${filePath}: Work Design view-model must not import projection helpers from visible step folders`,
        );
      }
    }

    const refinementStepRouter = readAppFile(
      `${workflowRoot}/refinement/session/refinement-step-router.tsx`,
    );
    for (const forbiddenToken of [
      "RefinementMetadataAdvisor",
      "RefinementMetadataWorkbenchView",
      "RefinementSelectedMetadataFieldEditor",
    ]) {
      if (refinementStepRouter.includes(forbiddenToken)) {
        failures.push(
          `${workflowRoot}/refinement/session/refinement-step-router.tsx: Refinement router must select the metadata step facade, not compose metadata internals`,
        );
      }
    }

    return failures;
  },
};

export default guard;
