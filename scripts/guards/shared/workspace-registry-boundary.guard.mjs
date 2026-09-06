import {
  assertAppFile,
  assertIncludes,
  assertOmits,
} from "../guard-lib.mjs";

const browserRuntime =
  "src/workspace-registry/live-runtime/use-workspace-registry-live-runtime.ts";
const serverAdapter =
  "src/workspace-registry/server/workspace-registry-oos-client.ts";
const workspace =
  "src/workspace-registry/presentation/workspace-registry-workspace.tsx";
const workflow =
  "src/workspace-registry/presentation/workspace-registry-promotion-workflow.tsx";
const lifecycleWorkflow =
  "src/workspace-registry/presentation/workspace-registry-lifecycle-workflow.tsx";

export const guard = {
  id: "shared/workspace-registry-boundary",
  run() {
    const failures = [];

    for (const path of [
      browserRuntime,
      lifecycleWorkflow,
      serverAdapter,
      workspace,
      workflow,
    ]) {
      assertAppFile(failures, path);
    }
    assertIncludes(failures, serverAdapter, [
      "OOS_CALLER_SECRET",
      "sameWorkspaceInventoryPreparation",
      "sameWorkspaceInventoryLifecyclePreparation",
      '"x-oos-caller-secret"',
      '"/v1/workspace-inventory/registry"',
      '"/v1/workspace-inventory/lifecycle/requests"',
    ]);
    assertIncludes(failures, workspace, [
      "TerasFullscreenSurfaceFrame",
      "workspaceRegistryFixture",
      "consoleDevMode ? workspaceRegistryFixture : runtime.snapshot",
    ]);
    assertIncludes(failures, workflow, [
      "TerasWizardModal",
      'type PromotionStep = "apply" | "result" | "review"',
      "Apply Promotion",
    ]);
    assertIncludes(failures, lifecycleWorkflow, [
      "TerasWizardModal",
      'type LifecycleStep = "configure" | "result" | "review"',
      "Apply Lifecycle Action",
      "workspaceInventoryLifecycleActionOptions",
    ]);
    assertOmits(failures, browserRuntime, [
      "OOS_CALLER_SECRET",
      "x-oos-caller-secret",
      "api.github.com",
      "contracts/repos.yaml",
      "contracts/products.yaml",
      "contracts/components.yaml",
    ]);
    assertOmits(failures, workspace, ["api.github.com", "fetch("]);
    assertOmits(failures, lifecycleWorkflow, [
      "OOS_CALLER_SECRET",
      "x-oos-caller-secret",
      "api.github.com",
      "contracts/repos.yaml",
      "contracts/products.yaml",
      "contracts/components.yaml",
    ]);

    return failures;
  },
};

export default guard;
