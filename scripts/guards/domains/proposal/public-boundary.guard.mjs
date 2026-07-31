import {
  assertAppFile,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "proposal/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/proposal/index.ts";

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
      "capture/",
      "details/",
      "hub/",
      "local-runtime/",
      "presentation/capture",
      "presentation/details",
      "presentation/dialogs",
      "presentation/hub",
      "presentation/surface",
      "presentation/workflows",
      "work-model/",
      ".module.css",
      "ProposalControlSurface",
      "ProposalHubModal",
    ]);

    return failures;
  },
};

export default guard;
