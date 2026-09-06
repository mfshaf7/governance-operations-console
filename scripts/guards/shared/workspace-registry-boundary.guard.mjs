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

export const guard = {
  id: "shared/workspace-registry-boundary",
  run() {
    const failures = [];

    for (const path of [browserRuntime, serverAdapter, workspace, workflow]) {
      assertAppFile(failures, path);
    }
    assertIncludes(failures, serverAdapter, [
      "OOS_CALLER_SECRET",
      "sameWorkspaceInventoryPreparation",
      '"x-oos-caller-secret"',
      '"/v1/workspace-inventory/registry"',
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
    assertOmits(failures, browserRuntime, [
      "OOS_CALLER_SECRET",
      "x-oos-caller-secret",
      "api.github.com",
      "contracts/repos.yaml",
      "contracts/products.yaml",
      "contracts/components.yaml",
    ]);
    assertOmits(failures, workspace, ["api.github.com", "fetch("]);

    return failures;
  },
};

export default guard;
