import {
  assertAppFile,
  assertOmits,
  assertOnlyAllowedSpecifiers,
} from "../../guard-lib.mjs";

export const guard = {
  id: "delivery/public-boundary",
  run() {
    const failures = [];
    const indexPath = "src/domain-workspaces/delivery/index.ts";

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
      "surfaces/",
      "workflows/",
      "local-workflow",
      "local-runtime",
      "product-adapters",
      ".module.css",
      "DeliveryPackageRegisterSurface",
      "DeliveryPackageWorkflowRouter",
      "DeliveryWorkDesignSurface",
      "DeliveryRefinementSurface",
      "DeliveryExecutionBoard",
    ]);

    return failures;
  },
};

export default guard;
