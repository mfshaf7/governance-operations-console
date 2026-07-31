import {
  assertAppFile,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "repository/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/repository/index.ts";

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
    assertOmits(failures, indexPath, [
      "local-runtime/",
      "presentation/surface",
      ".module.css",
      "RepositoryControlSurface",
      "repositoryWorkspaceReadModel",
      "RepositoryWorkspaceRegisterTable",
    ]);

    return failures;
  },
};

export default guard;
