import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  importSpecifiers,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/orchestration";

export const guard = {
  id: "orchestration/projection-boundary",
  run() {
    const failures = [];
    const workspaceReadModel =
      `${root}/read-model/workspace/orchestration-workspace-read-model.ts`;
    const workspaceFixture =
      `${root}/read-model/workspace/orchestration-workspace.fixture.ts`;
    const effectiveProjection =
      `${root}/local-runtime/orchestration-effective-projection.ts`;
    const runtime =
      `${root}/local-runtime/orchestration-workspace-runtime.ts`;
    const runFixture =
      `${root}/read-model/runs/orchestration-runs.fixture.ts`;

    for (const path of [
      workspaceReadModel,
      workspaceFixture,
      effectiveProjection,
      runtime,
      runFixture,
      `${root}/read-model/definitions/orchestration-definitions.fixture.ts`,
      `${root}/local-runtime/definition-design/definition-receipt-store.ts`,
      `${root}/local-runtime/run-control/run-control-simulator.ts`,
      `${root}/local-runtime/run-control/run-control-receipt-store.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    assertIncludes(failures, workspaceReadModel, [
      "orchestrationWorkspaceFixture",
      "OrchestrationWorkspaceReadModel",
    ]);
    assertIncludes(failures, workspaceFixture, [
      "orchestrationScenarioCoverage",
      "orchestrationDefinitionRecords",
      "orchestrationRunRecords",
      'sourceMode: "synthetic-or-contract-derived"',
    ]);
    assertIncludes(failures, effectiveProjection, [
      "projectOrchestrationEffectiveWorkspaceReadModel",
      "orchestrationAttentionQueue",
      "orchestrationWorkspaceSummary",
    ]);
    assertIncludes(failures, runtime, [
      "getOrchestrationWorkspaceProjectionSnapshot",
      "subscribeOrchestrationWorkspaceProjection",
      "projectOrchestrationEffectiveWorkspaceReadModel",
    ]);
    assertIncludes(failures, runFixture, [
      'authority: "workspace-prototype-studio"',
      'mode: "synthetic-scenario"',
      "liveRuntimeClaimed: false",
    ]);
    assertOmits(failures, runFixture, ["liveRuntimeClaimed: true"]);

    for (const file of walkFiles(`${root}/presentation`, [".ts", ".tsx"])) {
      const path = relativeAppPath(file);
      for (const specifier of importSpecifiers(readAppFile(path))) {
        if (specifier.includes(".fixture")) {
          failures.push(
            `${path}: presentation must consume Orchestration read models instead of fixtures`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
