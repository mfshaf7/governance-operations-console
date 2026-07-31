import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "orchestration/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/orchestration/index.ts";

    assertAppFile(failures, indexPath);
    assertOnlyAllowedSpecifiers(
      failures,
      indexPath,
      "./read-model/",
      [
        "./read-model/activity-source",
        "./read-model/attention-source",
      ],
    );
    assertIncludes(failures, indexPath, [
      "OrchestrationWorkspace",
      "OrchestrationWorkspaceProps",
      "getOrchestrationOperationWorkbenchContract",
    ]);
    assertOmits(failures, indexPath, [
      "local-runtime/",
      "presentation/surfaces",
      "presentation/workflows",
      "work-model/",
      "orchestrationWorkspaceReadModel",
      "simulateOrchestrationRunControl",
      "recordOrchestrationQualification",
      "createOrchestrationDefinitionDesignDraft",
    ]);

    return failures;
  },
};

export default guard;
