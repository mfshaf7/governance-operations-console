import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "prototype/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/prototype/index.ts";

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
      "PrototypeWorkspace",
      "PrototypeWorkspaceProps",
      "getPrototypeOperationWorkbenchContract",
    ]);
    assertOmits(failures, indexPath, [
      "local-runtime/",
      "presentation/dashboards",
      "presentation/dialogs",
      "presentation/surface",
      "presentation/workflows",
      "work-model/",
      ".module.css",
      "PrototypeControlSurface",
      "getPrototypeWorkspaceReadModel",
    ]);

    return failures;
  },
};

export default guard;
