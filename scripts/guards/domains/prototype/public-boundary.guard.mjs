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
    const serverIndexPath = "src/domain-workspaces/prototype/server/index.ts";

    assertAppFile(failures, indexPath);
    assertAppFile(failures, serverIndexPath);
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
    assertOnlyAllowedSpecifiers(
      failures,
      serverIndexPath,
      "./",
      ["./prototype-closure-api-routes"],
    );
    assertIncludes(failures, serverIndexPath, [
      "cancelPrototypeClosureRoute",
      "continuePrototypeClosureRoute",
      "decidePrototypeClosureRoute",
      "preparePrototypeClosureRoute",
      "readPrototypeClosureRoute",
      "submitPrototypeClosureRoute",
    ]);

    return failures;
  },
};

export default guard;
