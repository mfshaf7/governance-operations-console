import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const root = "src/environment-lifecycle";
const workspace =
  `${root}/presentation/workspace/environment-lifecycle-workspace.tsx`;
const devSurface =
  `${root}/presentation/dev-integration/dev-integration-surface.tsx`;
const devDashboard =
  `${root}/presentation/dev-integration/dev-integration-profile-dashboard.tsx`;
const devOverview =
  `${root}/presentation/dev-integration/dashboard/profile-overview-tab.tsx`;
const devRuntime =
  `${root}/presentation/dev-integration/dashboard/profile-runtime-tab.tsx`;
const devStageHandoff =
  `${root}/presentation/dev-integration/dashboard/profile-stage-handoff-tab.tsx`;
const devSupportDetails =
  `${root}/presentation/dev-integration/dashboard/profile-support-details-dialog.tsx`;
const devSelectedProfile =
  `${root}/presentation/dev-integration/register/dev-integration-selected-profile.tsx`;
const profileRequest =
  `${root}/presentation/dev-integration/dev-integration-profile-request.tsx`;
const releaseSurface =
  `${root}/presentation/governed-releases/governed-releases-surface.tsx`;
const releaseDashboard =
  `${root}/presentation/governed-releases/product-release-dashboard.tsx`;
const releaseSelectedProduct =
  `${root}/presentation/governed-releases/register/governed-release-selected-product.tsx`;
const releaseWorkflow =
  `${root}/presentation/governed-releases/product-release-action-workflow.tsx`;
const lifecycleWorkflow =
  `${root}/presentation/governed-releases/product-runtime-lifecycle-workflow.tsx`;
const operationPanel =
  `${root}/presentation/operations/environment-operation-panel.tsx`;
const operationLogPanel =
  `${root}/presentation/operations/environment-operation-log-panel.tsx`;
const runtimeController =
  `${root}/state/use-environment-lifecycle-runtime.ts`;
const shell = "src/console-shell/governance-console-shell.tsx";

export const guard = {
  id: "shared/environment-lifecycle-boundary",
  run() {
    const failures = [];

    for (const path of [
      `${root}/index.ts`,
      workspace,
      devSurface,
      devDashboard,
      devOverview,
      devRuntime,
      devStageHandoff,
      devSupportDetails,
      devSelectedProfile,
      profileRequest,
      releaseSurface,
      releaseDashboard,
      releaseSelectedProduct,
      releaseWorkflow,
      lifecycleWorkflow,
      operationPanel,
      operationLogPanel,
      `${root}/model/dev-integration-profile.ts`,
      `${root}/model/dev-integration-profile-request.ts`,
      `${root}/model/environment-lifecycle-command.ts`,
      `${root}/model/product-release-capability.ts`,
      `${root}/read-model/environment-lifecycle-effective-projection.ts`,
      `${root}/local-runtime/environment-lifecycle-command-simulator.ts`,
      `${root}/local-runtime/environment-lifecycle-runtime-store.ts`,
      runtimeController,
      "tests/environment-lifecycle/environment-lifecycle-model.test.mjs",
      "tests/environment-lifecycle/environment-lifecycle-runtime.test.mjs",
    ]) {
      assertAppFile(failures, path);
    }

    assertAppPathAbsent(
      failures,
      `${root}/presentation/environment-lifecycle-panel.tsx`,
      "Environment Lifecycle launches only through dedicated workspaces",
    );

    assertIncludes(failures, workspace, [
      "TerasModalShell",
      "TerasFullscreenSurfaceFrame",
      "TerasSurfaceSummaryHeader",
      "DevIntegrationSurface",
      "GovernedReleasesSurface",
      "useEnvironmentLifecycleRuntime",
      "TerasDraftCloseGuardDialog",
    ]);
    assertOmits(failures, workspace, ["TerasSurfaceNav"]);
    assertIncludes(failures, devSurface, [
      "TerasRecordControlLayout",
      "TerasRegisterPanel",
      "TerasFilterBar",
      "TerasRecordControlActionPanel",
      'mode="register-selected"',
      "DevIntegrationSelectedProfile",
      "DevIntegrationProfileDashboard",
      "DevIntegrationProfileRequest",
    ]);
    assertIncludes(failures, devSelectedProfile, [
      "TerasSelectedPanel",
      'variant="compact"',
      "Open Profile Dashboard",
    ]);
    assertIncludes(failures, devDashboard, [
      "TerasModalShell",
      "TerasPrimarySideLayout",
      "TerasSegmentedControl",
      "TerasSummaryCardGrid",
      "ProfileOverviewStage",
      "ProfileOverviewDock",
      "ProfileRuntimeStage",
      "ProfileRuntimeDock",
      "ProfileStageHandoffStage",
      "ProfileStageHandoffDock",
      "ProfileSupportDetailsDialog",
    ]);
    assertOmits(failures, devDashboard, [
      "TerasContentRegion",
      "TerasZoneLayout",
    ]);
    assertIncludes(failures, devOverview, [
      "ProfileOverviewStage",
      "ProfileOverviewDock",
      "TerasContentFrame",
      "View Support Details",
      "Open Stage Handoff",
      "Open Runtime Controls",
    ]);
    assertIncludes(failures, devRuntime, [
      "ProfileRuntimeStage",
      "ProfileRuntimeDock",
      "TerasContentFrame",
      "EnvironmentOperationLogPanel",
      "Runtime Command Events",
    ]);
    assertIncludes(failures, devStageHandoff, [
      "ProfileStageHandoffStage",
      "ProfileStageHandoffDock",
      "TerasPanelStack",
      "EnvironmentOperationLogPanel",
      "Promote Check Events",
      "Run Promote Check",
    ]);
    assertIncludes(failures, devSupportDetails, [
      "TerasDialog",
      "TerasTrayStack",
      "Declared Support Details",
    ]);
    assertIncludes(failures, profileRequest, [
      "TerasWizardModal",
      "TerasWizardFooter",
      '"intent"',
      '"runtime"',
      '"review"',
      "ProfileRequestPersistenceDialog",
      "TerasDraftCloseGuardDialog",
      "operation.state !== \"succeeded\"",
    ]);
    assertIncludes(failures, releaseSurface, [
      "TerasRecordControlLayout",
      "TerasFilterBar",
      'mode="register-selected"',
      "GovernedReleaseSelectedProduct",
      "ProductReleaseDashboard",
      "ProductReleaseActionWorkflow",
      "ProductRuntimeLifecycleWorkflow",
    ]);
    assertIncludes(failures, releaseSelectedProduct, [
      "TerasSelectedPanel",
      'variant="rich"',
      "Open Product Dashboard",
    ]);
    assertIncludes(failures, releaseDashboard, [
      "TerasModalShell",
      "TerasPrimarySideLayout",
      "TerasSegmentedControl",
      "TerasSummaryCardGrid",
      "TerasTrayStack",
      "EnvironmentOperationPanel",
      "Open Workflow",
      "Change Lifecycle",
    ]);
    assertIncludes(failures, releaseWorkflow, [
      "TerasWizardModal",
      "TerasWizardFooter",
      "ProductReleaseActionDetailsStep",
      "ProductReleaseActionReviewStep",
      "TerasDraftCloseGuardDialog",
    ]);
    assertIncludes(failures, lifecycleWorkflow, [
      "TerasWizardModal",
      "TerasWizardFooter",
      "ProductRuntimeLifecycleIntentStep",
      "ProductRuntimeLifecycleReviewStep",
      "TerasDraftCloseGuardDialog",
    ]);
    assertIncludes(failures, operationPanel, [
      "TerasActivityLogDialog",
      "TerasTimeline",
      "latestOperation.state === \"failed\"",
      "Return to draft",
      "Retry",
    ]);
    assertIncludes(failures, operationLogPanel, [
      "TerasActivityLogPanel",
      "actionScope",
      "fullLog={",
      "environmentLifecycleOperationCanRetry",
      "Return to draft",
      "Retry",
    ]);
    assertIncludes(failures, runtimeController, [
      "useSyncExternalStore",
      "getEnvironmentLifecycleLocalRuntime",
      "submitProfileAction",
      "submitProductRelease",
      "submitProductRuntimeLifecycle",
    ]);

    assertIncludes(failures, shell, [
      '"dev-integration"',
      '"governed-releases"',
      "EnvironmentLifecycleWorkspace",
    ]);
    assertOmits(failures, shell, [
      "EnvironmentLifecyclePanel",
      "<EnvironmentLifecyclePanel",
    ]);

    for (const file of walkFiles(
      `${root}/presentation`,
      [".ts", ".tsx", ".css"],
    )) {
      const path = relativeAppPath(file);
      const source = readAppFile(path);

      if (path.endsWith(".css")) {
        failures.push(
          `${path}: Environment presentation must compose Teras without local CSS`,
        );
      }

      for (const specifier of importSpecifiers(source)) {
        if (specifier.includes("console-shell")) {
          failures.push(
            `${path}: dedicated Environment presentation must not import Console Shell primitives`,
          );
        }
        if (specifier.includes("domain-workspaces")) {
          failures.push(
            `${path}: Environment Lifecycle must not import an Operation Workbench domain`,
          );
        }
      }

      if (source.includes("fetch(") || source.includes('"/api/')) {
        failures.push(
          `${path}: Baseline Foundation must not call a live execution or authority endpoint`,
        );
      }
    }

    assertRepoIncludes(
      failures,
      "docs/product/surface-contracts/environment-lifecycle.md",
      [
        "dedicated full-viewport Teras",
        "There is no separate Home view.",
        "Baseline Foundation performs no real platform mutation.",
      ],
    );

    return failures;
  },
};

export default guard;
