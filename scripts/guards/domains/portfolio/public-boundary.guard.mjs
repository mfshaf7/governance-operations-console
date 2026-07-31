import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "portfolio/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/portfolio/index.ts";

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
      "PortfolioWorkspace",
      "getPortfolioOperationWorkbenchContract",
    ]);
    assertOmits(failures, indexPath, [
      "local-runtime/",
      "presentation/surface",
      "work-model/",
      ".module.css",
      "PortfolioControlSurface",
      "portfolioWorkspaceReadModel",
      "productPortfolioReadModel",
    ]);

    return failures;
  },
};

export default guard;
