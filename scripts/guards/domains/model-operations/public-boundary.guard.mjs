import {
  assertAppFile,
  assertIncludes,
  assertOmits,
} from "../../guard-lib.mjs";

export const guard = {
  id: "model-operations/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/model-operations/index.ts";

    assertAppFile(failures, indexPath);
    assertIncludes(failures, indexPath, [
      "ModelOperationsWorkspace",
      "ModelOperationsWorkspaceProps",
      "getModelOperationsOperationWorkbenchContract",
    ]);
    assertOmits(failures, indexPath, [
      "modelOperationsReadModel",
      "read-model/",
      "presentation/surface",
      "presentation/dashboards",
      "presentation/dialogs",
      "work-model/",
      ".module.css",
    ]);

    return failures;
  },
};

export default guard;
